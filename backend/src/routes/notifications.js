import express from 'express';
import admin, { messaging, db, isFirebaseInitialized } from '../config/firebase.js';
import { addLog, getLogs, clearLogs } from '../services/loggerService.js';

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
 * POST /api/notifications/register-token
 * Saves an FCM device token for a student or coordinator in Firestore and subscribes to topic
 */
router.post('/register-token', requireFirebase, async (req, res) => {
  try {
    const { uid, token, deviceName = 'Web Browser' } = req.body;

    if (!uid || !token) {
      addLog('fail', 'Token registration rejected: missing uid or token in body.');
      return res.status(400).json({
        success: false,
        error: 'Both "uid" and "token" are required.',
      });
    }

    if (db) {
      const userRef = db.collection('users').doc(uid);
      await userRef.set(
        {
          fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
          notificationsEnabled: true,
          lastActiveAt: new Date().toISOString(),
          lastDevice: deviceName,
        },
        { merge: true }
      );
    }

    // Subscribe to broadcast topic 'all-students'
    if (messaging && token) {
      try {
        await messaging.subscribeToTopic([token], 'all-students');
      } catch (topicErr) {
        console.warn('Could not subscribe token to all-students topic:', topicErr.message);
      }
    }

    addLog('subscribe', `User registered FCM token (UID: ${uid}, Device: "${deviceName}")`, {
      uid,
      deviceName,
      tokenPreview: `${token.slice(0, 16)}...`,
    });

    return res.json({
      success: true,
      message: 'FCM token registered successfully.',
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
 * POST /api/notifications/unsubscribe-token
 * Removes an FCM device token from a user's profile
 */
router.post('/unsubscribe-token', async (req, res) => {
  try {
    const { uid, token } = req.body;

    if (!uid || !token) {
      return res.status(400).json({ success: false, error: 'Both "uid" and "token" are required.' });
    }

    if (db) {
      const userRef = db.collection('users').doc(uid);
      await userRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
      });
    }

    if (messaging) {
      try {
        await messaging.unsubscribeFromTopic([token], 'all-students');
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
      webpush: {
        fcmOptions: {
          link: url,
        },
        notification: {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        },
      },
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
    const tokens = userData.fcmTokens || [];

    if (!Array.isArray(tokens) || tokens.length === 0) {
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
      webpush: {
        fcmOptions: {
          link: url,
        },
      },
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
      const failedTokens = [];
      const failDetails = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code || 'UNKNOWN';
          const errMsg = resp.error?.message || 'Push delivery failed';
          const tokPreview = `${tokens[idx]?.slice(0, 16)}...`;

          failDetails.push({ tokenPreview: tokPreview, code: errCode, message: errMsg });

          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      addLog('fail', `Push notification failed for ${response.failureCount} device(s) of user ${uid}!`, {
        uid,
        failureCount: response.failureCount,
        failures: failDetails,
      });

      if (failedTokens.length > 0) {
        await db.collection('users').doc(uid).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens),
        });
        addLog('info', `Pruned ${failedTokens.length} expired/invalid FCM token(s) for user ${uid}.`);
      }
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
 * Dispatches an alert when a session goes live or is scheduled
 */
router.post('/session-alert', requireFirebase, async (req, res) => {
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

    const title = alertType === 'session_live' ? `🔴 Live Session: ${sessionTitle}` : `📅 Scheduled Session: ${sessionTitle}`;
    const body = alertType === 'session_live'
      ? `Check-in is now open at ${room || 'the lab'}. Tap to scan or verify your attendance.`
      : `Session scheduled at ${room || 'the lab'}${coordinatorName ? ` with ${coordinatorName}` : ''}.`;

    const targetUrl = `/student/sessions/${sessionId}`;

    addLog('dispatch', `Session push alert initiated: "${title}" (Mode: ${alertType})`, {
      sessionId,
      sessionTitle,
      alertType,
      room,
    });

    // 1. If specific eligible student IDs provided, look up their tokens
    if (Array.isArray(eligibleStudentIds) && eligibleStudentIds.length > 0 && db) {
      const tokenList = [];
      const userDocs = await Promise.all(
        eligibleStudentIds.slice(0, 100).map(id => db.collection('users').doc(id).get())
      );

      userDocs.forEach(docSnap => {
        if (docSnap.exists) {
          const data = docSnap.data();
          if (Array.isArray(data.fcmTokens) && data.notificationsEnabled !== false) {
            tokenList.push(...data.fcmTokens);
          }
        }
      });

      if (tokenList.length > 0) {
        const uniqueTokens = Array.from(new Set(tokenList));
        const response = await messaging.sendEachForMulticast({
          tokens: uniqueTokens,
          notification: { title, body },
          data: { sessionId, targetUrl },
          webpush: { fcmOptions: { link: targetUrl } },
        });

        if (response.successCount > 0) {
          addLog('success', `Delivered session alert to ${response.successCount} eligible attendee(s).`, {
            sessionId,
            successCount: response.successCount,
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
          addLog('fail', `Session alert failed for ${response.failureCount} eligible recipient(s)!`, {
            sessionId,
            failureCount: response.failureCount,
            failures,
          });
        }

        return res.json({
          success: true,
          mode: 'multicast_eligible',
          delivered: response.successCount,
          failed: response.failureCount,
        });
      }
    }

    // 2. Broadcast to all subscribed attendees with active tokens in Firestore
    if (db) {
      try {
        const allUsersSnap = await db.collection('users').get();
        const allTokens = [];
        allUsersSnap.forEach(d => {
          const udata = d.data();
          if (Array.isArray(udata.fcmTokens) && udata.notificationsEnabled !== false) {
            allTokens.push(...udata.fcmTokens);
          }
        });

        if (allTokens.length > 0) {
          const uniqueAll = Array.from(new Set(allTokens));
          const response = await messaging.sendEachForMulticast({
            tokens: uniqueAll,
            notification: { title, body },
            data: { sessionId, targetUrl },
            webpush: { fcmOptions: { link: targetUrl } },
          });

          if (response.successCount > 0) {
            addLog('success', `Delivered session alert to ${response.successCount} subscriber device(s).`, {
              sessionId,
              successCount: response.successCount,
            });
          }

          if (response.failureCount > 0) {
            const failures = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                failures.push({
                  tokenPreview: `${uniqueAll[idx]?.slice(0, 16)}...`,
                  code: resp.error?.code,
                  message: resp.error?.message,
                });
              }
            });
            addLog('fail', `Session alert multicast failed for ${response.failureCount} device(s)!`, {
              sessionId,
              failureCount: response.failureCount,
              failures,
            });
          }

          return res.json({
            success: true,
            mode: 'multicast_all',
            delivered: response.successCount,
            failed: response.failureCount,
          });
        }
      } catch (err) {
        addLog('fail', `Could not multicast to all users: ${err.message}`, { error: err.message });
        console.warn('Could not multicast to all users from Firestore:', err);
      }
    }

    // 3. Fallback: Broadcast to general topic 'all-students'
    const topic = 'all-students';
    const response = await messaging.send({
      topic,
      notification: { title, body },
      data: { sessionId, targetUrl },
      webpush: { fcmOptions: { link: targetUrl } },
    });

    addLog('success', `Broadcasted session alert to topic '${topic}'. Message ID: ${response}`, {
      topic,
      messageId: response,
    });

    return res.json({
      success: true,
      mode: 'topic',
      messageId: response,
    });
  } catch (error) {
    addLog('fail', `Session alert dispatch failed with error: ${error.message}`, {
      sessionId: req.body?.sessionId,
      error: error.message,
      code: error.code,
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
router.post('/correction-alert', requireFirebase, async (req, res) => {
  try {
    const { studentId, sessionTitle, status, decisionReason } = req.body;

    if (!studentId || !sessionTitle || !status) {
      return res.status(400).json({
        success: false,
        error: 'Fields "studentId", "sessionTitle", and "status" are required.',
      });
    }

    const title = `Correction ${status === 'approved' ? 'Approved ✅' : status === 'resolved' ? 'Resolved ✅' : 'Rejected ❌'}`;
    const body = `Your attendance correction for "${sessionTitle}" was ${status}.${decisionReason ? ` Note: ${decisionReason}` : ''}`;

    addLog('dispatch', `Correction alert initiated for student ${studentId}: "${title}"`, {
      studentId,
      sessionTitle,
      status,
      decisionReason,
    });

    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not initialized.' });
    }

    let tokens = [];
    const userDoc = await db.collection('users').doc(studentId).get();
    if (userDoc.exists) {
      tokens = userDoc.data()?.fcmTokens || [];
    } else {
      // Query by studentId or id
      const querySnap = await db.collection('users').where('studentId', '==', studentId).get();
      if (!querySnap.empty) {
        querySnap.forEach(d => {
          tokens.push(...(d.data()?.fcmTokens || []));
        });
      } else {
        const queryIdSnap = await db.collection('users').where('id', '==', studentId).get();
        queryIdSnap.forEach(d => {
          tokens.push(...(d.data()?.fcmTokens || []));
        });
      }
    }

    if (!tokens.length) {
      addLog('info', `Correction alert: Student "${studentId}" has no registered FCM tokens.`, { studentId });
      return res.json({ success: false, message: 'Student has no active FCM tokens.', sentCount: 0 });
    }

    const uniqueTokens = Array.from(new Set(tokens));
    const response = await messaging.sendEachForMulticast({
      tokens: uniqueTokens,
      notification: { title, body },
      data: { type: 'correction_update', status },
      webpush: { fcmOptions: { link: '/student/history' } },
    });

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
    }

    return res.json({
      success: true,
      delivered: response.successCount,
      failed: response.failureCount,
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

export default router;
