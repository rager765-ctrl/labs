import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StudentBottomNav } from '../../components/student/StudentBottomNav';
import { Check, LogOut, LogIn, UserPlus, User, Mail, IdCard, Pencil, X, Save, HelpCircle } from 'lucide-react';
import { AuthField } from '../auth/AuthComponents';
import { ThemeToggle } from '../../components/common/ThemeToggle';
import { PushNotificationSettings } from '../../components/common/PushNotificationSettings';

export const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, logoutFirebase, addToast, updateCurrentUser } = useApp();

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profile, setProfile] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    studentId: currentUser?.studentId || '',
  });

  useEffect(() => {
    setProfile({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      studentId: currentUser?.studentId || '',
    });
  }, [currentUser]);

  const updateField = (field: keyof typeof profile, value: string) => {
    setProfile(previous => ({ ...previous, [field]: value }));
    setProfileError('');
  };

  const toggleProfileEditor = () => {
    if (editingProfile) {
      setProfile({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        studentId: currentUser?.studentId || '',
      });
    }
    setEditingProfile(value => !value);
    setProfileError('');
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profile.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) || !/^\d{8}$/.test(profile.studentId.trim())) {
      setProfileError('Enter a valid name, email, and 8-digit student ID.');
      return;
    }
    setSavingProfile(true);
    setProfileError('');
    try {
      await updateCurrentUser({
        name: profile.name.trim(),
        email: profile.email.trim(),
        studentId: profile.studentId.trim(),
      });
      setEditingProfile(false);
      addToast('Profile details updated', 'success');
    } catch (error: any) {
      setProfileError(error?.code === 'auth/requires-recent-login'
        ? 'Sign in again before changing your email address.'
        : error?.message || 'Unable to update your profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };



  return (
    <div
      className="app-page-shell"
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
          Attendee Profile
        </h1>

        {/* Student ID Card */}
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-line)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-ink-900)' }}>Attendee ID Card</h2>
            <button type="button" className="btn-secondary" onClick={toggleProfileEditor} style={{ height: '36px', padding: '0 12px', gap: '6px' }}>
              {editingProfile ? <X size={15} /> : <Pencil size={15} />}
              <span>{editingProfile ? 'Cancel' : 'Edit details'}</span>
            </button>
          </div>
          {editingProfile && (
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-brand-50)' }} noValidate>
              <AuthField id="profile-name" label="Full name" autoComplete="name" placeholder="e.g. Alex Chen" icon={<User size={18} />} value={profile.name} onChange={event => updateField('name', event.target.value)} required />
              <div className="auth-row auth-row--2">
                <AuthField id="profile-email" label="Email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" icon={<Mail size={18} />} value={profile.email} onChange={event => updateField('email', event.target.value)} required />
                <AuthField id="profile-student-id" label="Student ID" placeholder="e.g. 10293847 (8 digits)" inputMode="numeric" maxLength={8} autoComplete="off" icon={<IdCard size={18} />} value={profile.studentId} onChange={event => updateField('studentId', event.target.value.replace(/\D/g, '').slice(0, 8))} required />
              </div>
              {profileError && <p role="alert" style={{ color: 'var(--color-danger-700)', fontSize: '12px', margin: 0 }}>{profileError}</p>}
              <button type="submit" className="btn-primary" disabled={savingProfile} style={{ alignSelf: 'flex-start', gap: '7px' }}>
                <Save size={15} /> {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="student-avatar-box"
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
                {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name || 'Attendee'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (currentUser?.name || 'ST').split(' ').map(n => n[0]).join('')
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontFamily: 'var(--font-display, "Squada One", sans-serif)', fontSize: '20px', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-ink-900)', margin: 0 }}>
                  {currentUser?.name || 'Attendee Account'}
                </h2>
                <span
                  className="role-badge"
                  style={{
                    backgroundColor: 'var(--color-brand-100)',
                    color: 'var(--color-brand-700)',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  ATTENDEE
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-brand-600)', fontWeight: 600, marginTop: '2px' }}>
                Student ID: {currentUser?.studentId || 'NOT SET'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                {currentUser?.email || 'attendee@example.com'}
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
              <span style={{ color: 'var(--color-ink-500)' }}>Verification Status:</span>
              <span style={{ color: 'var(--color-success-700)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                <Check size={13} strokeWidth={2.5} /> Campus Verified
              </span>
            </div>
          </div>
        </div>

        <ThemeToggle />

        {/* Push Notification Settings */}
        <PushNotificationSettings />

        {/* Account & Session Section */}
        <div
          className="card"
          style={{
            backgroundColor: 'var(--color-surface)',
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
              <Link
                to="/onboarding"
                className="btn-secondary"
                style={{
                  width: '100%',
                  height: '40px',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  fontSize: '13px',
                }}
              >
                <HelpCircle size={15} />
                <span>View App Walkthrough Tour</span>
              </Link>
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
                You are viewing the attendee experience with a demo account. Sign in to access your live visit records.
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

        {/* Support & Version */}
        <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '11px', color: 'var(--color-ink-500)' }}>
          <div>Innovations Lab Visit Tracking</div>
          <div style={{ marginTop: '4px' }}>Arrival and departure records are stored securely.</div>
        </div>
      </div>

      <StudentBottomNav />
    </div>
  );
};

