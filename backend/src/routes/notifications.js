import express from 'express';
import admin, { messaging, db, isFirebaseInitialized } from '../config/firebase.js';

const router = express.Router();

/**
 * Middleware to check if Firebase Admin is ready
 */
function requireFirebase(req, res, next) {
  if (!isFirebaseInitialized || !messaging) {
    return res.status(503).json({
      success: false,
      error: 'Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT_KEY in environment variables.',
    });
  }
  next();
}

/**
 * POST /api/notifications/register-token
 * Saves an FCM device token for a student or coordinator in Firestore
 */
router.post('/register-token', requireFirebase, async (req, res) => {
  try {
    const { uid, token, deviceName = 'Web Browser' } = req.body;

    if (!uid || !token) {
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
          lastActiveAt: new Date().toISOString(),
          lastDevice: deviceName,
        },
        { merge: true }
      );
    }

    return res.json({
      success: true,
      message: 'FCM token registered successfully.',
    });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register token',
    });
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
          icon: '/vite.svg',
          badge: '/vite.svg',
        },
      },
    };

    const response = await messaging.send(message);
    return res.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
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
      return res.status(404).json({ success: false, error: `User ${uid} not found.` });
    }

    const userData = userDoc.data();
    const tokens = userData.fcmTokens || [];

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'User has no registered FCM tokens.',
        sentCount: 0,
      });
    }

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

    // Clean up expired or invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await db.collection('users').doc(uid).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens),
        });
      }
    }

    return res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('Error sending push notification to user:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification to user',
    });
  }
});

/**
 * POST /api/notifications/session-alert
 * Dispatches an alert when a session goes live or check-in opens
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

    const title = alertType === 'session_live' ? `🔴 Live Session: ${sessionTitle}` : `Upcoming Session: ${sessionTitle}`;
    const body = alertType === 'session_live'
      ? `Check-in is now open at ${room || 'the lab'}. Tap to scan or verify your attendance.`
      : `Session scheduled at ${room || 'the lab'}.`;

    const targetUrl = `/student/sessions/${sessionId}`;

    // If specific eligible student IDs provided, look up their tokens
    if (Array.isArray(eligibleStudentIds) && eligibleStudentIds.length > 0 && db) {
      const tokenList = [];
      const userDocs = await Promise.all(
        eligibleStudentIds.slice(0, 100).map(id => db.collection('users').doc(id).get())
      );

      userDocs.forEach(docSnap => {
        if (docSnap.exists) {
          const data = docSnap.data();
          if (Array.isArray(data.fcmTokens)) {
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

        return res.json({
          success: true,
          mode: 'multicast',
          delivered: response.successCount,
          failed: response.failureCount,
        });
      }
    }

    // Fallback: Broadcast to general topic
    const topic = `session-${sessionId}`;
    const response = await messaging.send({
      topic: 'all-students',
      notification: { title, body },
      data: { sessionId, targetUrl },
      webpush: { fcmOptions: { link: targetUrl } },
    });

    return res.json({
      success: true,
      mode: 'topic',
      messageId: response,
    });
  } catch (error) {
    console.error('Error dispatching session alert:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch session alert',
    });
  }
});

/**
 * POST /api/notifications/correction-alert
 * Dispatches an alert when a coordinator approves or rejects an attendance correction
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

    const title = `Correction ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`;
    const body = `Your attendance correction for "${sessionTitle}" was ${status}.${decisionReason ? ` Note: ${decisionReason}` : ''}`;

    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not initialized.' });
    }

    const userDoc = await db.collection('users').doc(studentId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }

    const tokens = userDoc.data()?.fcmTokens || [];
    if (!tokens.length) {
      return res.json({ success: false, message: 'Student has no active FCM tokens.', sentCount: 0 });
    }

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { type: 'correction_update', status },
      webpush: { fcmOptions: { link: '/student/history' } },
    });

    return res.json({
      success: true,
      delivered: response.successCount,
    });
  } catch (error) {
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

    return res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
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

    return res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
