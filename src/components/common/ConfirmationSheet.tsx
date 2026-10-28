import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  details?: {
    label: string;
    value: string;
  }[];
  primaryActionText?: string;
  onPrimaryAction?: () => void;
}

export const ConfirmationSheet: React.FC<ConfirmationSheetProps> = ({
  isOpen,
  onClose,
  type = 'success',
  title,
  message,
  details = [],
  primaryActionText = 'Done',
  onPrimaryAction,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let Icon = CheckCircle2;
  let iconBg = 'var(--color-success-100)';
  let iconColor = 'var(--color-success-700)';

  if (type === 'warning') {
    Icon = AlertTriangle;
    iconBg = 'var(--color-warning-100)';
    iconColor = 'var(--color-warning-700)';
  } else if (type === 'error') {
    Icon = XCircle;
    iconBg = '#FDECEE';
    iconColor = 'var(--color-danger-700)';
  } else if (type === 'info') {
    Icon = Info;
    iconBg = 'var(--color-brand-100)';
    iconColor = 'var(--color-brand-700)';
  }

  const handleAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-overlay)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 12px calc(12px + env(safe-area-inset-bottom, 0px)) 12px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 'var(--layout-content-max)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sheet)',
          padding: '24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-sheet-title"
      >
        {/* Close X button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--color-ink-500)',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Close sheet"
        >
          <X size={18} />
        </button>

        {/* Status Illustration Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: iconBg,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Icon size={34} strokeWidth={2.4} />
        </div>

        {/* Title & Message */}
        <h3
          id="confirmation-sheet-title"
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-ink-900)',
            lineHeight: '24px',
            marginBottom: '8px',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-ink-700)',
            lineHeight: '19px',
            maxWidth: '320px',
            marginBottom: details.length > 0 ? '16px' : '24px',
          }}
        >
          {message}
        </p>

        {/* Metadata Details table if any */}
        {details.length > 0 && (
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--color-brand-50)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              textAlign: 'left',
              fontSize: '12px',
            }}
          >
            {details.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--color-ink-500)' }}>{d.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--color-ink-900)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Single Primary Action Button */}
        <button
          onClick={handleAction}
          className="btn-primary"
          style={{
            width: '100%',
            height: '46px',
            fontSize: '14px',
          }}
        >
          {primaryActionText}
        </button>
      </div>
    </div>
  );
};
