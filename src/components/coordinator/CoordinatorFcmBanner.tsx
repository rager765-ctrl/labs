import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Bell,
  BellOff,
  Check,
  RefreshCw,
  Activity,
  AlertTriangle,
  Radio,
  ShieldCheck,
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
import { FcmActivityModal } from './FcmActivityModal';

export const CoordinatorFcmBanner: React.FC = () => {
  const { currentUser, firebaseUser, addToast } = useApp();
  const uid = firebaseUser?.uid || currentUser?.id || '';

  const [supported, setSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);

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
      addToast('Please sign in to configure coordinator alerts.', 'info');
      return;
    }

    if (isSubscribed) {
      setLoading(true);
      try {
        const res = await unsubscribePush(uid);
        if (res.success) {
          setIsSubscribed(false);
          addToast('Coordinator push alerts turned off for this device.', 'info', 'Notifications Disabled');
        } else {
          addToast(res.error || 'Failed to unsubscribe.', 'error');
        }
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await requestAndSubscribePush(uid, 'coordinator');
        setPermission(getNotificationPermission());
        if (res.success) {
          setIsSubscribed(true);
          addToast(
            'Coordinator push notifications enabled! You will now receive instant alerts for check-ins, check-outs, and correction issues.',
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

  return (
    <>
      <section
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '22px',
          backgroundColor: 'var(--color-surface)',
          border: isSubscribed ? '1px solid var(--color-brand-200)' : '1px solid var(--color-line)',
          borderRadius: 'var(--radius-md, 10px)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Title and Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isSubscribed ? 'var(--color-brand-100)' : 'var(--color-ink-100)',
                color: isSubscribed ? 'var(--color-brand-700)' : 'var(--color-ink-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isSubscribed ? <BellRing size={20} /> : <Bell size={20} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                  Coordinator Push Notifications
                </h2>
                {permission === 'denied' ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-danger-700)',
                      backgroundColor: 'var(--color-danger-50)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--color-danger-200)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertTriangle size={12} /> Blocked in Browser
                  </span>
                ) : isSubscribed ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-success-700)',
                      backgroundColor: 'var(--color-success-50)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--color-success-200)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Radio size={12} className="pulse-dot" /> Subscribed & Active
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--color-ink-500)',
                      backgroundColor: 'var(--color-ink-100)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <BellOff size={12} /> Not Subscribed
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-ink-500)' }}>
                Receive real-time alerts when students check in/out, or submit attendance correction issues.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={isSubscribed ? 'btn-secondary' : 'btn-primary'}
              onClick={handleToggleSubscription}
              disabled={loading || !supported}
              style={{ height: '36px', fontSize: '12px', gap: '6px' }}
            >
              {loading ? (
                <RefreshCw size={13} className="spin" />
              ) : isSubscribed ? (
                <Check size={14} />
              ) : (
                <Bell size={14} />
              )}
              <span>{loading ? 'Updating...' : isSubscribed ? 'Alerts Active' : 'Enable Live Alerts'}</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowLogsModal(true)}
              style={{ height: '36px', fontSize: '12px', gap: '6px' }}
              title="Inspect recent notification activity and delivery status"
            >
              <Activity size={13} color="var(--color-brand-600)" />
              <span>Activity Logs</span>
            </button>
          </div>
        </div>

        {/* Feature bullets */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            paddingTop: '8px',
            borderTop: '1px solid var(--color-line)',
            fontSize: '11px',
            color: 'var(--color-ink-600)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--color-success-600)' }}>●</span> Live Student Arrivals & Check-ins
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: 'var(--color-brand-600)' }}>●</span> Departure & Exit Check-outs
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#EAB308' }}>●</span> Attendance Dispute & Correction Requests
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={13} color="var(--color-brand-700)" /> Server Keep-Alive Active (10m)
          </span>
        </div>
      </section>

      {/* Full FCM Activity and Diagnostics Modal */}
      <FcmActivityModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />
    </>
  );
};
