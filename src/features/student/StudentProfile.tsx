import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StudentBottomNav } from '../../components/student/StudentBottomNav';
import { Bell, Shield, RefreshCw, ChevronRight, Check, LogOut, LogIn, UserPlus } from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, logoutFirebase, switchRole, resetDemoData, addToast } = useApp();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [labReminders, setLabReminders] = useState(true);
  const [lateAlerts, setLateAlerts] = useState(false);

  const handleRoleSwitch = () => {
    switchRole('coordinator');
    navigate('/coordinator');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-brand-50)',
        paddingBottom: 'calc(var(--size-nav) + 32px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 'var(--layout-content-max)',
          margin: '0 auto',
          padding: '20px var(--layout-page-inset)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '0 0 4px 0' }}>
          Student Profile
        </h1>

        {/* Student ID Card */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-brand-100)',
                color: 'var(--color-brand-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 700,
                border: '2px solid var(--color-brand-500)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                'AC'
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-ink-900)', margin: 0 }}>
                  {currentUser.name}
                </h2>
                <span
                  style={{
                    backgroundColor: 'var(--color-brand-100)',
                    color: 'var(--color-brand-700)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  STUDENT
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-brand-600)', fontWeight: 600, marginTop: '2px' }}>
                ID: {currentUser.studentId}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                {currentUser.email}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-brand-50)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Academic Programme:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser.programme}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Level / Year:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser.level}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Verification Status:</span>
              <span style={{ color: 'var(--color-success-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Check size={13} strokeWidth={2.5} /> Campus Verified
              </span>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-line)',
            padding: '16px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Bell size={18} color="var(--color-brand-600)" />
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
              Attendance Preferences (Demo)
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Lab Session Reminders</div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>Notify 15 minutes before check-in opens</div>
              </div>
              <input
                type="checkbox"
                checked={labReminders}
                onChange={(e) => {
                  setLabReminders(e.target.checked);
                  addToast('Preference updated', 'info');
                }}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Check-in Confirmation Receipts</div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>Receive instant verified digital pass</div>
              </div>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => {
                  setNotificationsEnabled(e.target.checked);
                  addToast('Preference updated', 'info');
                }}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Late Arrival Warnings</div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>Alert when 15-minute threshold is approaching</div>
              </div>
              <input
                type="checkbox"
                checked={lateAlerts}
                onChange={(e) => {
                  setLateAlerts(e.target.checked);
                  addToast('Preference updated', 'info');
                }}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-700)' }}
              />
            </label>
          </div>
        </div>

        {/* Account & Session Section */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-line)',
            padding: '16px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-ink-900)' }}>
              Account & Sign In
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
                Demo Profile
              </span>
            )}
          </div>

          {firebaseUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-700)' }}>
                Signed in as <strong>{firebaseUser.email}</strong>
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
                <LogOut size={15} />
                <span>Sign Out of Account</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '0 0 4px 0' }}>
                You are currently viewing student mode as a simulated user. Sign in to your university student account to access your live cloud records.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  to="/login"
                  className="btn-primary"
                  style={{ flex: 1, height: '40px', fontSize: '12px', textDecoration: 'none' }}
                >
                  <LogIn size={15} />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/signup"
                  className="btn-secondary"
                  style={{ flex: 1, height: '40px', fontSize: '12px', textDecoration: 'none' }}
                >
                  <UserPlus size={15} />
                  <span>Register</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Demo Controls Section */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-line)',
            padding: '16px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Shield size={18} color="var(--color-brand-600)" />
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
              Prototype Role & Data Management
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <Shield size={16} />
                <span>Switch to Coordinator View (Dr. Vance)</span>
              </div>
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset all demo attendance records and restore initial state?')) {
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
              <span>Reset All Demo Data</span>
            </button>
          </div>
        </div>

        {/* Support & Version */}
        <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '11px', color: 'var(--color-ink-500)' }}>
          <div>Attendance Platform MVP • University Lab Systems v1.0.0</div>
          <div style={{ marginTop: '4px' }}>Complies with Laboratory Attendance Regulation 4.2</div>
        </div>
      </div>

      <StudentBottomNav />
    </div>
  );
};
