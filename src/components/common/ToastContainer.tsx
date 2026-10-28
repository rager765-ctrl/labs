import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => {
        let Icon = Info;
        let iconColor = 'var(--color-brand-600)';
        let borderColor = 'var(--color-line)';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'var(--color-success-700)';
          borderColor = 'var(--color-success-100)';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'var(--color-danger-700)';
          borderColor = '#FDECEE';
        }

        return (
          <div
            key={toast.id}
            className="animate-slide-up"
            style={{
              pointerEvents: 'auto',
              backgroundColor: 'var(--color-surface)',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 8px 24px rgba(17, 24, 39, 0.12)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <div style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }}>
              <Icon size={18} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-ink-900)', marginBottom: '2px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '12px', color: 'var(--color-ink-700)', lineHeight: '16px' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: 'var(--color-ink-500)',
                flexShrink: 0,
              }}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
