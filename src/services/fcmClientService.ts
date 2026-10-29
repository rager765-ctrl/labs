import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { initMessaging, db } from './firebase';
import type { LabSession } from '../types';

export const BACKEND_URL_STORAGE_KEY = 'attendance_backend_api_url';
export const FCM_SUBSCRIBED_KEY = 'attendance_fcm_subscribed';
export const FCM_TOKEN_STORAGE_KEY = 'attendance_fcm_token';

/**
 * Returns the configured backend API URL for Render or local development
 */
export function getBackendBaseUrl(): string {
  const custom = localStorage.getItem(BACKEND_URL_STORAGE_KEY);
  if (custom && custom.trim() && !custom.includes('localhost:5000')) {
    return custom.trim().replace(/\/$/, '');
  }
  // Default to live Render backend
  return (import.meta.env.VITE_BACKEND_URL || 'https://labs-pyi3.onrender.com').replace(/\/$/, '');
}

/**
 * Allows the user or admin to set their deployed Render URL in settings
 */
export function setBackendBaseUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem(BACKEND_URL_STORAGE_KEY, url.trim().replace(/\/$/, ''));
  } else {
    localStorage.removeItem(BACKEND_URL_STORAGE_KEY);
  }
}

/**
 * Checks if Web Push Notifications and Service Workers are supported in this browser
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Gets the current Notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Requests notification permission, retrieves an FCM device token, and registers it with Firestore and Backend
 */
export async function requestAndSubscribePush(uid: string, role?: string): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported in this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied or dismissed.' };
    }

    const messaging = await initMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase Cloud Messaging is not available.' };
    }

    // Register or retrieve service worker registration
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });

    // Retrieve FCM device token
    // Optional VAPID key if configured in .env: VITE_FIREBASE_VAPID_KEY
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;
    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey,
    });

    if (!currentToken) {
      return { success: false, error: 'Unable to retrieve FCM registration token from Firebase.' };
    }

    // 1. Store token in user's Firestore document
    if (db && uid) {
      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
          fcmTokens: arrayUnion(currentToken),
          role: role || 'student',
          notificationsEnabled: true,
          fcmSubscribedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        }, { merge: true });

        // Backup in fcmTokens collection for fast lookup
        const tokenDocRef = doc(db, 'fcmTokens', currentToken.slice(0, 64));
        await setDoc(tokenDocRef, {
          token: currentToken,
          uid,
          role: role || 'student',
          createdAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {});
      } catch (err) {
        console.warn('Could not save FCM token directly to Firestore:', err);
      }
    }

    // 2. Register token with backend service on Render
    try {
      const backendUrl = getBackendBaseUrl();
      const res = await fetch(`${backendUrl}/api/notifications/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          token: currentToken,
          role: role || 'student',
          deviceName: navigator.userAgent.slice(0, 80),
        }),
      });
      if (!res.ok) {
        console.warn('Backend register-token returned non-200 status:', res.status);
      }
    } catch (err) {
      console.warn('Backend notification server reached error (Render waking up or offline):', err);
    }

    // Persist in localStorage
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, currentToken);
    localStorage.setItem(FCM_SUBSCRIBED_KEY, 'true');

    // Show a welcome notification
    if (Notification.permission === 'granted') {
      try {
        swRegistration.showNotification('Notifications Enabled ✅', {
          body: 'You will now receive instant alerts for live meetings, sessions, and correction updates.',
          icon: '/favicon.svg',
          badge: '/favicon.svg',
        });
      } catch {
        // Fallback or ignore
      }
    }

    return { success: true, token: currentToken };
  } catch (error: any) {
    console.error('Error enabling push notifications:', error);
    return { success: false, error: error.message || 'Failed to enable push notifications.' };
  }
}

/**
 * Unsubscribes from push notifications and removes the token
 */
export async function unsubscribePush(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (db && uid && token) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          fcmTokens: arrayRemove(token),
          notificationsEnabled: false,
        });
      } catch (err) {
        console.warn('Could not remove FCM token from Firestore:', err);
      }
    }

    localStorage.removeItem(FCM_SUBSCRIBED_KEY);
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper to dispatch alerts via the Render backend
 */
async function sendBackendNotification(endpoint: string, payload: any): Promise<boolean> {
  const backendUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${backendUrl}/api/notifications/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn(`Could not dispatch notification to ${endpoint} on ${backendUrl}:`, err);
    return false;
  }
}

/**
 * Dispatches an alert when a coordinator starts a session (status toggled to 'live')
 */
export async function notifySessionLive(session: LabSession): Promise<void> {
  await sendBackendNotification('session-alert', {
    sessionId: session.id,
    sessionTitle: session.title,
    room: session.room,
    coordinatorName: session.coordinatorName,
    eligibleStudentIds: session.eligibleStudentIds || [],
    alertType: 'session_live',
  });
}

/**
 * Dispatches an alert when a coordinator schedules a new session
 */
export async function notifySessionScheduled(session: LabSession): Promise<void> {
  await sendBackendNotification('session-alert', {
    sessionId: session.id,
    sessionTitle: session.title,
    room: session.room,
    coordinatorName: session.coordinatorName,
    eligibleStudentIds: session.eligibleStudentIds || [],
    alertType: 'session_scheduled',
  });
}

/**
 * Dispatches an alert when a coordinator resolves or approves/rejects an attendance correction
 */
export async function notifyCorrectionDecision(params: {
  studentId: string;
  sessionTitle: string;
  status: 'approved' | 'rejected' | 'resolved';
  decisionReason?: string;
}): Promise<void> {
  await sendBackendNotification('correction-alert', {
    studentId: params.studentId,
    sessionTitle: params.sessionTitle,
    status: params.status,
    decisionReason: params.decisionReason,
  });
}

/**
 * Dispatches an alert to coordinators when an attendee checks in, checks out, or submits an issue
 */
export async function notifyCoordinatorAttendeeEvent(params: {
  type: 'checkin' | 'checkout' | 'correction_submitted' | 'issue_resolved';
  studentName?: string;
  studentId?: string;
  sessionTitle?: string;
  sessionId?: string;
  status?: string;
  reason?: string;
}): Promise<void> {
  await sendBackendNotification('coordinator-alert', params);
}

/**
 * Sends a test push notification to verify the pipeline
 */
export async function sendTestPushAlert(uid: string): Promise<boolean> {
  const success = await sendBackendNotification('send-to-user', {
    uid,
    title: '🔔 Test Notification from Innovations Lab',
    body: 'FCM push notifications are configured and functioning on this device!',
    url: '/student',
  });

  // Local fallback notification if backend is sleeping on Render free tier
  if (Notification.permission === 'granted') {
    try {
      new Notification('🔔 Test Alert (Innovations Lab)', {
        body: 'FCM push pipeline verified on your browser!',
        icon: '/favicon.svg',
      });
    } catch {
      // Ignored
    }
  }

  return success;
}

/**
 * Directly triggers a native OS desktop/system notification outside the browser window
 */
export function triggerSystemNotification(title: string, body: string, url?: string): void {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions: NotificationOptions = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'attendance-' + Date.now(),
    data: { url: url || '/' },
    requireInteraction: true,
  };

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => {
          reg.showNotification(title, notificationOptions);
        })
        .catch(() => {
          try {
            new Notification(title, notificationOptions);
          } catch {}
        });
    } else {
      new Notification(title, notificationOptions);
    }
  } catch (err) {
    console.warn('Could not display system notification:', err);
  }
}

/**
 * Sets up foreground FCM push listener
 */
export async function setupForegroundNotificationListener(
  onNotification: (payload: { title?: string; body?: string; data?: any }) => void
): Promise<(() => void) | null> {
  try {
    const messaging = await initMessaging();
    if (!messaging) return null;

    return onMessage(messaging, (payload) => {
      console.log('Foreground push message received:', payload);
      onNotification({
        title: payload.notification?.title || payload.data?.title,
        body: payload.notification?.body || payload.data?.body,
        data: payload.data,
      });
    });
  } catch (err) {
    console.warn('Could not setup foreground notification listener:', err);
    return null;
  }
}

/**
 * Pings backend health endpoint to verify connectivity and keep Render awake
 */
export async function pingBackendHealth(): Promise<{ healthy: boolean; data?: any }> {
  try {
    const backendUrl = getBackendBaseUrl();
    const res = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return { healthy: false };
    const data = await res.json();
    return { healthy: true, data };
  } catch (err) {
    return { healthy: false };
  }
}

/**
 * Fetches recent in-memory FCM dispatch, subscription, and failure logs from backend
 */
export async function fetchNotificationLogs(limit = 40): Promise<any[]> {
  try {
    const backendUrl = getBackendBaseUrl();
    const res = await fetch(`${backendUrl}/api/notifications/logs?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.warn('Could not fetch notification logs from backend:', err);
    return [];
  }
}

/**
 * Fetches active FCM subscriber stats from backend
 */
export async function fetchNotificationSubscribers(): Promise<{ totalSubscribers: number; totalDevices: number; subscribers: any[] }> {
  try {
    const backendUrl = getBackendBaseUrl();
    const res = await fetch(`${backendUrl}/api/notifications/subscribers`);
    if (!res.ok) return { totalSubscribers: 0, totalDevices: 0, subscribers: [] };
    return await res.json();
  } catch (err) {
    return { totalSubscribers: 0, totalDevices: 0, subscribers: [] };
  }
}

export interface NotificationChannelConfig {
  channel: 'both' | 'fcm' | 'email';
  fcmEnabled: boolean;
  emailEnabled: boolean;
  fromEmail?: string;
  resendReady?: boolean;
  firebaseReady?: boolean;
  events: {
    sessionLive: { fcm: boolean; email: boolean };
    sessionScheduled: { fcm: boolean; email: boolean };
    checkInAlerts: { fcm: boolean; email: boolean };
    correctionDecisions: { fcm: boolean; email: boolean };
  };
  updatedAt?: string;
}

/**
 * Fetches notification delivery channel configuration and service readiness from backend
 */
export async function fetchNotificationChannelConfig(): Promise<NotificationChannelConfig | null> {
  try {
    const backendUrl = getBackendBaseUrl();
    const res = await fetch(`${backendUrl}/api/notifications/config`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.config || null;
  } catch (err) {
    console.warn('Could not fetch notification config:', err);
    return null;
  }
}

/**
 * Updates notification delivery channel configuration on backend
 */
export async function updateNotificationChannelConfig(
  updates: Partial<NotificationChannelConfig>
): Promise<{ success: boolean; config?: NotificationChannelConfig; error?: string }> {
  try {
    const backendUrl = getBackendBaseUrl();
    const res = await fetch(`${backendUrl}/api/notifications/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update notification configuration.' };
    }
    return { success: true, config: data.config };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating notification config.' };
  }
}

/**
 * Dispatches a test email via backend Resend integration
 */
export async function sendTestEmailAlert(email: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const backendUrl = getBackendBaseUrl();
    const res = await fetch(`${backendUrl}/api/notifications/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to dispatch test email.' };
    }
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error dispatching test email.' };
  }
}
