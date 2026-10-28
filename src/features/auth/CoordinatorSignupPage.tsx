import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Lock,
  Mail,
  User,
  Shield,
  ShieldCheck,
  IdCard,
  Building2,
  GraduationCap,
  Award,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AuthField,
  AuthSelect,
  AuthLayout,
  PasswordStrength,
  friendlyAuthError,
  passwordChecks,
} from './AuthComponents';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEPARTMENTS = [
  { value: 'School of Computing & Data Science', label: 'School of Computing & Data Science' },
  { value: 'Department of Computer Science', label: 'Department of Computer Science' },
  { value: 'Department of Information Technology', label: 'Department of Information Technology' },
  { value: 'Department of Electrical & Electronic Engineering', label: 'Department of Electrical & Electronic Engineering' },
  { value: 'Department of Mathematical Sciences', label: 'Department of Mathematical Sciences' },
  { value: 'Faculty of Engineering & Technology', label: 'Faculty of Engineering & Technology' },
];

const DESIGNATIONS = [
  { value: 'Senior Lab Coordinator', label: 'Senior Lab Coordinator' },
  { value: 'Lead Course Coordinator', label: 'Lead Course Coordinator' },
  { value: 'Laboratory Instructor / TA', label: 'Laboratory Instructor / TA' },
  { value: 'Lecturer / Assistant Professor', label: 'Lecturer / Assistant Professor' },
  { value: 'Head of Laboratory Operations', label: 'Head of Laboratory Operations' },
];

export const CoordinatorSignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteTokenFromUrl = searchParams.get('invite') || '';
  const navigate = useNavigate();
  const { registerCoordinator } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0].value);
  const [designation, setDesignation] = useState(DESIGNATIONS[0].value);
  const [inviteToken] = useState(inviteTokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = 'Enter your full name.';
    if (!EMAIL_RE.test(email.trim())) nextErrors.email = 'Enter a valid academic or work email.';
    if (!/^[A-Za-z0-9-]{3,}$/.test(staffId.trim())) nextErrors.staffId = 'Enter your staff/faculty ID (e.g. FAC-8042).';
    if (!department) nextErrors.department = 'Select your department.';
    if (!designation) nextErrors.designation = 'Select your academic title / role.';

    const checks = passwordChecks(password);
    if (!checks.length || !checks.upper || !checks.number) {
      nextErrors.password = 'Use at least 8 characters, including an uppercase letter and a number.';
    }
    if (password !== confirmPassword) {
      nextErrors.confirm = "Passwords don't match.";
    }
    if (!agree) {
      nextErrors.agree = 'You must confirm laboratory oversight agreement.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await registerCoordinator(
        email.trim(),
        password,
        name.trim(),
        staffId.trim().toUpperCase(),
        department,
        designation,
        inviteToken.trim() || undefined
      );
      navigate('/coordinator', { replace: true });
    } catch (error: any) {
      setFormError(error?.message || friendlyAuthError(error?.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Coordinator Portal Registration"
      subtitle="Create a verified faculty coordinator account to supervise lab sessions and enforce attendance."
      wide
    >
      {/* Role Switcher Tabs */}
      <nav className="auth-role-tabs" aria-label="Account Type Selection">
        <Link to="/signup" className="auth-role-tab" id="switch-to-student-signup">
          <GraduationCap size={16} />
          <span>Student Account</span>
        </Link>
        <span className="auth-role-tab auth-role-tab--active" aria-current="page" id="active-coordinator-tab">
          <Shield size={16} />
          <span>Faculty Coordinator</span>
        </span>
      </nav>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div className="auth-badge auth-badge--coordinator">
            <ShieldCheck size={13} />
            <span>Coordinator Status (Supervisor)</span>
          </div>
          {inviteTokenFromUrl && (
            <div className="auth-badge auth-badge--verified" title="Department invitation token attached">
              <Sparkles size={12} />
              <span>Invite Attached</span>
            </div>
          )}
        </div>

        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <AuthField
          id="coordinator-name"
          label="Full Name & Title"
          autoComplete="name"
          placeholder="e.g. Dr. Elena Vance"
          icon={<User size={18} />}
          value={name}
          onChange={e => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }}
          error={errors.name}
          required
        />

        <div className="auth-row auth-row--2">
          <AuthField
            id="coordinator-email"
            label="Faculty / University Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="e.vance@university.edu"
            icon={<Mail size={18} />}
            value={email}
            onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
            error={errors.email}
            required
          />

          <AuthField
            id="coordinator-staff-id"
            label="Staff / Faculty ID"
            placeholder="FAC-8042"
            autoComplete="off"
            icon={<IdCard size={18} />}
            value={staffId}
            onChange={e => { setStaffId(e.target.value.toUpperCase()); if (errors.staffId) setErrors(prev => ({ ...prev, staffId: '' })); }}
            error={errors.staffId}
            required
          />
        </div>

        <div className="auth-row auth-row--2">
          <AuthSelect
            id="coordinator-department"
            label="School / Department"
            icon={<Building2 size={18} />}
            placeholder="Select academic department"
            options={DEPARTMENTS}
            value={department}
            onChange={e => { setDepartment(e.target.value); if (errors.department) setErrors(prev => ({ ...prev, department: '' })); }}
            error={errors.department}
            required
          />

          <AuthSelect
            id="coordinator-designation"
            label="Academic Title / Designation"
            icon={<Award size={18} />}
            placeholder="Select title"
            options={DESIGNATIONS}
            value={designation}
            onChange={e => { setDesignation(e.target.value); if (errors.designation) setErrors(prev => ({ ...prev, designation: '' })); }}
            error={errors.designation}
            required
          />
        </div>

        <p className="auth-section-label">Account Security</p>

        <AuthField
          id="coordinator-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          icon={<Lock size={18} />}
          value={password}
          onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
          error={errors.password}
          required
        />
        <PasswordStrength password={password} />

        <AuthField
          id="coordinator-confirm-password"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          icon={<Lock size={18} />}
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); if (errors.confirm) setErrors(prev => ({ ...prev, confirm: '' })); }}
          error={errors.confirm}
          required
        />

        <div>
          <label className="auth-checkbox" htmlFor="coordinator-agree">
            <input
              id="coordinator-agree"
              type="checkbox"
              checked={agree}
              onChange={e => { setAgree(e.target.checked); if (errors.agree) setErrors(prev => ({ ...prev, agree: '' })); }}
              aria-invalid={!!errors.agree}
            />
            <span>
              I confirm that I am an authorized academic faculty or laboratory coordinator, and I agree to manage student records and sessions in compliance with academic policies.
            </span>
          </label>
          {errors.agree && (
            <span className="auth-field__error" role="alert" style={{ marginTop: 6 }}>
              <AlertCircle size={12} /> {errors.agree}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary auth-submit"
          disabled={submitting}
          id="coordinator-submit"
          style={{ height: '46px', fontSize: '14px', fontWeight: 600 }}
        >
          {submitting ? (
            <>
              <span className="auth-spinner" aria-hidden="true" /> Setting up coordinator account…
            </>
          ) : (
            'Complete Coordinator Registration'
          )}
        </button>

        <div className="auth-role-note">
          <span className="auth-role-note__icon">
            <ShieldCheck size={16} />
          </span>
          <span>
            Signing up here registers your account with <strong>Coordinator status</strong>, granting full access to live session generation, QR scanning enforcement, and laboratory attendance management.
          </span>
        </div>
      </form>

      <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          Already have an account? <Link to="/login" className="auth-link" id="coordinator-to-login">Sign in here</Link>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-ink-400)' }}>
          Are you a student? <Link to="/signup" className="auth-link">Register for a student account</Link>
        </div>
      </div>
    </AuthLayout>
  );
};
