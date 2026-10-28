import { addLog } from './loggerService.js';

let pingIntervalId = null;
let lastPingTime = null;
let pingCount = 0;
let lastPingStatus = null;

// 10 minutes (Render free tier spins down after 15 minutes of inactivity)
const PING_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Resolves the server's public or local ping URL
 */
export function getTargetPingUrl() {
  const url = process.env.RENDER_EXTERNAL_URL ||
    process.env.SERVER_URL ||
    process.env.APP_URL ||
    process.env.SELF_PING_URL;

  if (url && url.trim()) {
    return url.trim().replace(/\/$/, '');
  }

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

/**
 * Executes a single ping against the health endpoint
 */
export async function executePing() {
  const baseUrl = getTargetPingUrl();
  const target = `${baseUrl}/health`;

  try {
    const startTime = Date.now();
    const res = await fetch(target, {
      method: 'GET',
      headers: { 'User-Agent': 'Attendance-Backend-SelfPing/1.0' },
    });
    const duration = Date.now() - startTime;
    lastPingTime = new Date().toISOString();
    pingCount++;
    lastPingStatus = res.status;

    addLog('ping', `Self-ping to ${target} -> ${res.status} OK (${duration}ms). Total pings: ${pingCount}`, {
      status: res.status,
      durationMs: duration,
      target,
    });
    return { success: true, status: res.status, duration };
  } catch (err) {
    lastPingTime = new Date().toISOString();
    lastPingStatus = 'error';
    addLog('ping', `Self-ping to ${target} failed: ${err.message}`, {
      error: err.message,
      target,
    });
    return { success: false, error: err.message };
  }
}

/**
 * Starts the self-ping background loop
 */
export function startSelfPing() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
  }

  const target = getTargetPingUrl();
  console.log(`[Self-Ping] ⏱️ Initialized self-ping service every 10 minutes targeting: ${target}/health`);

  // First warm-up ping after 20 seconds of server startup
  setTimeout(() => {
    executePing().catch(() => {});
  }, 20000);

  // Periodic interval every 10 minutes
  pingIntervalId = setInterval(() => {
    executePing().catch(() => {});
  }, PING_INTERVAL_MS);

  // Prevent blocking process exit during graceful shutdown
  if (pingIntervalId && typeof pingIntervalId.unref === 'function') {
    pingIntervalId.unref();
  }
}

/**
 * Returns current self-ping diagnostics
 */
export function getSelfPingStats() {
  return {
    enabled: true,
    intervalMinutes: 10,
    targetUrl: `${getTargetPingUrl()}/health`,
    totalPings: pingCount,
    lastPingAt: lastPingTime,
    lastStatus: lastPingStatus,
  };
}
