import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Cloud, LogOut, CheckCircle2 } from 'lucide-react';
import type { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { firebaseUser, currentUser, loginWithEmail, registerWithEmail, logoutFirebase, syncToCloud } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password, name.trim(), role, studentId.trim());
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    await syncToCloud();
    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--color-overlay)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-slide-up"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: 'var(--shadow-sheet)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-ink-500)',
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-brand-100)',
              color: 'var(--color-brand-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Cloud size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--color-ink-900)' }}>
              Firebase BaaS Cloud
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--color-brand-600)', fontWeight: 600 }}>
              Firestore & Authentication (attendance-9a7f5)
            </div>
          </div>
        </div>

        {/* If already authenticated via Firebase */}
        {firebaseUser ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-success-100)',
                color: 'var(--color-success-700)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} />
              <span>Connected to Firebase as <strong>{firebaseUser.email}</strong></span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-ink-700)' }}>
              Active Profile: <strong>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
            </div>

            <button
              onClick={handleSync}
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', height: '42px', fontSize: '13px' }}
            >
              <Cloud size={16} />
              <span>{loading ? 'Syncing...' : 'Sync Local Data to Cloud Firestore'}</span>
            </button>

            <button
              onClick={async () => {
                await logoutFirebase();
                onClose();
              }}
              className="btn-secondary"
              style={{ width: '100%', height: '40px', fontSize: '13px', color: 'var(--color-danger-700)' }}
            >
              <LogOut size={16} />
              <span>Sign Out of Firebase</span>
            </button>
          </div>
        ) : (
          /* Sign In / Sign Up Form */
          <div>
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--color-brand-50)',
                padding: '3px',
                borderRadius: 'var(--radius-pill)',
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: mode === 'signin' ? 'var(--color-brand-700)' : 'transparent',
                  color: mode === 'signin' ? '#FFFFFF' : 'var(--color-ink-700)',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '6px',
                  borderRadius: 'var(--radius-pill)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: mode === 'signup' ? 'var(--color-brand-700)' : 'transparent',
                  color: mode === 'signup' ? '#FFFFFF' : 'var(--color-ink-700)',
                }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mode === 'signup' && (
                <>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Chen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-line)',
                        padding: '0 10px',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-line)',
                        padding: '0 10px',
                        fontSize: '13px',
                      }}
                    >
                      <option value="student">Student</option>
                      <option value="coordinator">Lab Coordinator</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      University ID (Student or Faculty)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. STU-2024-8891"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-line)',
                        padding: '0 10px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="university.student@edu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-line)',
                    padding: '0 10px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-line)',
                    padding: '0 10px',
                    fontSize: '13px',
                  }}
                />
              </div>

              {errorMsg && (
                <div style={{ fontSize: '11px', color: 'var(--color-danger-700)', backgroundColor: '#FDECEE', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', height: '42px', fontSize: '13px', marginTop: '6px' }}
              >
                {loading ? 'Connecting...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-line)', textAlign: 'center' }}>
              <button
                onClick={handleSync}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand-600)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Cloud size={13} />
                <span>Sync Current Sessions to Firestore Cloud</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
