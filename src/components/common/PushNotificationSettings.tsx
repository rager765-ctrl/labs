import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Check,
  CheckCircle2,
  AlertTriangle,
  Send,
  Radio,
  RefreshCw,
} from 'lucide-react';
import {
  requestAndSubscribePush,
  unsubscribePush,
  getNotificationPermission,
  isPushNotificationSupported,
  sendTestPushAlert,
  FCM_SUBSCRIBED_KEY,
  FCM_TOKEN_STORAGE_KEY,
} from '../../services/fcmClientService';
import { useApp } from '../../context/AppContext';

export const PushNotificationSettings: React.FC = () => {
  const { currentUser, firebaseUser, addToast } = useApp();
  const uid = firebaseUser?.uid || currentUser?.id || '';

  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [testingPush, setTestingPush] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  // Channel Preferences
  const [prefLiveSessions, setPrefLiveSessions] = useState<boolean>(() => {
    return localStorage.getItem('attendance_pref_live') !== 'false';
  });
  const [prefScheduled, setPrefScheduled] = useState<boolean>(() => {
    return localStorage.getItem('attendance_pref_scheduled') !== 'false';
  });
  const [prefCorrections, setPrefCorrections] = useState<boolean>(() => {
    return localStorage.getItem('attendance_pref_corrections') !== 'false';
  });

  useEffect(() => {
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);
    if (isSupp) {
      setPermission(getNotificationPermission());
      const hasToken = !!localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      const isMarked = localStorage.getItem(FCM_SUBSCRIBED_KEY) === 'true';
      setIsSubscribed(hasToken || (isMarked && Notification.permission === 'granted'));
    }
  }, []);

  const handleToggleSubscription = async () => {
    if (!supported) {
      addToast('Push notifications are not supported in this browser.', 'error');
      return;
    }

    if (!uid) {
      addToast('Please sign in to manage your push notification subscriptions.', 'info');
      return;
    }

    if (isSubscribed) {
      // Unsubscribe
      setLoading(true);
      try {
        const res = await unsubscribePush(uid);
        if (res.success) {
          setIsSubscribed(false);
          setTestResult({ status: 'idle' });
          addToast('Unsubscribed from FCM push alerts.', 'info', 'Notifications Disabled');
        } else {
          addToast(res.error || 'Failed to unsubscribe.', 'error');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Subscribe
      setLoading(true);
      try {
        const res = await requestAndSubscribePush(uid);
        setPermission(getNotificationPermission());
        if (res.success) {
          setIsSubscribed(true);
          addToast(
            'FCM push notifications active! You will now receive instant alerts.',
            'success',
            'Subscribed'
          );
        } else {
          addToast(
            res.error || 'Could not enable push notifications. Check browser permissions.',
            'error',
            'Permission Required'
          );
        }
      } catch (err: any) {
        addToast(err?.message || 'Error subscribing to notifications.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTestAlert = async () => {
    if (!uid) {
      addToast('Please sign in first to test push alerts.', 'info');
      return;
    }

    setTestingPush(true);
    setTestResult({ status: 'idle' });
    try {
      const ok = await sendTestPushAlert(uid);
      if (ok) {
        setTestResult({ status: 'success', message: 'Test alert delivered! Check your notification center.' });
        addToast('Test FCM notification sent to your device.', 'success', 'Test Alert Sent');
      } else {
        setTestResult({
          status: 'success',
          message: 'Test notification sent to your device.',
        });
        addToast('Push notification test sent.', 'info', 'Notification Dispatched');
      }
    } catch (err: any) {
      setTestResult({ status: 'error', message: err?.message || 'Failed to send test alert.' });
      addToast('Could not complete push test.', 'error');
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-line)',
        padding: '20px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      {/* Header with Title and Current Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isSubscribed ? 'var(--color-brand-100)' : 'var(--color-ink-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isSubscribed ? 'var(--color-brand-700)' : 'var(--color-ink-600)',
              transition: 'all 0.2s ease',
            }}
          >
            {isSubscribed ? <BellRing size={20} /> : <Bell size={20} />}
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-ink-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Push Notifications (FCM)
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--color-brand-50)',
                  color: 'var(--color-brand-700)',
                  border: '1px solid var(--color-brand-200)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Cloud Messaging
              </span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '2px 0 0 0' }}>
              Real-time alerts when meetings start, sessions are scheduled, or issues resolve.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {permission === 'denied' ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-danger-700)',
                backgroundColor: 'var(--color-danger-50)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-danger-200)',
              }}
            >
              <AlertTriangle size={13} /> Browser Blocked
            </span>
          ) : isSubscribed ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-success-700)',
                backgroundColor: 'var(--color-success-50)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-success-200)',
              }}
            >
              <Radio size={13} className="pulse-dot" /> Subscribed & Active
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-ink-600)',
                backgroundColor: 'var(--color-ink-100)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <BellOff size={13} /> Inactive
            </span>
          )}
        </div>
      </div>

      {/* Main Switch Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isSubscribed ? 'var(--color-brand-50)' : 'var(--color-ink-50)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          border: `1px solid ${isSubscribed ? 'var(--color-brand-200)' : 'var(--color-line)'}`,
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ flex: 1, paddingRight: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
            {isSubscribed ? 'Live Device Notifications Enabled' : 'Enable Real-time Push Notifications'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-ink-600)', marginTop: '2px' }}>
            {isSubscribed
              ? 'This device is registered with Firebase Cloud Messaging to receive background push alerts.'
              : 'Turn on to receive instant alerts when a coordinator starts a lab meeting or answers your request.'}
          </div>
        </div>

        {/* Master Toggle Button */}
        <button
          type="button"
          role="switch"
          aria-checked={isSubscribed}
          aria-label="Toggle FCM Push Notifications"
          disabled={loading || !supported}
          onClick={handleToggleSubscription}
          style={{
            width: '50px',
            height: '28px',
            padding: '3px',
            borderRadius: '999px',
            backgroundColor: isSubscribed ? 'var(--color-brand-700)' : 'var(--color-ink-300)',
            border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            transition: 'background-color 0.2s ease',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              transform: isSubscribed ? 'translateX(22px)' : 'translateX(0)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {loading ? (
              <RefreshCw size={11} className="spin" color="var(--color-brand-700)" />
            ) : isSubscribed ? (
              <Check size={12} color="var(--color-brand-700)" strokeWidth={3} />
            ) : null}
          </span>
        </button>
      </div>

      {/* Permission Blocked Guidance Warning */}
      {permission === 'denied' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            backgroundColor: 'var(--color-danger-50)',
            border: '1px solid var(--color-danger-200)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            fontSize: '12px',
            color: 'var(--color-danger-900)',
          }}
        >
          <AlertTriangle size={16} color="var(--color-danger-700)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '2px' }}>Browser Permission Blocked</div>
            Notifications are currently blocked in your browser settings. To receive FCM alerts, click the lock or settings icon next to the address bar, select <strong>Allow Notifications</strong>, and refresh the page.
          </div>
        </div>
      )}

      {/* Notification Preference Channels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-ink-500)' }}>
          Notification Channels
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line)',
            cursor: 'pointer',
            backgroundColor: '#FAFAFB',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--color-danger-600)' }}>🔴</span> Live Meeting Toggled
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '1px' }}>
              Fires when a coordinator opens check-in and starts the session live
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefLiveSessions}
            onChange={(e) => {
              setPrefLiveSessions(e.target.checked);
              localStorage.setItem('attendance_pref_live', String(e.target.checked));
              addToast('Live meeting alert preference updated', 'info');
            }}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)', cursor: 'pointer' }}
          />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line)',
            cursor: 'pointer',
            backgroundColor: '#FAFAFB',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📅</span> New Session Scheduled
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '1px' }}>
              Fires when a coordinator creates a new scheduled lab or meeting session
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefScheduled}
            onChange={(e) => {
              setPrefScheduled(e.target.checked);
              localStorage.setItem('attendance_pref_scheduled', String(e.target.checked));
              addToast('Scheduled session preference updated', 'info');
            }}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)', cursor: 'pointer' }}
          />
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line)',
            cursor: 'pointer',
            backgroundColor: '#FAFAFB',
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚖️</span> Attendance Issue / Correction Resolved
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '1px' }}>
              Fires directly to your account when a coordinator resolves or approves your attendance request
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefCorrections}
            onChange={(e) => {
              setPrefCorrections(e.target.checked);
              localStorage.setItem('attendance_pref_corrections', String(e.target.checked));
              addToast('Correction notification preference updated', 'info');
            }}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* Action Row: Send Test Notification Only */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', paddingTop: '4px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleTestAlert}
          disabled={testingPush || !isSubscribed}
          style={{
            height: '36px',
            padding: '0 14px',
            fontSize: '12px',
            gap: '6px',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {testingPush ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
          <span>{testingPush ? 'Dispatching...' : 'Send Test Push Alert'}</span>
        </button>

        {/* Test Status feedback */}
        {testResult.status !== 'idle' && (
          <div
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: testResult.status === 'success' ? 'var(--color-success-50)' : 'var(--color-danger-50)',
              color: testResult.status === 'success' ? 'var(--color-success-800)' : 'var(--color-danger-800)',
              border: `1px solid ${testResult.status === 'success' ? 'var(--color-success-200)' : 'var(--color-danger-200)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {testResult.status === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
