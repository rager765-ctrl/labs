// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCp6GbfCN-Ke1FKCAFYbg1iMFdfDVclLAQ",
  authDomain: "attendance-9a7f5.firebaseapp.com",
  projectId: "attendance-9a7f5",
  storageBucket: "attendance-9a7f5.firebasestorage.app",
  messagingSenderId: "84609395922",
  appId: "1:84609395922:web:140353f3a9a66c1aa5510b",
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Innovations Lab Attendance';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'New session or attendance update.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.data?.sessionId || 'attendance-notification',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  self.registration.showNotification(title, options);
});

// Generic WebPush push event handler ensuring outside-app OS notification banners
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.notification?.title || data.data?.title || data.title || 'Innovations Lab Attendance';
  const body = data.notification?.body || data.data?.body || data.body || 'New session or attendance update.';

  const options = {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.data?.sessionId || 'attendance-' + Date.now(),
    data: data.data || data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click to navigate to the relevant session or history page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.click_action || event.notification.data?.url || event.notification.data?.targetUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
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
