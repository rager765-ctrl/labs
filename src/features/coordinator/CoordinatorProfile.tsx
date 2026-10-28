import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { RefreshCw, UserCheck, ChevronRight, LogOut, LogIn } from 'lucide-react';

export const CoordinatorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, logoutFirebase, switchRole, resetDemoData } = useApp();

  const handleRoleSwitch = () => {
    switchRole('student');
    navigate('/student');
  };

  return (
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '0 0 4px 0' }}>
          Coordinator Profile & Demo Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: '0 0 20px 0' }}>
          Laboratory supervisor credentials and prototype testing controls.
        </p>

        {/* Profile Card */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
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
                fontSize: '22px',
                fontWeight: 700,
                border: '2px solid var(--color-brand-600)',
                overflow: 'hidden',
              }}
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                'EV'
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink-900)', margin: 0 }}>
                  {currentUser.name}
                </h2>
                <span
                  style={{
                    backgroundColor: 'var(--color-brand-100)',
                    color: 'var(--color-brand-700)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  FACULTY
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-brand-600)', fontWeight: 600, marginTop: '2px' }}>
                {currentUser.level}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                Faculty ID: {currentUser.studentId}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-brand-50)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Department:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser.programme}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Contact Email:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser.email}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Assigned Facilities:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>Turing Hall Labs, Lovelace 201A</strong>
            </div>
          </div>
        </div>

        {/* Account & Session Section */}
        <div className="card" style={{ padding: '20px', marginBottom: '20px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-ink-900)' }}>
              Coordinator Account & Authentication
            </h2>
            {firebaseUser ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-success-700)',
                  backgroundColor: 'var(--color-success-100)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                Cloud Synced
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-ink-500)',
                  backgroundColor: 'var(--color-brand-50)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                Demo Coordinator
              </span>
            )}
          </div>

          {firebaseUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-ink-700)' }}>
                Authenticated as: <strong>{firebaseUser.email}</strong>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await logoutFirebase();
                  navigate('/login');
                }}
                className="btn-secondary"
                style={{
                  width: '100%',
                  height: '40px',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--color-danger-700)',
                }}
              >
                <LogOut size={16} />
                <span>Sign Out of Faculty Account</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: 0 }}>
                You are currently previewing coordinator actions with the local demo profile (Dr. Elena Vance). Sign in to your coordinator account to manage live classes in the cloud.
              </p>
              <Link
                to="/login"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  height: '40px',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                <LogIn size={16} />
                <span>Sign In to Coordinator Account</span>
              </Link>
            </div>
          )}
        </div>

        {/* Demo Switcher & Reset */}
        <div className="card" style={{ padding: '20px', maxWidth: '600px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
            Prototype Simulation Controls
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '0 0 16px 0' }}>
            Easily toggle between Student and Coordinator perspectives or reset local demo records.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={handleRoleSwitch}
              className="btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'space-between',
                height: '46px',
                padding: '0 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} />
                <span>Switch to Student View (Alex Chen)</span>
              </div>
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset all demo attendance records and restore default clean data?')) {
                  resetDemoData();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '42px',
                backgroundColor: '#FDECEE',
                color: 'var(--color-danger-700)',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
              <span>Reset All Demo Data to Defaults</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
