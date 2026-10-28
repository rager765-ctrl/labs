import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration provided for attendance-9a7f5
export const firebaseConfig = {
  apiKey: "AIzaSyCp6GbfCN-Ke1FKCAFYbg1iMFdfDVclLAQ",
  authDomain: "attendance-9a7f5.firebaseapp.com",
  projectId: "attendance-9a7f5",
  storageBucket: "attendance-9a7f5.firebasestorage.app",
  messagingSenderId: "84609395922",
  appId: "1:84609395922:web:140353f3a9a66c1aa5510b",
  measurementId: "G-BSTGD1D2R6",
};

// Initialize Firebase app singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication & Firestore BaaS instances with undefined property tolerance
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});

import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';

// Initialize Analytics conditionally where supported (browser environment)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined' && (await isSupported())) {
    return getAnalytics(app);
  }
  return null;
};

// Initialize Firebase Messaging (FCM) conditionally where supported
export const initMessaging = async () => {
  if (typeof window !== 'undefined' && (await isMessagingSupported())) {
    return getMessaging(app);
  }
  return null;
};
