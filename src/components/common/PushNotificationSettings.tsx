import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  requestAndSubscribePush,
  unsubscribePush,
  getNotificationPermission,
  isPushNotificationSupported,
  FCM_SUBSCRIBED_KEY,
  FCM_TOKEN_STORAGE_KEY,
} from '../../services/fcmClientService';
import { useApp } from '../../context/AppContext';

export const PushNotificationSettings: React.FC = () => {
  const { currentUser, firebaseUser, addToast } = useApp();
  const uid = firebaseUser?.uid || currentUser?.id || '';
  const role = currentUser?.role || 'student';

  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

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
      addToast('Please sign in to manage your notification preferences.', 'info');
      return;
    }

    if (isSubscribed) {
      // Unsubscribe
      setLoading(true);
      try {
        const res = await unsubscribePush(uid);
        if (res.success) {
          setIsSubscribed(false);
          addToast('Push notifications turned off on this device.', 'info', 'Notifications Disabled');
        } else {
          addToast(res.error || 'Failed to turn off notifications.', 'error');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Subscribe with user's role preserved
      setLoading(true);
      try {
        const res = await requestAndSubscribePush(uid, role);
        setPermission(getNotificationPermission());
        if (res.success) {
          setIsSubscribed(true);
          addToast(
            'Push notifications enabled for this device.',
            'success',
            'Notifications Enabled'
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
        gap: '16px',
      }}
    >
      {/* Header with Title and Current Status */}
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
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-ink-900)' }}>
              Push Notifications
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '2px 0 0 0' }}>
              Real-time alerts on this device when sessions start or attendance updates occur.
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
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-danger-700)',
                backgroundColor: 'var(--color-danger-50)',
                padding: '3px 9px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-danger-200)',
              }}
            >
              <AlertTriangle size={12} /> Browser Blocked
            </span>
          ) : isSubscribed ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-success-700)',
                backgroundColor: 'var(--color-success-50)',
                padding: '3px 9px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-success-200)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-600)',
                }}
              />
              Active
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--color-ink-500)',
                backgroundColor: 'var(--color-ink-100)',
                padding: '3px 9px',
                borderRadius: 'var(--radius-pill)',
              }}
            >
              <BellOff size={12} /> Off
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
            {isSubscribed ? 'Device Notifications Active' : 'Allow Push Notifications'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-ink-600)', marginTop: '2px' }}>
            {isSubscribed
              ? 'This device is connected to receive instant alerts.'
              : 'Turn on to receive instant alerts when sessions start or issues are resolved.'}
          </div>
        </div>

        {/* Master Toggle Button */}
        <button
          type="button"
          role="switch"
          aria-checked={isSubscribed}
          aria-label="Toggle Push Notifications"
          disabled={loading || !supported}
          onClick={handleToggleSubscription}
          style={{
            width: '48px',
            height: '26px',
            padding: '2px',
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
            Notifications are currently blocked in your browser settings. To receive alerts, click the lock or settings icon next to the address bar, select <strong>Allow Notifications</strong>, and refresh the page.
          </div>
        </div>
      )}

      {/* Notification Preference Channels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
              Live Sessions
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '1px' }}>
              Alerts when a session starts and check-in opens
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefLiveSessions}
            onChange={(e) => {
              setPrefLiveSessions(e.target.checked);
              localStorage.setItem('attendance_pref_live', String(e.target.checked));
              addToast('Live session preference updated', 'info');
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
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
              Scheduled Sessions
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '1px' }}>
              Alerts when new lab or meeting sessions are scheduled
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
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
              Attendance Updates
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '1px' }}>
              Alerts when an attendance issue or request is resolved
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefCorrections}
            onChange={(e) => {
              setPrefCorrections(e.target.checked);
              localStorage.setItem('attendance_pref_corrections', String(e.target.checked));
              addToast('Attendance update preference updated', 'info');
            }}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)', cursor: 'pointer' }}
          />
        </label>
      </div>
    </div>
  );
};
