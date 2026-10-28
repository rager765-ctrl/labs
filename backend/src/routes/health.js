import express from 'express';
import { isFirebaseInitialized } from '../config/firebase.js';

const router = express.Router();
const startTime = Date.now();

router.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  return res.json({
    status: 'healthy',
    service: 'innovations-lab-attendance-backend',
    uptime: `${uptimeSeconds}s`,
    timestamp: new Date().toISOString(),
    firebaseReady: isFirebaseInitialized,
  });
});

router.get('/', (req, res) => {
  return res.json({
    name: 'Innovations Lab Attendance FCM Backend',
    status: 'online',
    version: '1.0.0',
    documentation: '/health',
    firebaseReady: isFirebaseInitialized,
  });
});

export default router;
