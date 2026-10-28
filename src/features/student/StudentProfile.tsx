import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StudentBottomNav } from '../../components/student/StudentBottomNav';
import { Bell, Check, LogOut, LogIn, UserPlus, User, Mail, IdCard, GraduationCap, Layers, Pencil, X, Save, HelpCircle } from 'lucide-react';
import { AuthField, AuthSelect } from '../auth/AuthComponents';
import { LEVELS, PROGRAMMES } from '../auth/SignupPage';

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
    programme: currentUser?.programme || '',
    level: currentUser?.level || '',
  });

  useEffect(() => {
    setProfile({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      studentId: currentUser?.studentId || '',
      programme: currentUser?.programme || '',
      level: currentUser?.level || '',
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
        programme: currentUser?.programme || '',
        level: currentUser?.level || '',
      });
    }
    setEditingProfile(value => !value);
    setProfileError('');
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profile.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) || !/^[A-Za-z0-9-]{4,}$/.test(profile.studentId.trim()) || !profile.programme || !profile.level) {
      setProfileError('Complete each required field with a valid name, email, and student ID.');
      return;
    }
    setSavingProfile(true);
    setProfileError('');
    try {
      await updateCurrentUser({
        name: profile.name.trim(),
        email: profile.email.trim(),
        studentId: profile.studentId.trim().toUpperCase(),
        programme: profile.programme,
        level: profile.level,
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

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [labReminders, setLabReminders] = useState(true);
  const [lateAlerts, setLateAlerts] = useState(false);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Student ID Card</h2>
            <button type="button" className="btn-secondary" onClick={toggleProfileEditor} style={{ height: '36px', padding: '0 12px', gap: '6px' }}>
              {editingProfile ? <X size={15} /> : <Pencil size={15} />}
              <span>{editingProfile ? 'Cancel' : 'Edit details'}</span>
            </button>
          </div>
          {editingProfile && (
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-brand-50)' }} noValidate>
              <AuthField id="profile-name" label="Full name" autoComplete="name" placeholder="e.g. Alex Chen" icon={<User size={18} />} value={profile.name} onChange={event => updateField('name', event.target.value)} required />
              <div className="auth-row auth-row--2">
                <AuthField id="profile-email" label="University email" type="email" autoComplete="email" inputMode="email" placeholder="you@university.edu" icon={<Mail size={18} />} value={profile.email} onChange={event => updateField('email', event.target.value)} required />
                <AuthField id="profile-student-id" label="Student ID" placeholder="STU-2024-8891" autoComplete="off" icon={<IdCard size={18} />} value={profile.studentId} onChange={event => updateField('studentId', event.target.value.toUpperCase())} required />
              </div>
              <div className="auth-row auth-row--2">
                <AuthSelect id="profile-programme" label="Programme" icon={<GraduationCap size={18} />} placeholder="Select programme" options={PROGRAMMES} value={profile.programme} onChange={event => updateField('programme', event.target.value)} required />
                <AuthSelect id="profile-level" label="Level" icon={<Layers size={18} />} placeholder="Select level" options={LEVELS} value={profile.level} onChange={event => updateField('level', event.target.value)} required />
              </div>
              {profileError && <p role="alert" style={{ color: 'var(--color-danger-700)', fontSize: '12px', margin: 0 }}>{profileError}</p>}
              <button type="submit" className="btn-primary" disabled={savingProfile} style={{ alignSelf: 'flex-start', gap: '7px' }}>
                <Save size={15} /> {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          )}
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
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name || 'Student'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (currentUser?.name || 'ST').split(' ').map(n => n[0]).join('')
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontFamily: 'var(--font-display, "Squada One", sans-serif)', fontSize: '20px', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-ink-900)', margin: 0 }}>
                  {currentUser?.name || 'Student Account'}
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
                ID: {currentUser?.studentId || 'STU-ONLINE'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                {currentUser?.email || 'student@university.edu'}
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
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser?.programme || 'Undergraduate Sciences'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Level / Year:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser?.level || 'Active Student'}</strong>
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

        {/* Support & Version */}
        <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '11px', color: 'var(--color-ink-500)' }}>
          <div>Attendance Platform MVP â€¢ University Lab Systems v1.0.0</div>
          <div style={{ marginTop: '4px' }}>Complies with Laboratory Attendance Regulation 4.2</div>
        </div>
      </div>

      <StudentBottomNav />
    </div>
  );
};

