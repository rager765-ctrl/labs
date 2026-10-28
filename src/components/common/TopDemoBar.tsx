import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, UserCheck, Shield, Sparkles, Cloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthModal } from './AuthModal';

export const TopDemoBar: React.FC = () => {
  const { currentRole, switchRole, resetDemoData, currentUser, isCloudConnected, firebaseUser, logoutFirebase } = useApp();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleRoleToggle = (targetRole: 'student' | 'coordinator') => {
    if (targetRole === currentRole) return;
    switchRole(targetRole);
    navigate(targetRole === 'student' ? '/student' : '/coordinator');
  };

  return (
    <>
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

          <button
            onClick={() => setShowAuthModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(147, 197, 253, 0.3)',
              color: '#93C5FD',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
            }}
            title="Open Firebase BaaS settings"
          >
            <Cloud size={12} />
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isCloudConnected ? '#34D399' : '#FBBF24',
              }}
            />
            <span>Firebase BaaS</span>
          </button>

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

          {firebaseUser ? (
            <button
              onClick={async () => {
                await logoutFirebase();
                navigate('/login');
              }}
              title="Sign out of Firebase"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#FCA5A5',
                padding: '3px 8px',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--color-brand-600)',
                color: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '11px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign In
            </Link>
          )}

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

      {/* Firebase BaaS Cloud Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
