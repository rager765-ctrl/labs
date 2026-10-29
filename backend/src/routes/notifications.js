import express from 'express';
import admin, { messaging, db, isFirebaseInitialized } from '../config/firebase.js';
import { addLog, getLogs, clearLogs } from '../services/loggerService.js';
import {
  isEmailConfigured,
  sendSessionAlertEmail,
  sendCorrectionDecisionEmail,
  sendCoordinatorAlertEmail,
  sendTestEmail,
} from '../services/emailService.js';
import {
  getNotificationConfig,
  updateNotificationConfig,
  shouldSendFcm,
  shouldSendEmail,
} from '../services/configService.js';
import { reconcilePushSubscriptions } from '../services/reconciliationService.js';

const router = express.Router();

/**
 * Middleware to check if Firebase Admin is ready
 */
function requireFirebase(req, res, next) {
  if (!isFirebaseInitialized || !messaging) {
    addLog('fail', 'Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_KEY in environment variables.');
    return res.status(503).json({
      success: false,
      error: 'Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_KEY in environment variables.',
    });
  }
  next();
}

/**
 * Helper to construct standard WebPush options with high urgency and OS banners
 * Uses deterministic tag so duplicate dispatches collapse into a single notification.
 */
function buildWebPushConfig(title, body, url = '/', customTag = null) {
  return {
    headers: {
      Urgency: 'high',
      TTL: '86400',
    },
    notification: {
      title,
      body,
      icon: '/icon-192.png',
      badge: '/badge.png',
      requireInteraction: true,
      tag: customTag || 'lab-alert',
      renotify: false,
    },
    fcmOptions: {
      link: url,
    },
  };
}

/**
 * Helper to prune unregistered or invalid tokens across Firestore
 */
async function pruneFailedTokens(tokens, responses, specificUid = null) {
  if (!db || !Array.isArray(tokens) || !Array.isArray(responses)) return;
  const badTokens = [];
  responses.forEach((resp, idx) => {
    if (!resp.success) {
      const code = resp.error?.code || '';
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        if (tokens[idx]) badTokens.push(tokens[idx]);
      }
    }
  });

  if (badTokens.length === 0) return;

  try {
    if (specificUid) {
      const userRef = db.collection('users').doc(specificUid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const data = userSnap.data();
        const devices = { ...(data.devices || {}) };
        for (const [k, d] of Object.entries(devices)) {
          if (badTokens.includes(d?.token)) {
            delete devices[k];
          }
        }
        await userRef.update({
          devices,
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens),
        });
      }
      addLog('info', `Pruned ${badTokens.length} dead token(s) for user ${specificUid}`);
    } else {
      for (const badToken of badTokens) {
        const snap = await db.collection('users').where('fcmTokens', 'array-contains', badToken).get();
        const batch = db.batch();
        snap.forEach(docSnap => {
          const d = docSnap.data();
          const devs = { ...(d.devices || {}) };
          for (const [k, dev] of Object.entries(devs)) {
            if (dev?.token === badToken) delete devs[k];
          }
          batch.update(docSnap.ref, {
            devices: devs,
            fcmTokens: admin.firestore.FieldValue.arrayRemove(badToken),
          });
        });
        await batch.commit();
      }
      addLog('info', `Pruned ${badTokens.length} dead token(s) across database`);
    }
  } catch (err) {
    console.warn('Error during token pruning:', err.message);
  }
}

const ANDROID_PUSH_CONFIG = {
  priority: 'high',
  ttl: 86400 * 1000,
  notification: {
    priority: 'high',
    defaultSound: true,
    defaultVibrateTimings: true,
    icon: '/icon-192.png',
  },
};

/**
 * GET /api/notifications/logs
 * Returns recent in-memory logs for FCM subscriptions, dispatches, successes, and errors
 */
router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  return res.json({
    success: true,
    totalLogs: getLogs(100).length,
    logs: getLogs(limit),
  });
});

/**
 * DELETE /api/notifications/logs
 * Clears in-memory log buffer
 */
router.delete('/logs', (req, res) => {
  clearLogs();
  return res.json({ success: true, message: 'FCM logs buffer cleared.' });
});

/**
 * GET /api/notifications/subscribers
 * Returns all active FCM subscribers registered in Firestore
 */
router.get('/subscribers', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ success: false, error: 'Firestore database is not connected.' });
    }

    const usersSnap = await db.collection('users').get();
    const subscribers = [];
    let totalDevices = 0;

    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      const tokens = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
      if (tokens.length > 0) {
        totalDevices += tokens.length;
        subscribers.push({
          uid: docSnap.id,
          name: data.name || 'Anonymous Attendee',
          email: data.email || 'No email',
          role: data.role || 'student',
          studentId: data.studentId || '',
          deviceCount: tokens.length,
          lastActiveAt: data.lastActiveAt || data.fcmSubscribedAt || null,
          notificationsEnabled: data.notificationsEnabled !== false,
        });
      }
    });

    addLog('info', `Subscribers queried: ${subscribers.length} user(s) with ${totalDevices} active device token(s).`);

    return res.json({
      success: true,
      totalSubscribers: subscribers.length,
      totalDevices,
      subscribers,
    });
  } catch (error) {
    console.error('Error fetching FCM subscribers:', error);
    addLog('fail', `Error fetching FCM subscribers: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/config
 * Retrieves admin configuration for delivery channels (FCM vs Email)
 */
router.get('/config', async (req, res) => {
  try {
    const config = await getNotificationConfig();
    return res.json({ success: true, config });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/config
 * Updates admin configuration for delivery channels (FCM vs Email)
 */
router.post('/config', async (req, res) => {
  try {
    const updates = req.body || {};
    const config = await updateNotificationConfig(updates);
    addLog('info', `Notification channel config updated: mode="${config.channel}" (FCM: ${config.fcmEnabled}, Email: ${config.emailEnabled})`);
    return res.json({ success: true, config });
  } catch (error) {
    addLog('fail', `Failed updating notification config: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/test-email
 * Sends a test email to verify Resend configuration
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Recipient email is required.' });
    }
    const result = await sendTestEmail(email);
    return res.json({ success: true, message: `Test email sent to ${email}`, messageId: result.messageId });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/register-token
 * Saves an FCM device token for a student or coordinator in Firestore,
 * keeping a clean per-device dictionary so multi-device logins are supported
 * without accumulating duplicate tokens on the same device.
 */
router.post('/register-token', requireFirebase, async (req, res) => {
  try {
    const { uid, token, deviceId, deviceName = 'Web Browser', role } = req.body;

    if (!uid || !token) {
      addLog('fail', 'Token registration rejected: missing uid or token in body.');
      return res.status(400).json({
        success: false,
        error: 'Both "uid" and "token" are required.',
      });
    }

    const devKey = (deviceId && typeof deviceId === 'string' && deviceId.trim())
      ? deviceId.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'device_' + token.slice(-12).replace(/[^a-zA-Z0-9_-]/g, '_');

    let finalRole = role || 'student';

    if (db) {
      // 1. Disassociate this token from any OTHER user doc so accounts do not share tokens
      try {
        const existingUsersSnap = await db.collection('users').where('fcmTokens', 'array-contains', token).get();
        if (!existingUsersSnap.empty) {
          const cleanBatch = db.batch();
          let cleanedOtherUsers = 0;
          existingUsersSnap.forEach(docSnap => {
            if (docSnap.id !== uid) {
              const otherData = docSnap.data();
              const otherDevices = { ...(otherData.devices || {}) };
              for (const [dk, dev] of Object.entries(otherDevices)) {
                if (dev?.token === token) delete otherDevices[dk];
              }
              cleanBatch.update(docSnap.ref, {
                devices: otherDevices,
                fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
              });
              cleanedOtherUsers++;
            }
          });
          if (cleanedOtherUsers > 0) {
            await cleanBatch.commit();
            addLog('info', `Disassociated token from ${cleanedOtherUsers} previous account(s).`);
          }
        }
      } catch (cleanErr) {
        console.warn('Could not disassociate token from other accounts:', cleanErr.message);
      }

      // 2. Fetch current user document to manage per-device tokens and preserve role
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      const existingData = userSnap.exists ? userSnap.data() : {};
      const existingDevices = { ...(existingData.devices || {}) };

      // Determine final role: NEVER demote a coordinator to student if role was not explicitly sent
      finalRole = (role && (role === 'coordinator' || role === 'student'))
        ? role
        : (existingData.role || 'student');

      // Remove any prior entry using this token under another key
      for (const [k, d] of Object.entries(existingDevices)) {
        if (d?.token === token && k !== devKey) {
          delete existingDevices[k];
        }
      }

      existingDevices[devKey] = {
        token,
        deviceName: deviceName || 'Web Browser',
        updatedAt: new Date().toISOString(),
      };

      // Deduplicate tokens from all registered active devices
      const distinctTokens = Array.from(new Set(
        Object.values(existingDevices)
          .map(d => d?.token)
          .filter(t => typeof t === 'string' && t.length > 10)
      ));

      await userRef.set(
        {
          devices: existingDevices,
          fcmTokens: distinctTokens,
          role: finalRole,
          notificationsEnabled: true,
          lastActiveAt: new Date().toISOString(),
          lastDevice: deviceName,
        },
        { merge: true }
      );
    }

    // Subscribe to topics according to final role
    if (messaging && token) {
      try {
        if (finalRole === 'coordinator') {
          await messaging.subscribeToTopic([token], 'coordinators');
          await messaging.unsubscribeFromTopic([token], 'all-students').catch(() => {});
          addLog('subscribe', `Subscribed token to topic 'coordinators' for UID: ${uid}`);
        } else {
          await messaging.subscribeToTopic([token], 'all-students');
          await messaging.unsubscribeFromTopic([token], 'coordinators').catch(() => {});
          addLog('subscribe', `Subscribed token to topic 'all-students' for UID: ${uid}`);
        }
      } catch (topicErr) {
        console.warn('Could not subscribe token to topic:', topicErr.message);
      }
    }

    addLog('subscribe', `${finalRole === 'coordinator' ? 'Coordinator' : 'User'} registered push token (UID: ${uid}, Device: "${deviceName}", DeviceId: "${devKey}")`, {
      uid,
      role: finalRole,
      deviceName,
      deviceId: devKey,
      tokenPreview: `${token.slice(0, 16)}...`,
    });

    return res.json({
      success: true,
      message: 'Push token registered successfully.',
      role: finalRole,
    });
  } catch (error) {
    addLog('fail', `Error registering FCM token: ${error.message}`, { error: error.message, uid: req.body?.uid });
    console.error('Error registering FCM token:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register token',
    });
  }
});

/**
 * POST /api/notifications/coordinator-alert
 * Dispatches an alert to coordinators when attendees check in, check out, or submit issues
 */
router.post('/coordinator-alert', async (req, res) => {
  try {
    const {
      type, // 'checkin' | 'checkout' | 'correction_submitted' | 'issue_resolved'
      studentName,
      studentId,
      sessionTitle,
      sessionId,
      status,
      reason,
    } = req.body;

    const sendFcm = await shouldSendFcm('checkInAlerts');
    const sendEmail = await shouldSendEmail('checkInAlerts');

    let title = 'Innovations Lab Alert';
    let body = 'New attendance event recorded.';
    let url = sessionId ? `/coordinator/sessions/${sessionId}` : '/coordinator';

    if (type === 'checkin') {
      title = `🟢 Attendee Checked In: ${studentName || 'Student'}`;
      body = `${studentName || 'Attendee'} checked in as ${status?.toUpperCase() || 'PRESENT'} for "${sessionTitle || 'Session'}".`;
    } else if (type === 'checkout') {
      title = `🔵 Attendee Checked Out: ${studentName || 'Student'}`;
      body = `${studentName || 'Attendee'} checked out of "${sessionTitle || 'Session'}".`;
    } else if (type === 'correction_submitted') {
      title = `⚖️ New Issue Request: ${studentName || 'Student'}`;
      body = `${studentName || 'Attendee'} submitted an attendance correction request for "${sessionTitle || 'Session'}".`;
      url = '/coordinator';
    } else if (type === 'issue_resolved') {
      title = `✅ Issue Resolved: ${sessionTitle || 'Session'}`;
      body = `Attendance issue for ${studentName || 'attendee'} was resolved (${status?.toUpperCase() || 'RESOLVED'}).`;
    }

    addLog('dispatch', `Coordinator alert dispatched: "${title}" (Event: ${type}, FCM: ${sendFcm}, Email: ${sendEmail})`, {
      type,
      studentName,
      sessionTitle,
      sendFcm,
      sendEmail,
    });

    const deliveryResults = { fcm: null, email: null };

    // Find all coordinators with registered FCM tokens and emails
    const coordTokens = [];
    const coordEmails = [];

    if (db) {
      try {
        const coordSnap = await db.collection('users').where('role', '==', 'coordinator').get();
        coordSnap.forEach(docSnap => {
          const d = docSnap.data();
          if (Array.isArray(d.fcmTokens) && d.notificationsEnabled !== false) {
            coordTokens.push(...d.fcmTokens);
          }
          if (d.email) {
            coordEmails.push(d.email);
          }
        });
      } catch (err) {
        console.warn('Error querying coordinators from Firestore:', err);
      }
    }

    // 1. Send Email if enabled
    if (sendEmail && coordEmails.length > 0) {
      try {
        deliveryResults.email = await sendCoordinatorAlertEmail({
          recipients: coordEmails,
          type,
          studentName,
          sessionTitle,
          status,
        });
      } catch (emailErr) {
        console.error('Error dispatching coordinator email alert:', emailErr);
        deliveryResults.email = { success: false, error: emailErr.message };
      }
    }

    // 2. Send FCM if enabled
    if (sendFcm && messaging) {
      const tag = sessionId ? (`coord-${type || 'alert'}-${sessionId}`) : (`coord-${type || 'alert'}`);
      if (coordTokens.length > 0) {
        const uniqueCoords = Array.from(new Set(coordTokens));
        const response = await messaging.sendEachForMulticast({
          tokens: uniqueCoords,
          notification: { title, body },
          data: { type: type || 'coordinator_alert', sessionId: sessionId || '', url },
          webpush: buildWebPushConfig(title, body, url, tag),
          android: ANDROID_PUSH_CONFIG,
        });

        deliveryResults.fcm = {
          success: response.successCount > 0,
          delivered: response.successCount,
          failed: response.failureCount,
        };

        if (response.successCount > 0) {
          addLog('success', `Delivered coordinator alert to ${response.successCount} coordinator device(s).`, {
            type,
            successCount: response.successCount,
          });
        }

        if (response.failureCount > 0) {
          addLog('fail', `Failed to deliver coordinator alert to ${response.failureCount} coordinator device(s).`, {
            type,
            failureCount: response.failureCount,
          });
          await pruneFailedTokens(uniqueCoords, response.responses);
        }
      } else {
        // Fallback: Send to 'coordinators' topic
        try {
          const topic = 'coordinators';
          const response = await messaging.send({
            topic,
            notification: { title, body },
            data: { type: type || 'coordinator_alert', sessionId: sessionId || '', url },
            webpush: buildWebPushConfig(title, body, url, tag),
            android: ANDROID_PUSH_CONFIG,
          });
          deliveryResults.fcm = { success: true, mode: 'topic_coordinators', messageId: response };
          addLog('success', `Delivered coordinator alert via topic "${topic}". MessageId: ${response}`);
        } catch (topicErr) {
          deliveryResults.fcm = { success: false, error: topicErr.message };
        }
      }
    }

    return res.json({
      success: true,
      channels: { sendFcm, sendEmail },
      results: deliveryResults,
    });
  } catch (error) {
    addLog('fail', `Error dispatching coordinator alert: ${error.message}`);
    console.error('Error dispatching coordinator alert:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/unsubscribe-token
 * Removes an FCM device token from a user's profile while preserving other active devices
 */
router.post('/unsubscribe-token', async (req, res) => {
  try {
    const { uid, token, deviceId } = req.body;

    if (!uid || !token) {
      return res.status(400).json({ success: false, error: 'Both "uid" and "token" are required.' });
    }

    if (db) {
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        const devices = { ...(userData.devices || {}) };

        if (deviceId && devices[deviceId]) {
          delete devices[deviceId];
        } else {
          for (const [k, d] of Object.entries(devices)) {
            if (d?.token === token) delete devices[k];
          }
        }

        const remainingTokens = Array.from(new Set(
          Object.values(devices)
            .map(d => d?.token)
            .filter(t => t && t !== token)
        ));

        const updates = {
          devices,
          fcmTokens: remainingTokens,
        };

        // Only disable notifications if 0 devices remain for this user
        if (remainingTokens.length === 0) {
          updates.notificationsEnabled = false;
        }

        await userRef.update(updates);
      }
    }

    if (messaging) {
      try {
        await messaging.unsubscribeFromTopic([token], 'all-students');
        await messaging.unsubscribeFromTopic([token], 'coordinators');
      } catch {}
    }

    addLog('unsubscribe', `User unsubscribed FCM token (UID: ${uid})`, {
      uid,
      tokenPreview: `${token.slice(0, 16)}...`,
    });

    return res.json({ success: true, message: 'FCM token unsubscribed successfully.' });
  } catch (error) {
    addLog('fail', `Error unsubscribing FCM token: ${error.message}`, { uid: req.body?.uid });
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/send-to-token
 * Sends a push notification to a specific device FCM token
 */
router.post('/send-to-token', requireFirebase, async (req, res) => {
  try {
    const { token, title, body, data = {}, url = '/' } = req.body;

    if (!token || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Fields "token", "title", and "body" are required.',
      });
    }

    addLog('dispatch', `Direct push to token: "${title}"`, {
      title,
      body,
      tokenPreview: `${token.slice(0, 16)}...`,
      url,
    });

    const directTag = data.tag || 'direct-alert';
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: url,
        timestamp: new Date().toISOString(),
      },
      webpush: buildWebPushConfig(title, body, url, directTag),
      android: ANDROID_PUSH_CONFIG,
    };

    const response = await messaging.send(message);

    addLog('success', `Direct push sent to token successfully. MessageId: ${response}`, {
      messageId: response,
      tokenPreview: `${token.slice(0, 16)}...`,
    });

    return res.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    addLog('fail', `Direct push to token failed: ${error.message} (Code: ${error.code || 'UNKNOWN'})`, {
      error: error.message,
      code: error.code,
      tokenPreview: req.body?.token ? `${req.body.token.slice(0, 16)}...` : 'none',
    });
    console.error('Error sending push notification to token:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification',
    });
  }
});

/**
 * POST /api/notifications/send-to-user
 * Sends a push notification to all registered tokens of a user (student or coordinator)
 */
router.post('/send-to-user', requireFirebase, async (req, res) => {
  try {
    const { uid, title, body, data = {}, url = '/' } = req.body;

    if (!uid || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Fields "uid", "title", and "body" are required.',
      });
    }

    if (!db) {
      return res.status(500).json({ success: false, error: 'Firestore database instance not ready.' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      addLog('fail', `Send to user failed: UID "${uid}" not found in Firestore.`, { uid });
      return res.status(404).json({ success: false, error: `User ${uid} not found.` });
    }

    const userData = userDoc.data();
    const rawTokens = userData.fcmTokens || [];
    const tokens = Array.from(new Set(Array.isArray(rawTokens) ? rawTokens.filter(Boolean) : []));

    if (tokens.length === 0) {
      addLog('info', `Send to user: UID "${uid}" has 0 active FCM tokens.`, { uid });
      return res.status(200).json({
        success: false,
        message: 'User has no registered FCM tokens.',
        sentCount: 0,
      });
    }

    addLog('dispatch', `Sending push to user ${uid} (${tokens.length} registered device(s)): "${title}"`, {
      uid,
      tokenCount: tokens.length,
      title,
    });

    const userTag = data.tag || ('user-alert-' + uid);
    const multicastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: url,
      },
      webpush: buildWebPushConfig(title, body, url, userTag),
      android: ANDROID_PUSH_CONFIG,
    };

    const response = await messaging.sendEachForMulticast(multicastMessage);

    if (response.successCount > 0) {
      addLog('success', `Delivered push to ${response.successCount} token(s) for user ${uid}.`, {
        uid,
        delivered: response.successCount,
      });
    }

    // Clean up expired or invalid tokens and log exact failure reasons
    if (response.failureCount > 0) {
      const failDetails = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code || 'UNKNOWN';
          const errMsg = resp.error?.message || 'Push delivery failed';
          const tokPreview = `${tokens[idx]?.slice(0, 16)}...`;
          failDetails.push({ tokenPreview: tokPreview, code: errCode, message: errMsg });
        }
      });

      addLog('fail', `Push notification failed for ${response.failureCount} device(s) of user ${uid}!`, {
        uid,
        failureCount: response.failureCount,
        failures: failDetails,
      });

      await pruneFailedTokens(tokens, response.responses, uid);
    }

    return res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    addLog('fail', `Error sending push notification to user ${req.body?.uid}: ${error.message}`, {
      error: error.message,
      code: error.code,
    });
    console.error('Error sending push notification to user:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification to user',
    });
  }
});

/**
 * POST /api/notifications/session-alert
 * Dispatches an alert when a session goes live or is scheduled (via FCM and/or Resend Email)
 */
router.post('/session-alert', async (req, res) => {
  try {
    const {
      sessionId,
      sessionTitle,
      room,
      coordinatorName,
      eligibleStudentIds = [],
      alertType = 'session_live',
    } = req.body;

    if (!sessionId || !sessionTitle) {
      return res.status(400).json({
        success: false,
        error: 'Fields "sessionId" and "sessionTitle" are required.',
      });
    }

    const eventKey = alertType === 'session_live' ? 'sessionLive' : 'sessionScheduled';
    const sendFcm = await shouldSendFcm(eventKey);
    const sendEmail = await shouldSendEmail(eventKey);

    const title = alertType === 'session_live' ? `🔴 Live Session: ${sessionTitle}` : `📅 Scheduled Session: ${sessionTitle}`;
    const body = alertType === 'session_live'
      ? `Check-in is now open at ${room || 'the lab'}. Tap to scan or verify your attendance.`
      : `Session scheduled at ${room || 'the lab'}${coordinatorName ? ` with ${coordinatorName}` : ''}.`;

    const targetUrl = `/student/sessions/${sessionId}`;

    addLog('dispatch', `Session alert initiated: "${title}" (Mode: ${alertType}, FCM: ${sendFcm}, Email: ${sendEmail})`, {
      sessionId,
      sessionTitle,
      alertType,
      room,
      sendFcm,
      sendEmail,
    });

    const deliveryResults = { fcm: null, email: null };

    // Gather recipients from Firestore if available
    let tokenList = [];
    let emailList = [];

    if (db) {
      try {
        if (Array.isArray(eligibleStudentIds) && eligibleStudentIds.length > 0) {
          // 1. Check doc ID match
          const userDocs = await Promise.all(
            eligibleStudentIds.slice(0, 50).map(id => db.collection('users').doc(id).get())
          );
          userDocs.forEach(docSnap => {
            if (docSnap.exists) {
              const data = docSnap.data();
              if (Array.isArray(data.fcmTokens) && data.notificationsEnabled !== false) {
                tokenList.push(...data.fcmTokens);
              }
              if (data.email) {
                emailList.push(data.email);
              }
            }
          });

          // 2. Also check studentId field match
          for (const sid of eligibleStudentIds.slice(0, 50)) {
            const byStudentIdSnap = await db.collection('users').where('studentId', '==', sid).get();
            byStudentIdSnap.forEach(d => {
              const data = d.data();
              if (Array.isArray(data.fcmTokens) && data.notificationsEnabled !== false) {
                tokenList.push(...data.fcmTokens);
              }
              if (data.email) emailList.push(data.email);
            });
          }
        }

        // 3. Fallback: If tokenList is empty, gather ALL registered student tokens in Firestore
        if (tokenList.length === 0) {
          const allStudentsSnap = await db.collection('users').where('role', '==', 'student').get();
          allStudentsSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (Array.isArray(data.fcmTokens) && data.notificationsEnabled !== false) {
              tokenList.push(...data.fcmTokens);
            }
            if (data.email && (!emailList.length || emailList.length < 50)) {
              emailList.push(data.email);
            }
          });
        }
      } catch (dbErr) {
        console.warn('Could not query users from Firestore for session alert:', dbErr.message);
      }
    }

    // 1. Dispatch Email via Resend if enabled
    if (sendEmail && emailList.length > 0) {
      try {
        deliveryResults.email = await sendSessionAlertEmail({
          recipients: emailList,
          sessionTitle,
          room,
          coordinatorName,
          alertType,
        });
      } catch (emailErr) {
        console.error('Error sending session alert email:', emailErr);
        deliveryResults.email = { success: false, error: emailErr.message };
      }
    }

    // 2. Dispatch FCM Push if enabled
    if (sendFcm && messaging) {
      const sessionTag = 'session-' + sessionId;
      const uniqueTokens = Array.from(new Set(tokenList));

      if (uniqueTokens.length > 0) {
        try {
          const response = await messaging.sendEachForMulticast({
            tokens: uniqueTokens,
            notification: { title, body },
            data: { sessionId, targetUrl },
            webpush: buildWebPushConfig(title, body, targetUrl, sessionTag),
            android: ANDROID_PUSH_CONFIG,
          });

          deliveryResults.fcm = {
            success: response.successCount > 0,
            delivered: response.successCount,
            failed: response.failureCount,
          };

          if (response.successCount > 0) {
            addLog('success', `Delivered session alert to ${response.successCount} subscriber device(s).`, {
              sessionId,
              successCount: response.successCount,
            });
          }

          if (response.failureCount > 0) {
            addLog('fail', `Session alert multicast failed for ${response.failureCount} device(s).`, {
              sessionId,
              failureCount: response.failureCount,
            });
            await pruneFailedTokens(uniqueTokens, response.responses);
          }
        } catch (fcmErr) {
          deliveryResults.fcm = { success: false, error: fcmErr.message };
        }
      }

      // Also broadcast to 'all-students' topic as guaranteed delivery channel
      try {
        const topicResponse = await messaging.send({
          topic: 'all-students',
          notification: { title, body },
          data: { sessionId, targetUrl },
          webpush: buildWebPushConfig(title, body, targetUrl, sessionTag),
          android: ANDROID_PUSH_CONFIG,
        });
        if (!deliveryResults.fcm) {
          deliveryResults.fcm = { success: true, mode: 'topic', messageId: topicResponse };
        }
      } catch (topicErr) {
        console.warn('Topic broadcast failed or skipped:', topicErr.message);
      }
    }

    return res.json({
      success: true,
      channels: { sendFcm, sendEmail },
      results: deliveryResults,
    });
  } catch (error) {
    addLog('fail', `Session alert dispatch failed with error: ${error.message}`, {
      sessionId: req.body?.sessionId,
      error: error.message,
    });
    console.error('Error dispatching session alert:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch session alert',
    });
  }
});

/**
 * POST /api/notifications/correction-alert
 * Dispatches an alert when a coordinator approves, rejects, or resolves an attendance correction
 */
router.post('/correction-alert', async (req, res) => {
  try {
    const { studentId, sessionTitle, status, decisionReason } = req.body;

    if (!studentId || !sessionTitle || !status) {
      return res.status(400).json({
        success: false,
        error: 'Fields "studentId", "sessionTitle", and "status" are required.',
      });
    }

    const sendFcm = await shouldSendFcm('correctionDecisions');
    const sendEmail = await shouldSendEmail('correctionDecisions');

    const title = `Correction ${status === 'approved' ? 'Approved ✅' : status === 'resolved' ? 'Resolved ✅' : 'Rejected ❌'}`;
    const body = `Your attendance correction for "${sessionTitle}" was ${status}.${decisionReason ? ` Note: ${decisionReason}` : ''}`;

    addLog('dispatch', `Correction alert initiated for student ${studentId}: "${title}" (FCM: ${sendFcm}, Email: ${sendEmail})`, {
      studentId,
      sessionTitle,
      status,
      decisionReason,
      sendFcm,
      sendEmail,
    });

    const deliveryResults = { fcm: null, email: null };

    let tokens = [];
    let studentEmail = null;
    let studentName = null;

    if (db) {
      try {
        const userDoc = await db.collection('users').doc(studentId).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          tokens = data?.fcmTokens || [];
          studentEmail = data?.email || null;
          studentName = data?.name || data?.displayName || null;
        } else {
          // Query by studentId or id
          const querySnap = await db.collection('users').where('studentId', '==', studentId).get();
          if (!querySnap.empty) {
            const data = querySnap.docs[0].data();
            tokens = data?.fcmTokens || [];
            studentEmail = data?.email || null;
            studentName = data?.name || data?.displayName || null;
          } else {
            const queryIdSnap = await db.collection('users').where('id', '==', studentId).get();
            if (!queryIdSnap.empty) {
              const data = queryIdSnap.docs[0].data();
              tokens = data?.fcmTokens || [];
              studentEmail = data?.email || null;
              studentName = data?.name || data?.displayName || null;
            }
          }
        }
      } catch (err) {
        console.warn('Error reading student profile for correction alert:', err.message);
      }
    }

    // 1. Dispatch Email via Resend if enabled
    if (sendEmail && studentEmail) {
      try {
        deliveryResults.email = await sendCorrectionDecisionEmail({
          to: studentEmail,
          studentName,
          sessionTitle,
          status,
          decisionReason,
        });
      } catch (emailErr) {
        console.error('Error dispatching correction decision email:', emailErr);
        deliveryResults.email = { success: false, error: emailErr.message };
      }
    }

    // 2. Dispatch FCM Push if enabled
    if (sendFcm && messaging) {
      if (!tokens.length) {
        addLog('info', `Correction alert: Student "${studentId}" has no registered FCM tokens.`, { studentId });
        deliveryResults.fcm = { success: false, message: 'Student has no active FCM tokens.', sentCount: 0 };
      } else {
        const uniqueTokens = Array.from(new Set(tokens));
        const response = await messaging.sendEachForMulticast({
          tokens: uniqueTokens,
          notification: { title, body },
          data: { type: 'correction_update', status },
          webpush: buildWebPushConfig(title, body, '/student/history', 'correction-' + studentId),
          android: ANDROID_PUSH_CONFIG,
        });

        deliveryResults.fcm = {
          success: response.successCount > 0,
          delivered: response.successCount,
          failed: response.failureCount,
        };

        if (response.successCount > 0) {
          addLog('success', `Delivered correction alert to ${response.successCount} device(s) for student ${studentId}.`, {
            studentId,
            status,
            delivered: response.successCount,
          });
        }

        if (response.failureCount > 0) {
          const failures = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failures.push({
                tokenPreview: `${uniqueTokens[idx]?.slice(0, 16)}...`,
                code: resp.error?.code,
                message: resp.error?.message,
              });
            }
          });
          addLog('fail', `Failed to deliver correction alert to ${response.failureCount} device(s) for student ${studentId}!`, {
            studentId,
            failureCount: response.failureCount,
            failures,
          });
          await pruneFailedTokens(uniqueTokens, response.responses, studentId);
        }
      }
    }

    return res.json({
      success: true,
      channels: { sendFcm, sendEmail },
      results: deliveryResults,
    });
  } catch (error) {
    addLog('fail', `Correction alert dispatch error: ${error.message}`, {
      studentId: req.body?.studentId,
      error: error.message,
      code: error.code,
    });
    console.error('Error dispatching correction alert:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch correction alert',
    });
  }
});

/**
 * POST /api/notifications/subscribe-topic
 * Subscribes token(s) to a topic
 */
router.post('/subscribe-topic', requireFirebase, async (req, res) => {
  try {
    const { tokens, topic } = req.body;
    if (!tokens || !topic) {
      return res.status(400).json({ success: false, error: 'Both "tokens" and "topic" are required.' });
    }

    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    const response = await messaging.subscribeToTopic(tokenArray, topic);

    addLog('subscribe', `Subscribed ${tokenArray.length} token(s) to topic "${topic}". Success: ${response.successCount}, Fail: ${response.failureCount}`);

    return res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    addLog('fail', `Topic subscription error for topic "${req.body?.topic}": ${error.message}`);
    console.error('Error subscribing to topic:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/unsubscribe-topic
 * Unsubscribes token(s) from a topic
 */
router.post('/unsubscribe-topic', requireFirebase, async (req, res) => {
  try {
    const { tokens, topic } = req.body;
    if (!tokens || !topic) {
      return res.status(400).json({ success: false, error: 'Both "tokens" and "topic" are required.' });
    }

    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    const response = await messaging.unsubscribeFromTopic(tokenArray, topic);

    addLog('unsubscribe', `Unsubscribed ${tokenArray.length} token(s) from topic "${topic}".`);

    return res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    addLog('fail', `Topic unsubscription error: ${error.message}`);
    console.error('Error unsubscribing from topic:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/cleanup-duplicates
 * Cleans up duplicated and stale FCM tokens across all user profiles in Firestore
 */
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ success: false, error: 'Firestore database not connected' });
    }

    const usersSnap = await db.collection('users').get();
    let cleanedUsersCount = 0;
    let prunedTokensCount = 0;

    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data();
      const rawTokens = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
      const devices = data.devices || {};

      let validTokens = Array.from(new Set(rawTokens.filter(t => typeof t === 'string' && t.length > 10)));

      // If user has devices registered, fcmTokens should reflect exactly those active devices
      const deviceKeys = Object.keys(devices);
      if (deviceKeys.length > 0) {
        const deviceTokens = Array.from(new Set(
          Object.values(devices).map(d => d?.token).filter(t => typeof t === 'string' && t.length > 10)
        ));
        if (deviceTokens.length > 0) {
          validTokens = deviceTokens;
        }
      } else if (validTokens.length > 1) {
        // Legacy user with unmapped multiple tokens: keep only the latest active token
        validTokens = validTokens.slice(-1);
      }

      if (rawTokens.length !== validTokens.length) {
        prunedTokensCount += (rawTokens.length - validTokens.length);
        cleanedUsersCount++;

        await docSnap.ref.update({
          fcmTokens: validTokens,
        });
      }
    }

    addLog('info', `Cleanup completed: Deduplicated ${prunedTokensCount} duplicate token(s) across ${cleanedUsersCount} user(s).`);

    return res.json({
      success: true,
      message: `Cleaned up ${prunedTokensCount} duplicate tokens across ${cleanedUsersCount} users.`,
      cleanedUsersCount,
      prunedTokensCount,
    });
  } catch (error) {
    addLog('fail', `Token cleanup error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/set-role
 * Administrative endpoint to update or restore a user role in Firestore
 */
router.post('/set-role', async (req, res) => {
  try {
    const { uid, role } = req.body;
    if (!uid || !role) {
      return res.status(400).json({ success: false, error: 'Both "uid" and "role" are required.' });
    }
    if (db) {
      await db.collection('users').doc(uid).set({ role }, { merge: true });
      addLog('info', `User role updated: UID "${uid}" set to "${role}".`);
    }
    return res.json({ success: true, uid, role });
  } catch (error) {
    addLog('fail', `Failed to set user role: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/notifications/reconcile
 * Trigger server auto-reconciliation of all tokens and topics from Firestore
 */
router.post('/reconcile', async (req, res) => {
  try {
    const result = await reconcilePushSubscriptions();
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
