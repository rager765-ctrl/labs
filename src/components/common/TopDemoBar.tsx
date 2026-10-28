import React from 'react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, UserCheck, Shield, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TopDemoBar: React.FC = () => {
  const { currentRole, switchRole, resetDemoData, currentUser } = useApp();
  const navigate = useNavigate();

  const handleRoleToggle = (targetRole: 'student' | 'coordinator') => {
    if (targetRole === currentRole) return;
    switchRole(targetRole);
    navigate(targetRole === 'student' ? '/student' : '/coordinator');
  };

  return (
    <header
      style={{
        backgroundColor: '#1E293B',
        color: '#F8FAFC',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        fontSize: '12px',
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            fontWeight: 600,
            fontSize: '11px',
            letterSpacing: '0.02em',
          }}
        >
          <Sparkles size={12} color="#93C5FD" />
          <span>PROTOTYPE DEMO</span>
        </div>
        <span style={{ color: '#94A3B8', fontSize: '11px' }}>
          Active: <strong style={{ color: '#FFFFFF' }}>{currentUser.name}</strong> ({currentRole === 'student' ? 'Student' : 'Coordinator'})
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            padding: '2px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <button
            onClick={() => handleRoleToggle('student')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: currentRole === 'student' ? 'var(--color-brand-600)' : 'transparent',
              color: currentRole === 'student' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <UserCheck size={12} />
            <span>Student</span>
          </button>
          <button
            onClick={() => handleRoleToggle('coordinator')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: currentRole === 'coordinator' ? 'var(--color-brand-600)' : 'transparent',
              color: currentRole === 'coordinator' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            <Shield size={12} />
            <span>Coordinator</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset all demo attendance records and restore original state?')) {
              resetDemoData();
            }
          }}
          title="Reset demo data to initial state"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#CBD5E1',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          <RefreshCw size={11} />
          <span style={{ fontSize: '11px' }}>Reset Data</span>
        </button>
      </div>
    </header>
  );
};
