import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Activity,
  HeartPulse,
} from 'lucide-react';
import {
  fetchNotificationLogs,
  fetchNotificationSubscribers,
  getBackendBaseUrl,
} from '../../services/fcmClientService';

interface FcmLogEntry {
  id: string;
  timestamp: string;
  type: 'subscribe' | 'unsubscribe' | 'dispatch' | 'success' | 'fail' | 'ping' | 'info';
  message: string;
  details?: any;
}

interface SubscriberData {
  uid: string;
  name: string;
  email: string;
  role: string;
  studentId: string;
  deviceCount: number;
  lastActiveAt?: string;
}

interface FcmActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FcmActivityModal: React.FC<FcmActivityModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<FcmLogEntry[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberData[]>([]);
  const [totalDevices, setTotalDevices] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [pinging, setPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'subscribers'>('logs');

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedLogs, subStats] = await Promise.all([
        fetchNotificationLogs(60),
        fetchNotificationSubscribers(),
      ]);
      setLogs(fetchedLogs);
      setSubscribers(subStats.subscribers || []);
      setTotalDevices(subStats.totalDevices || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      const interval = setInterval(loadData, 15000); // Auto-refresh every 15s
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleManualPing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const backendUrl = getBackendBaseUrl();
      const res = await fetch(`${backendUrl}/api/ping`);
      const data = await res.json();
      if (res.ok) {
        setPingResult(`Server keep-alive ping succeeded (${data?.result?.duration || 12}ms)`);
        loadData();
      } else {
        setPingResult('Server ping returned non-200 status');
      }
    } catch (err: any) {
      setPingResult(`Ping error: ${err.message}`);
    } finally {
      setPinging(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const backendUrl = getBackendBaseUrl();
      await fetch(`${backendUrl}/api/notifications/logs`, { method: 'DELETE' });
      setLogs([]);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg, 12px)',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--color-line)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-brand-100)',
                color: 'var(--color-brand-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-ink-900)' }}>
                FCM Server Health & Push Activity Logs
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '2px 0 0 0' }}>
                Self-ping keep-alive status, subscribed devices, and live delivery diagnostics.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-ink-500)',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Server & Self-Ping Top Status Bar */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--color-brand-50)',
            borderBottom: '1px solid var(--color-brand-200)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--color-success-700)' }}>
              <HeartPulse size={15} /> Server Self-Ping: 10m Interval (Active)
            </span>
            <span style={{ color: 'var(--color-ink-600)' }}>
              Subscribers: <strong>{subscribers.length}</strong> ({totalDevices} device tokens)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleManualPing}
              disabled={pinging}
              style={{ height: '30px', padding: '0 10px', fontSize: '11px', gap: '5px' }}
            >
              <HeartPulse size={12} className={pinging ? 'spin' : ''} />
              <span>{pinging ? 'Pinging...' : 'Ping Server Now'}</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={loadData}
              disabled={loading}
              style={{ height: '30px', padding: '0 10px', fontSize: '11px', gap: '5px' }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {pingResult && (
          <div
            style={{
              padding: '8px 20px',
              fontSize: '11px',
              backgroundColor: 'var(--color-brand-100)',
              color: 'var(--color-brand-900)',
              borderBottom: '1px solid var(--color-brand-200)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={13} color="var(--color-success-700)" />
            <span>{pingResult}</span>
          </div>
        )}

        {/* Tab navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-line)', padding: '0 20px', backgroundColor: '#FFFFFF' }}>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'logs' ? '2px solid var(--color-brand-700)' : '2px solid transparent',
              color: activeTab === 'logs' ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
            }}
          >
            Push Event Stream ({logs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscribers')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'subscribers' ? '2px solid var(--color-brand-700)' : '2px solid transparent',
              color: activeTab === 'subscribers' ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
            }}
          >
            Subscribed Attendees ({subscribers.length})
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeTab === 'logs' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-500)', textTransform: 'uppercase' }}>
                  Live FCM Event Stream
                </span>
                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-ink-400)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={12} /> Clear Stream
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-ink-400)', fontSize: '13px' }}>
                  No recent FCM events recorded. Send a test push alert or schedule a session to see activity.
                </div>
              ) : (
                logs.map(log => {
                  const isFail = log.type === 'fail';
                  const isSuccess = log.type === 'success';
                  const isSub = log.type === 'subscribe';
                  const isPing = log.type === 'ping';

                  const badgeColor = isFail
                    ? 'var(--color-danger-700)'
                    : isSuccess
                    ? 'var(--color-success-700)'
                    : isSub
                    ? 'var(--color-brand-700)'
                    : isPing
                    ? '#0284c7'
                    : 'var(--color-ink-700)';

                  const badgeBg = isFail
                    ? 'var(--color-danger-50)'
                    : isSuccess
                    ? 'var(--color-success-50)'
                    : isSub
                    ? 'var(--color-brand-50)'
                    : isPing
                    ? '#f0f9ff'
                    : 'var(--color-ink-100)';

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: `1px solid ${isFail ? 'var(--color-danger-200)' : 'var(--color-line)'}`,
                        backgroundColor: isFail ? '#FFFDFD' : '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: badgeBg,
                              color: badgeColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {log.type}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                            {log.message}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-ink-400)', fontFamily: 'monospace' }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Failure / detail payload */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: isFail ? 'var(--color-danger-800)' : 'var(--color-ink-600)',
                            backgroundColor: isFail ? 'var(--color-danger-50)' : 'var(--color-ink-50)',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            overflowX: 'auto',
                          }}
                        >
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-500)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Registered Subscriber Devices ({subscribers.length})
              </div>

              {subscribers.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-ink-400)', fontSize: '13px' }}>
                  No attendees have subscribed to push notifications yet.
                </div>
              ) : (
                subscribers.map((sub, idx) => (
                  <div
                    key={sub.uid || idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      border: '1px solid var(--color-line)',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                        {sub.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                        {sub.email} • ID: {sub.studentId || sub.uid.slice(0, 8)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--color-brand-50)',
                          color: 'var(--color-brand-700)',
                          border: '1px solid var(--color-brand-200)',
                        }}
                      >
                        {sub.deviceCount} Device{sub.deviceCount > 1 ? 's' : ''} Active
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
