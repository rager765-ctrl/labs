import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { LogOut, LogIn, User, Mail, IdCard, Building2, Award, MapPin, Pencil, X, Save, HelpCircle } from 'lucide-react';
import { AuthField, AuthSelect } from '../auth/AuthComponents';
import { DEPARTMENTS, DESIGNATIONS } from '../auth/CoordinatorSignupPage';

export const CoordinatorProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, firebaseUser, logoutFirebase, updateCurrentUser, addToast } = useApp();
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profile, setProfile] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    staffId: currentUser?.studentId || '',
    department: currentUser?.programme || '',
    designation: currentUser?.level || '',
    labRoom: currentUser?.labRoom || '',
  });

  useEffect(() => {
    setProfile({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      staffId: currentUser?.studentId || '',
      department: currentUser?.programme || '',
      designation: currentUser?.level || '',
      labRoom: currentUser?.labRoom || '',
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
        staffId: currentUser?.studentId || '',
        department: currentUser?.programme || '',
        designation: currentUser?.level || '',
        labRoom: currentUser?.labRoom || '',
      });
    }
    setEditingProfile(value => !value);
    setProfileError('');
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (profile.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()) || !/^[A-Za-z0-9-]{3,}$/.test(profile.staffId.trim()) || !profile.department || !profile.designation) {
      setProfileError('Complete each required field with a valid name, email, and staff ID.');
      return;
    }
    setSavingProfile(true);
    setProfileError('');
    try {
      await updateCurrentUser({
        name: profile.name.trim(),
        email: profile.email.trim(),
        studentId: profile.staffId.trim().toUpperCase(),
        programme: profile.department,
        level: profile.designation,
        labRoom: profile.labRoom.trim(),
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
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '0 0 4px 0' }}>
          Coordinator Profile & Account
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: '0 0 20px 0' }}>
          Laboratory supervisor credentials and account management.
        </p>

        {/* Profile Card */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px', maxWidth: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button type="button" className="btn-secondary" onClick={toggleProfileEditor} style={{ height: '36px', padding: '0 12px', gap: '6px' }}>
              {editingProfile ? <X size={15} /> : <Pencil size={15} />}
              <span>{editingProfile ? 'Cancel' : 'Edit details'}</span>
            </button>
          </div>
          {editingProfile && (
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', marginBottom: '18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-brand-50)' }} noValidate>
              <AuthField id="coordinator-profile-name" label="Full Name & Academic Title" autoComplete="name" placeholder="e.g. Dr. Elena Vance" icon={<User size={18} />} value={profile.name} onChange={event => updateField('name', event.target.value)} required />
              <div className="auth-row auth-row--2">
                <AuthField id="coordinator-profile-email" label="Faculty / University Email" type="email" autoComplete="email" inputMode="email" placeholder="e.vance@university.edu" icon={<Mail size={18} />} value={profile.email} onChange={event => updateField('email', event.target.value)} required />
                <AuthField id="coordinator-profile-staff-id" label="Staff / Faculty ID" placeholder="FAC-8042" autoComplete="off" icon={<IdCard size={18} />} value={profile.staffId} onChange={event => updateField('staffId', event.target.value.toUpperCase())} required />
              </div>
              <div className="auth-row auth-row--2">
                <AuthSelect id="coordinator-profile-department" label="School / Department" icon={<Building2 size={18} />} placeholder="Select academic department" options={DEPARTMENTS} value={profile.department} onChange={event => updateField('department', event.target.value)} required />
                <AuthSelect id="coordinator-profile-designation" label="Academic Title / Designation" icon={<Award size={18} />} placeholder="Select title" options={DESIGNATIONS} value={profile.designation} onChange={event => updateField('designation', event.target.value)} required />
              </div>
              <AuthField id="coordinator-profile-lab-room" label="Assigned Laboratory / Department Office" placeholder="e.g. Turing Hall, Advanced Databases Lab 304B" icon={<MapPin size={18} />} value={profile.labRoom} onChange={event => updateField('labRoom', event.target.value)} />
              {profileError && <p role="alert" style={{ color: 'var(--color-danger-700)', fontSize: '12px', margin: 0 }}>{profileError}</p>}
              <button type="submit" className="btn-primary" disabled={savingProfile} style={{ alignSelf: 'flex-start', gap: '7px' }}>
                <Save size={15} /> {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          )}
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
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name || 'Coordinator'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (currentUser?.name || 'EV').split(' ').map(n => n[0]).join('')
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink-900)', margin: 0 }}>
                  {currentUser?.name || 'Coordinator'}
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
                {currentUser?.level || 'Lab Coordinator'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-500)', marginTop: '2px' }}>
                Faculty ID: {currentUser?.studentId || 'FAC-ONLINE'}
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
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser?.programme || 'Computing Sciences'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Contact Email:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser?.email || 'coordinator@university.edu'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-ink-500)' }}>Assigned Facilities:</span>
              <strong style={{ color: 'var(--color-ink-900)' }}>{currentUser?.labRoom || 'Not specified'}</strong>
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
                <HelpCircle size={16} />
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
      </main>
    </div>
  );
};
