import express from 'express';
import { isFirebaseInitialized } from '../config/firebase.js';
import { getSelfPingStats, executePing } from '../services/selfPingService.js';
import { isEmailConfigured } from '../services/emailService.js';

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
    resendReady: isEmailConfigured(),
    selfPing: getSelfPingStats(),
  });
});

router.get('/api/ping', async (req, res) => {
  const result = await executePing();
  return res.json({
    message: 'Manual self-ping executed',
    result,
    stats: getSelfPingStats(),
  });
});

router.get('/', (req, res) => {
  return res.json({
    name: 'Innovations Lab Attendance FCM Backend',
    status: 'online',
    version: '1.1.0',
    documentation: '/health',
    firebaseReady: isFirebaseInitialized,
    selfPing: getSelfPingStats(),
  });
});

export default router;
