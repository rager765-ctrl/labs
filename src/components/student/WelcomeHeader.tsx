import React from 'react';
import type { User } from '../../types';
import { Sparkles, Bell } from 'lucide-react';

interface WelcomeHeaderProps {
  user?: User | null;
  onOpenNotifications?: () => void;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ user, onOpenNotifications }) => {
  const today = new Date();
  const dateFormatted = today.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '0 0 24px 24px',
        background: 'linear-gradient(145deg, #283DB8 0%, #354BD1 60%, #5369E8 100%)',
        color: '#FFFFFF',
        padding: '20px 18px 24px 18px',
        overflow: 'hidden',
        boxShadow: '0 8px 20px rgba(40, 61, 184, 0.16)',
      }}
    >
      {/* Decorative background shapes */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100%',
          height: '100%',
          opacity: 0.12,
          pointerEvents: 'none',
        }}
        viewBox="0 0 400 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="360" cy="40" r="120" fill="#FFFFFF" />
        <circle cx="80" cy="190" r="90" fill="#FFFFFF" />
        <path d="M220 20L280 140H160L220 20Z" fill="#FFFFFF" />
        <circle cx="280" cy="130" r="30" stroke="#FFFFFF" strokeWidth="6" />
      </svg>

      {/* Top greeting bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-brand-100)',
              border: '2px solid rgba(255, 255, 255, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
              color: 'var(--color-brand-700)',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || 'User'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (user?.name || 'Student').split(' ').map(n => n[0]).join('')
            )}
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.85, fontWeight: 500 }}>
              {dateFormatted}
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display, "Squada One", sans-serif)',
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                lineHeight: '1.15',
                margin: 0,
                color: '#FFFFFF',
              }}
            >
              Hi, {(user?.name || 'Student').split(' ')[0]} 👋
            </h1>
          </div>
        </div>

        <button
          onClick={onOpenNotifications}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
      </div>

      {/* Illustration banner card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(8px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#FEF08A',
              marginBottom: '4px',
            }}
          >
            <Sparkles size={13} />
            <span>STUDENT PRACTICAL PORTAL</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: '18px', color: '#FFFFFF' }}>
            Ready for today’s lab sessions?
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
            Scan session QR codes to record your verified attendance.
          </div>
        </div>

        {/* Mini laboratory graphic */}
        <div style={{ width: '64px', height: '64px', flexShrink: 0 }}>
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <rect x="10" y="24" width="60" height="46" rx="8" fill="#FFFFFF" fillOpacity="0.25" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M22 46L32 34L44 48L58 32" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="58" cy="32" r="3" fill="#FEF08A" />
            <rect x="22" y="54" width="16" height="6" rx="3" fill="#FFFFFF" />
            <rect x="42" y="54" width="16" height="6" rx="3" fill="#FFFFFF" />
            <path d="M26 14H54" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <path d="M40 14V24" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  );
};
