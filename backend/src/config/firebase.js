import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isFirebaseInitialized = false;

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    isFirebaseInitialized = true;
    return admin.app();
  }

  try {
    // Option 1: Entire service account JSON passed as environment variable (Recommended on Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      const serviceAccount = JSON.parse(rawKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'attendance-9a7f5',
      });
      console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY env var.');
      isFirebaseInitialized = true;
      return admin.app();
    }

    // Option 2: Client email and private key passed separately
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'attendance-9a7f5',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log('✅ Firebase Admin initialized from individual clientEmail/privateKey env vars.');
      isFirebaseInitialized = true;
      return admin.app();
    }

    // Option 3: Local serviceAccountKey.json file in backend root
    const localKeyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
    if (fs.existsSync(localKeyPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized from local serviceAccountKey.json.');
      isFirebaseInitialized = true;
      return admin.app();
    }

    // Option 4: Application Default Credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'attendance-9a7f5',
      });
      console.log('✅ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS.');
      isFirebaseInitialized = true;
      return admin.app();
    }

    console.warn(
      '⚠️ WARNING: No Firebase Admin credentials found!\n' +
      'Please set FIREBASE_SERVICE_ACCOUNT_KEY on Render or provide serviceAccountKey.json locally.\n' +
      'FCM push notification endpoints will return a 503 until credentials are provided.'
    );
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  }

  return null;
}

initializeFirebaseAdmin();

export const firebaseApp = admin.apps.length > 0 ? admin.app() : null;
export const messaging = firebaseApp ? admin.messaging() : null;
export const db = firebaseApp ? admin.firestore() : null;
export const auth = firebaseApp ? admin.auth() : null;
export { isFirebaseInitialized };
export default admin;
