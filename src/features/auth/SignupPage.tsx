import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, IdCard, AlertCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthLayout, AuthField, PasswordStrength, passwordChecks, friendlyAuthError } from './AuthComponents';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
  name: string;
  email: string;
  studentId: string;
  password: string;
  confirm: string;
  agree: boolean;
};

type Errors = Partial<Record<keyof FormState, string>>;

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerWithEmail } = useApp();

  const [form, setForm] = useState<FormState>({
    name: '', email: '', studentId: '', password: '', confirm: '', agree: false,
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
    if (!/^[A-Za-z0-9-]{4,}$/.test(form.studentId.trim())) e.studentId = 'Enter a valid member or visitor ID.';
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
      // Self sign-up creates an attendee account. Coordinators are invited separately.
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
    <AuthLayout wide title="Create your attendee account" subtitle="Use your account to check in and out of Innovations Lab sessions.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <p className="auth-section-label">Attendee details</p>

        <AuthField
          id="signup-name" label="Full name" autoComplete="name" placeholder="e.g. Alex Chen"
          icon={<User size={18} />} value={form.name} onChange={e => set('name', e.target.value)}
          error={errors.name} required
        />

        <div className="auth-row auth-row--2">
          <AuthField
            id="signup-email" label="Email" type="email" autoComplete="email" inputMode="email"
            placeholder="you@example.com" icon={<Mail size={18} />}
            value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} required
          />
          <AuthField
            id="signup-student-id" label="Member / Visitor ID" placeholder="e.g. LAB-2048" autoComplete="off"
            icon={<IdCard size={18} />} value={form.studentId}
            onChange={e => set('studentId', e.target.value.toUpperCase())} error={errors.studentId} required
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
            <span>I understand my arrivals and departures are recorded under the Innovations Lab attendance policy.</span>
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
            Attendee accounts are used to verify who enters and leaves the Innovations Lab during scheduled sessions.
          </span>
        </div>
      </form>

      <div className="auth-footer">
        Already have an account? <Link to="/login" className="auth-link" id="signup-to-login">Sign in</Link>
      </div>
    </AuthLayout>
  );
};
