/**
 * In-memory ring buffer logger for FCM events and self-pings
 */
const MAX_LOGS = 100;
const logs = [];

export function addLog(type, message, details = {}) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    type, // 'subscribe' | 'unsubscribe' | 'dispatch' | 'success' | 'fail' | 'ping' | 'info'
    message,
    details,
  };

  logs.unshift(entry);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }

  // Console output formatted with clean tags for Render logs
  const tagMap = {
    subscribe: '[FCM:SUBSCRIBE] 📲',
    unsubscribe: '[FCM:UNSUBSCRIBE] 🔕',
    dispatch: '[FCM:DISPATCH] 🚀',
    success: '[FCM:SUCCESS] ✅',
    fail: '[FCM:FAIL] ❌',
    ping: '[SELF-PING] 💓',
    info: '[INFO] ℹ️',
  };
  const prefix = tagMap[type] || `[${type.toUpperCase()}]`;

  if (type === 'fail') {
    console.error(`${prefix} ${message}`, Object.keys(details).length ? details : '');
  } else if (type === 'ping') {
    console.log(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`, Object.keys(details).length ? details : '');
  }

  return entry;
}

export function getLogs(limit = 50) {
  return logs.slice(0, Math.min(limit, MAX_LOGS));
}

export function clearLogs() {
  logs.length = 0;
}
