import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useApp();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-brand-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <div
        className="card animate-slide-up"
        style={{
          padding: '36px 24px',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-brand-100)',
            color: 'var(--color-brand-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <Compass size={32} />
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--color-ink-900)' }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', lineHeight: '18px', margin: '0 0 20px 0' }}>
          The Innovations Lab page you requested could not be found.
        </p>

        <button
          onClick={() => navigate(currentRole === 'student' ? '/student' : '/coordinator')}
          className="btn-primary"
          style={{ width: '100%', height: '44px' }}
        >
          <ArrowLeft size={16} />
          <span>Return to {currentRole === 'student' ? 'Attendee Dashboard' : 'Coordinator Dashboard'}</span>
        </button>
      </div>
    </div>
  );
};
