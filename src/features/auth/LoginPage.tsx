import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthLayout, AuthField, friendlyAuthError } from './AuthComponents';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithEmail } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const profile = await loginWithEmail(email.trim(), password);
      const fromPath = (location.state as any)?.from?.pathname;
      const targetDefault = profile.role === 'coordinator' ? '/coordinator' : '/student';
      // If previous path matched role, return there; otherwise go to role dashboard
      const shouldReturnToFrom = fromPath && fromPath.startsWith(`/${profile.role}`);
      navigate(shouldReturnToFrom ? fromPath : targetDefault, { replace: true });
    } catch (err: any) {
      setFormError(friendlyAuthError(err?.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see your lab sessions and attendance.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <AuthField
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@university.edu"
          icon={<Mail size={18} />}
          value={email}
          onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: undefined })); }}
          error={errors.email}
          required
        />

        <AuthField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          icon={<Lock size={18} />}
          value={password}
          onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: undefined })); }}
          error={errors.password}
          labelAction={<Link to="/forgot-password" className="auth-link" style={{ fontSize: 12 }}>Forgot password?</Link>}
          required
        />

        <button type="submit" className="btn-primary auth-submit" disabled={submitting} id="login-submit">
          {submitting ? <><span className="auth-spinner" aria-hidden="true" /> Signing in…</> : 'Sign in'}
        </button>

        <div className="auth-role-note">
          <span className="auth-role-note__icon"><Info size={14} /></span>
          <span>
            One sign-in for everyone. You'll go straight to your <strong>student</strong> or{' '}
            <strong>coordinator</strong> dashboard based on your account.
          </span>
        </div>
      </form>

      <div className="auth-footer">
        New student? <Link to="/signup" className="auth-link" id="login-to-signup">Create an account</Link>
      </div>
    </AuthLayout>
  );
};
