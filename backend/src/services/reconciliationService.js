import admin, { db, messaging, isFirebaseInitialized } from '../config/firebase.js';
import { addLog } from './loggerService.js';

/**
 * Reconciles all active user tokens and topic subscriptions on server startup or on-demand
 */
export async function reconcilePushSubscriptions() {
  if (!isFirebaseInitialized || !db || !messaging) {
    console.warn('[Reconciliation] Firebase Admin not initialized, skipping auto-reconciliation.');
    return { success: false, reason: 'Firebase not initialized' };
  }

  try {
    const usersSnap = await db.collection('users').get();
    const coordinatorTokens = [];
    const studentTokens = [];
    let totalUsersWithTokens = 0;

    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.notificationsEnabled === false) return;

      const rawTokens = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
      const validTokens = Array.from(new Set(rawTokens.filter(t => typeof t === 'string' && t.length > 10)));
      if (validTokens.length === 0) return;

      totalUsersWithTokens++;

      if (data.role === 'coordinator') {
        coordinatorTokens.push(...validTokens);
      } else {
        studentTokens.push(...validTokens);
      }
    });

    const uniqueCoordTokens = Array.from(new Set(coordinatorTokens));
    const uniqueStudentTokens = Array.from(new Set(studentTokens));

    // Bulk subscribe to FCM topics
    if (uniqueCoordTokens.length > 0) {
      await messaging.subscribeToTopic(uniqueCoordTokens, 'coordinators').catch(err => {
        console.warn('Error subscribing coordinators to topic on reconciliation:', err.message);
      });
    }

    if (uniqueStudentTokens.length > 0) {
      await messaging.subscribeToTopic(uniqueStudentTokens, 'all-students').catch(err => {
        console.warn('Error subscribing students to topic on reconciliation:', err.message);
      });
    }

    addLog('info', `[Server Auto-Reconciliation] Reconciled ${totalUsersWithTokens} user(s): ${uniqueCoordTokens.length} coordinator token(s) and ${uniqueStudentTokens.length} student token(s) synced to FCM topics.`);
    console.log(`[Auto-Reconciliation] ✅ Synced ${uniqueCoordTokens.length} coordinator token(s) and ${uniqueStudentTokens.length} student token(s) with Google FCM topics.`);

    return {
      success: true,
      totalUsersWithTokens,
      coordinators: uniqueCoordTokens.length,
      students: uniqueStudentTokens.length,
    };
  } catch (err) {
    addLog('fail', `Server push auto-reconciliation error: ${err.message}`);
    console.error('[Auto-Reconciliation] ❌ Error reconciling push tokens:', err);
    return { success: false, error: err.message };
  }
}
