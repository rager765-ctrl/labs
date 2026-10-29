import { db } from '../config/firebase.js';
import { isEmailConfigured } from './emailService.js';
import { isFirebaseInitialized } from '../config/firebase.js';

const DEFAULT_CONFIG = {
  channel: 'both', // 'both' | 'fcm' | 'email'
  fcmEnabled: true,
  emailEnabled: true,
  events: {
    sessionLive: { fcm: true, email: true },
    sessionScheduled: { fcm: true, email: true },
    checkInAlerts: { fcm: true, email: false },
    correctionDecisions: { fcm: true, email: true },
  },
};

let cachedConfig = { ...DEFAULT_CONFIG };
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function getNotificationConfig() {
  const now = Date.now();
  if (now - lastFetchedAt < CACHE_TTL_MS && cachedConfig) {
    return {
      ...cachedConfig,
      resendReady: isEmailConfigured(),
      firebaseReady: isFirebaseInitialized,
    };
  }

  if (db) {
    try {
      const docSnap = await db.collection('systemConfig').doc('notifications').get();
      if (docSnap.exists) {
        cachedConfig = {
          ...DEFAULT_CONFIG,
          ...docSnap.data(),
          events: {
            ...DEFAULT_CONFIG.events,
            ...(docSnap.data().events || {}),
          },
        };
        lastFetchedAt = now;
      }
    } catch (err) {
      console.warn('Could not read notification config from Firestore:', err.message);
    }
  }

  return {
    ...cachedConfig,
    resendReady: isEmailConfigured(),
    firebaseReady: isFirebaseInitialized,
  };
}

export async function updateNotificationConfig(updates) {
  const current = await getNotificationConfig();

  const newConfig = {
    channel: updates.channel || current.channel,
    fcmEnabled: updates.fcmEnabled !== undefined ? updates.fcmEnabled : current.fcmEnabled,
    emailEnabled: updates.emailEnabled !== undefined ? updates.emailEnabled : current.emailEnabled,
    events: {
      ...current.events,
      ...(updates.events || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  cachedConfig = newConfig;
  lastFetchedAt = Date.now();

  if (db) {
    try {
      await db.collection('systemConfig').doc('notifications').set(newConfig, { merge: true });
    } catch (err) {
      console.warn('Could not persist notification config to Firestore:', err.message);
    }
  }

  return {
    ...newConfig,
    resendReady: isEmailConfigured(),
    firebaseReady: isFirebaseInitialized,
  };
}

export async function shouldSendFcm(eventType) {
  const config = await getNotificationConfig();
  if (!config.fcmEnabled) return false;
  if (config.channel === 'email') return false;
  if (eventType && config.events[eventType]) {
    return config.events[eventType].fcm !== false;
  }
  return true;
}

export async function shouldSendEmail(eventType) {
  if (!isEmailConfigured()) return false;
  const config = await getNotificationConfig();
  if (!config.emailEnabled) return false;
  if (config.channel === 'fcm') return false;
  if (eventType && config.events[eventType]) {
    return config.events[eventType].email === true;
  }
  return true;
}
