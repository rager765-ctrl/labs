// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Service Worker lifecycle - activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCp6GbfCN-Ke1FKCAFYbg1iMFdfDVclLAQ",
  authDomain: "attendance-9a7f5.firebaseapp.com",
  projectId: "attendance-9a7f5",
  storageBucket: "attendance-9a7f5.firebasestorage.app",
  messagingSenderId: "84609395922",
  appId: "1:84609395922:web:140353f3a9a66c1aa5510b",
});

const messaging = firebase.messaging();

/**
 * Standard notification renderer using real PNG bitmaps supported across all mobile & desktop operating systems
 */
function showBackgroundNotification(payload) {
  if (!payload) return Promise.resolve();

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || payload.title || 'Innovations Lab Attendance';
  const body = notification.body || data.body || payload.body || 'New session or attendance update.';
  const tag = data.sessionId ? ('session-' + data.sessionId) : (data.tag || notification.tag || data.type || 'lab-alert');
  const targetUrl = data.click_action || data.url || data.targetUrl || notification.click_action || '/';

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/badge.png',
    tag,
    renotify: true,
    data: {
      ...data,
      click_action: targetUrl,
      url: targetUrl,
    },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
  };

  return self.registration.showNotification(title, options);
}

// Firebase SDK background handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] onBackgroundMessage received:', payload);
  return showBackgroundNotification(payload);
});

// Generic WebPush push event handler ensuring outside-app OS notification banners
// Keeps the Service Worker process alive until Android/Windows OS accepts the notification
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { data: { body: event.data.text() } };
  }

  event.waitUntil(showBackgroundNotification(payload));
});

// Handle notification click to navigate to the relevant session or history page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    event.notification.data?.click_action ||
    event.notification.data?.url ||
    event.notification.data?.targetUrl ||
    '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
