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

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
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
  };

  self.registration.showNotification(title, options);
});

// Handle notification click to navigate to the relevant session or history page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.click_action || event.notification.data?.targetUrl || '/';

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
