import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Activity,
  HeartPulse,
  Mail,
  Bell,
  Send,
  Sliders,
  AlertCircle,
  Smartphone,
  Save,
} from 'lucide-react';
import {
  fetchNotificationLogs,
  fetchNotificationSubscribers,
  fetchNotificationChannelConfig,
  updateNotificationChannelConfig,
  sendTestEmailAlert,
  getBackendBaseUrl,
  type NotificationChannelConfig,
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
  const [activeTab, setActiveTab] = useState<'logs' | 'channels' | 'subscribers'>('logs');

  // Channel configuration state
  const [config, setConfig] = useState<NotificationChannelConfig>({
    channel: 'both',
    fcmEnabled: true,
    emailEnabled: true,
    resendReady: false,
    firebaseReady: false,
    events: {
      sessionLive: { fcm: true, email: true },
      sessionScheduled: { fcm: true, email: true },
      checkInAlerts: { fcm: true, email: false },
      correctionDecisions: { fcm: true, email: true },
    },
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configFeedback, setConfigFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [sendingTestEmail, setSendingTestEmail] = useState<boolean>(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedLogs, subStats, channelConfig] = await Promise.all([
        fetchNotificationLogs(60),
        fetchNotificationSubscribers(),
        fetchNotificationChannelConfig(),
      ]);
      setLogs(fetchedLogs);
      setSubscribers(subStats.subscribers || []);
      setTotalDevices(subStats.totalDevices || 0);
      if (channelConfig) {
        setConfig(channelConfig);
      }
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

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigFeedback(null);
    try {
      const res = await updateNotificationChannelConfig(config);
      if (res.success && res.config) {
        setConfig(res.config);
        setConfigFeedback({ type: 'success', message: 'Notification channel preferences saved successfully!' });
      } else {
        setConfigFeedback({ type: 'error', message: res.error || 'Failed to save notification configuration.' });
      }
    } catch (err: any) {
      setConfigFeedback({ type: 'error', message: err.message || 'Error saving settings.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestEmailFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setSendingTestEmail(true);
    setTestEmailFeedback(null);
    try {
      const res = await sendTestEmailAlert(testEmailAddress.trim());
      if (res.success) {
        setTestEmailFeedback({
          type: 'success',
          message: `Test email dispatched to ${testEmailAddress}! Check your inbox (Message ID: ${res.messageId || 'OK'}).`,
        });
        loadData();
      } else {
        setTestEmailFeedback({
          type: 'error',
          message: res.error || 'Failed to dispatch email. Verify your RESEND_API_KEY.',
        });
      }
    } catch (err: any) {
      setTestEmailFeedback({ type: 'error', message: err.message || 'Network error dispatching test email.' });
    } finally {
      setSendingTestEmail(false);
    }
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
          maxWidth: '860px',
          maxHeight: '92vh',
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
                Notification Center: FCM Push & Resend Email
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '2px 0 0 0' }}>
                Configure delivery channels, test live email dispatch, and view real-time logs.
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

        {/* Server & Service Status Top Banner */}
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
              <HeartPulse size={15} /> Server Keep-Alive: Active
            </span>
            <span style={{ color: 'var(--color-ink-600)' }}>
              Subscribers: <strong>{subscribers.length}</strong> ({totalDevices} device tokens)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink-700)' }}>
              <Smartphone size={14} color="var(--color-brand-600)" />
              FCM: <strong style={{ color: config.firebaseReady ? 'var(--color-success-700)' : 'var(--color-warning-700)' }}>
                {config.firebaseReady ? 'Ready' : 'Pending SDK'}
              </strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-ink-700)' }}>
              <Mail size={14} color="#2563EB" />
              Resend Email: <strong style={{ color: config.resendReady ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                {config.resendReady ? 'Connected' : 'Key Missing'}
              </strong>
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
              <span>{pinging ? 'Pinging...' : 'Ping Server'}</span>
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={15} />
            Push & Email Activity ({logs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'channels' ? '2px solid var(--color-brand-700)' : '2px solid transparent',
              color: activeTab === 'channels' ? 'var(--color-brand-700)' : 'var(--color-ink-500)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sliders size={15} />
            Delivery Channels & Resend Setup
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
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Smartphone size={15} />
            Subscribed Attendees ({subscribers.length})
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-500)', textTransform: 'uppercase' }}>
                  Live FCM & Resend Event Stream
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
                      display: 'flex',
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
                  No recent FCM push or email logs recorded.
                </div>
              ) : (
                logs.map((log) => {
                  const isFail = log.type === 'fail';
                  const isSuccess = log.type === 'success';
                  const isSubscribe = log.type === 'subscribe';
                  const isDispatch = log.type === 'dispatch';

                  return (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid var(--color-line)',
                        backgroundColor: isFail ? '#FEF2F2' : isSuccess ? '#F0FDF4' : '#FFFFFF',
                        fontSize: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isFail
                                ? 'var(--color-danger-100)'
                                : isSuccess
                                ? 'var(--color-success-100)'
                                : isSubscribe
                                ? 'var(--color-brand-100)'
                                : isDispatch
                                ? '#EFF6FF'
                                : 'var(--color-ink-100)',
                              color: isFail
                                ? 'var(--color-danger-800)'
                                : isSuccess
                                ? 'var(--color-success-800)'
                                : isSubscribe
                                ? 'var(--color-brand-800)'
                                : isDispatch
                                ? '#1D4ED8'
                                : 'var(--color-ink-700)',
                            }}
                          >
                            {log.type}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--color-ink-900)' }}>
                            {log.message}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-ink-400)' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
          )}

          {activeTab === 'channels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Delivery Channel Selector */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Bell size={18} color="var(--color-brand-700)" />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                    Primary Delivery Channel
                  </h3>
                </div>
                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--color-ink-500)' }}>
                  Choose how Innovations Lab alerts and announcements are delivered to attendees and coordinators.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {/* Both */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: config.channel === 'both' ? '2px solid var(--color-brand-600)' : '1px solid var(--color-line)',
                      backgroundColor: config.channel === 'both' ? 'var(--color-brand-50)' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryChannel"
                      checked={config.channel === 'both'}
                      onChange={() => setConfig(prev => ({ ...prev, channel: 'both', fcmEnabled: true, emailEnabled: true }))}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                        Both (FCM & Email)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                        Maximum reach: Sends browser/mobile push and Resend email alerts simultaneously.
                      </div>
                    </div>
                  </label>

                  {/* FCM Only */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: config.channel === 'fcm' ? '2px solid var(--color-brand-600)' : '1px solid var(--color-line)',
                      backgroundColor: config.channel === 'fcm' ? 'var(--color-brand-50)' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryChannel"
                      checked={config.channel === 'fcm'}
                      onChange={() => setConfig(prev => ({ ...prev, channel: 'fcm', fcmEnabled: true, emailEnabled: false }))}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                        FCM Push Only
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                        Delivers only push notifications to registered browser/mobile tokens.
                      </div>
                    </div>
                  </label>

                  {/* Email Only */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: config.channel === 'email' ? '2px solid var(--color-brand-600)' : '1px solid var(--color-line)',
                      backgroundColor: config.channel === 'email' ? 'var(--color-brand-50)' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryChannel"
                      checked={config.channel === 'email'}
                      onChange={() => setConfig(prev => ({ ...prev, channel: 'email', fcmEnabled: false, emailEnabled: true }))}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                        Resend Email Only
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                        Delivers formatted HTML emails to attendee email addresses.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Event Matrix Configuration */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Sliders size={18} color="var(--color-brand-700)" />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                    Per-Event Channel Routing
                  </h3>
                </div>
                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--color-ink-500)' }}>
                  Fine-tune whether FCM push and/or Resend email is dispatched for each event type.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Event: Session Live */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-ink-50)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                        🔴 Meeting Goes Live
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                        Notifies registered attendees that check-in is currently open.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.sessionLive?.fcm !== false}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                sessionLive: { ...prev.events.sessionLive, fcm: e.target.checked },
                              },
                            }))
                          }
                        />
                        FCM Push
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.sessionLive?.email !== false}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                sessionLive: { ...prev.events.sessionLive, email: e.target.checked },
                              },
                            }))
                          }
                        />
                        Resend Email
                      </label>
                    </div>
                  </div>

                  {/* Event: Session Scheduled */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-ink-50)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                        📅 Session Scheduled
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                        Notifies attendees when a coordinator schedules a new lab session.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.sessionScheduled?.fcm !== false}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                sessionScheduled: { ...prev.events.sessionScheduled, fcm: e.target.checked },
                              },
                            }))
                          }
                        />
                        FCM Push
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.sessionScheduled?.email !== false}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                sessionScheduled: { ...prev.events.sessionScheduled, email: e.target.checked },
                              },
                            }))
                          }
                        />
                        Resend Email
                      </label>
                    </div>
                  </div>

                  {/* Event: Check-In Alerts */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-ink-50)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                        🟢 Check-In & Check-Out Alerts
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                        Sends arrival notifications to coordinators on active sessions.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.checkInAlerts?.fcm !== false}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                checkInAlerts: { ...prev.events.checkInAlerts, fcm: e.target.checked },
                              },
                            }))
                          }
                        />
                        FCM Push
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.checkInAlerts?.email === true}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                checkInAlerts: { ...prev.events.checkInAlerts, email: e.target.checked },
                              },
                            }))
                          }
                        />
                        Resend Email
                      </label>
                    </div>
                  </div>

                  {/* Event: Correction Decisions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-ink-50)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                        ⚖️ Dispute & Correction Decisions
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                        Notifies student when their attendance dispute is approved or rejected.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.correctionDecisions?.fcm !== false}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                correctionDecisions: { ...prev.events.correctionDecisions, fcm: e.target.checked },
                              },
                            }))
                          }
                        />
                        FCM Push
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={config.events?.correctionDecisions?.email !== false}
                          onChange={(e) =>
                            setConfig(prev => ({
                              ...prev,
                              events: {
                                ...prev.events,
                                correctionDecisions: { ...prev.events.correctionDecisions, email: e.target.checked },
                              },
                            }))
                          }
                        />
                        Resend Email
                      </label>
                    </div>
                  </div>
                </div>

                {/* Save Rules Button */}
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '12px' }}>
                    {configFeedback && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: configFeedback.type === 'success' ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                          fontWeight: 600,
                        }}
                      >
                        {configFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {configFeedback.message}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    style={{ height: '36px', padding: '0 16px', fontSize: '12px', gap: '6px' }}
                  >
                    <Save size={14} />
                    <span>{savingConfig ? 'Saving...' : 'Save Channel Rules'}</span>
                  </button>
                </div>
              </div>

              {/* Resend Diagnostic Test Sender */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Mail size={18} color="#2563EB" />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                    Resend Email Diagnostic Dispatch
                  </h3>
                  {config.fromEmail && (
                    <span style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginLeft: 'auto' }}>
                      Sender: <code style={{ backgroundColor: 'var(--color-ink-100)', padding: '2px 6px', borderRadius: '4px' }}>{config.fromEmail}</code>
                    </span>
                  )}
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--color-ink-500)' }}>
                  Send an instant test email to verify your Resend API configuration and ensure inbox delivery.
                </p>

                {config.fromEmail?.includes('onboarding@resend.dev') && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      color: '#92400E',
                      fontSize: '11px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      lineHeight: '16px',
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <strong>Important Resend Free-Tier Rule:</strong> Currently using the default sandbox sender <code>onboarding@resend.dev</code>. Resend only delivers emails to the specific email address associated with your Resend account.
                      <div style={{ marginTop: '4px' }}>
                        To deliver emails to any student email address, add and verify your custom domain in <a href="https://resend.com/domains" target="_blank" rel="noreferrer" style={{ color: '#1D4ED8', textDecoration: 'underline', fontWeight: 600 }}>resend.com/domains</a> and set <code>RESEND_FROM_EMAIL</code> on Render (e.g. <code>Innovations Lab &lt;noreply@yourdomain.com&gt;</code>).
                      </div>
                    </div>
                  </div>
                )}

                {!config.resendReady && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-warning-50)',
                      border: '1px solid var(--color-warning-200)',
                      color: 'var(--color-warning-800)',
                      fontSize: '11px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>
                      <strong>Notice:</strong> <code>RESEND_API_KEY</code> is not yet configured on the server. Add it to Render Environment Variables to enable email pushes.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSendTestEmail} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="Enter email address (e.g. coordinator@domain.com)"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '240px',
                      height: '36px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-line)',
                      fontSize: '12px',
                    }}
                  />
                  <button
                    type="submit"
                    className="btn-secondary"
                    disabled={sendingTestEmail}
                    style={{ height: '36px', padding: '0 16px', fontSize: '12px', gap: '6px' }}
                  >
                    <Send size={13} className={sendingTestEmail ? 'spin' : ''} />
                    <span>{sendingTestEmail ? 'Sending...' : 'Send Test Email'}</span>
                  </button>
                </form>

                {testEmailFeedback && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      backgroundColor: testEmailFeedback.type === 'success' ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                      border: `1px solid ${testEmailFeedback.type === 'success' ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
                      color: testEmailFeedback.type === 'success' ? 'var(--color-success-800)' : 'var(--color-danger-800)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {testEmailFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{testEmailFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'subscribers' && (
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
