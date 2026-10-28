import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, IdCard, GraduationCap, Layers, AlertCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthLayout, AuthField, AuthSelect, PasswordStrength, passwordChecks, friendlyAuthError } from './AuthComponents';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROGRAMMES = [
  { value: 'B.Sc. Computer Science', label: 'B.Sc. Computer Science' },
  { value: 'B.Sc. Information Technology', label: 'B.Sc. Information Technology' },
  { value: 'B.Eng. Electrical Engineering', label: 'B.Eng. Electrical Engineering' },
  { value: 'B.Sc. Data Science', label: 'B.Sc. Data Science' },
];

const LEVELS = [
  { value: 'Level 100', label: 'Level 100 (Year 1)' },
  { value: 'Level 200', label: 'Level 200 (Year 2)' },
  { value: 'Level 300', label: 'Level 300 (Year 3)' },
  { value: 'Level 400', label: 'Level 400 (Year 4)' },
];

type FormState = {
  name: string;
  email: string;
  studentId: string;
  programme: string;
  level: string;
  password: string;
  confirm: string;
  agree: boolean;
};

type Errors = Partial<Record<keyof FormState, string>>;

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerWithEmail } = useApp();

  const [form, setForm] = useState<FormState>({
    name: '', email: '', studentId: '', programme: '', level: '', password: '', confirm: '', agree: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!/^[A-Za-z0-9-]{4,}$/.test(form.studentId.trim())) e.studentId = 'Enter your student ID (e.g. STU-2024-8891).';
    if (!form.programme) e.programme = 'Choose your programme.';
    if (!form.level) e.level = 'Choose your level.';
    const pc = passwordChecks(form.password);
    if (!pc.length) e.password = 'Use at least 8 characters.';
    else if (!(pc.upper && pc.number)) e.password = 'Add an uppercase letter and a number.';
    if (form.confirm !== form.password) e.confirm = "Passwords don't match.";
    if (!form.agree) e.agree = 'You need to accept the attendance policy to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Self sign-up always creates a student. Coordinators are invited separately.
      await registerWithEmail(form.email.trim(), form.password, form.name.trim(), 'student', form.studentId.trim());
      // TODO(RBAC): route to /verify-email once email verification is implemented.
      navigate('/student', { replace: true });
    } catch (err: any) {
      setFormError(friendlyAuthError(err?.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout wide title="Create your student account" subtitle="It takes about a minute. You'll use this to check in to lab sessions.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <p className="auth-section-label">About you</p>

        <AuthField
          id="signup-name" label="Full name" autoComplete="name" placeholder="e.g. Alex Chen"
          icon={<User size={18} />} value={form.name} onChange={e => set('name', e.target.value)}
          error={errors.name} required
        />

        <div className="auth-row auth-row--2">
          <AuthField
            id="signup-email" label="University email" type="email" autoComplete="email" inputMode="email"
            placeholder="you@university.edu" icon={<Mail size={18} />}
            value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} required
          />
          <AuthField
            id="signup-student-id" label="Student ID" placeholder="STU-2024-8891" autoComplete="off"
            icon={<IdCard size={18} />} value={form.studentId}
            onChange={e => set('studentId', e.target.value.toUpperCase())} error={errors.studentId} required
          />
        </div>

        <div className="auth-row auth-row--2">
          <AuthSelect
            id="signup-programme" label="Programme" icon={<GraduationCap size={18} />}
            placeholder="Select programme" options={PROGRAMMES}
            value={form.programme} onChange={e => set('programme', e.target.value)} error={errors.programme} required
          />
          <AuthSelect
            id="signup-level" label="Level" icon={<Layers size={18} />}
            placeholder="Select level" options={LEVELS}
            value={form.level} onChange={e => set('level', e.target.value)} error={errors.level} required
          />
        </div>

        <p className="auth-section-label">Secure your account</p>

        <AuthField
          id="signup-password" label="Password" type="password" autoComplete="new-password"
          placeholder="Create a password" icon={<Lock size={18} />}
          value={form.password} onChange={e => set('password', e.target.value)} error={errors.password} required
        />
        <PasswordStrength password={form.password} />

        <AuthField
          id="signup-confirm" label="Confirm password" type="password" autoComplete="new-password"
          placeholder="Type it again" icon={<Lock size={18} />}
          value={form.confirm} onChange={e => set('confirm', e.target.value)} error={errors.confirm} required
        />

        <div>
          <label className="auth-checkbox" htmlFor="signup-agree">
            <input
              id="signup-agree" type="checkbox" checked={form.agree}
              onChange={e => set('agree', e.target.checked)}
              aria-invalid={!!errors.agree} aria-describedby={errors.agree ? 'signup-agree-error' : undefined}
            />
            <span>I understand my check-ins are recorded and reviewed under the lab attendance policy.</span>
          </label>
          {errors.agree && (
            <span id="signup-agree-error" className="auth-field__error" role="alert" style={{ marginTop: 6 }}>
              <AlertCircle size={12} /> {errors.agree}
            </span>
          )}
        </div>

        <button type="submit" className="btn-primary auth-submit" disabled={submitting} id="signup-submit">
          {submitting ? <><span className="auth-spinner" aria-hidden="true" /> Creating account…</> : 'Create account'}
        </button>

        <div className="auth-role-note">
          <span className="auth-role-note__icon"><ShieldCheck size={14} /></span>
          <span>
            Student registration is strictly for enrolled students to verify attendance in scheduled lab sessions.
          </span>
        </div>
      </form>

      <div className="auth-footer">
        Already have an account? <Link to="/login" className="auth-link" id="signup-to-login">Sign in</Link>
      </div>
    </AuthLayout>
  );
};
