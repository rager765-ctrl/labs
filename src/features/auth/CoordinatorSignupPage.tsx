import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthField, AuthLayout, PasswordStrength, friendlyAuthError, passwordChecks } from './AuthComponents';

export const CoordinatorSignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';
  const navigate = useNavigate();
  const { registerCoordinatorWithInvite } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!inviteToken) {
      setFormError('This page needs a valid coordinator invitation link. Ask the coordinator who invited you for a new link.');
      return;
    }
    if (name.trim().length < 2) return setFormError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setFormError('Enter a valid email address.');
    const checks = passwordChecks(password);
    if (!checks.length || !checks.upper || !checks.number) return setFormError('Use at least 8 characters, including an uppercase letter and a number.');
    if (password !== confirmPassword) return setFormError("Passwords don't match.");

    setSubmitting(true);
    try {
      await registerCoordinatorWithInvite(inviteToken, email.trim(), password, name.trim());
      navigate('/coordinator', { replace: true });
    } catch (error: any) {
      setFormError(error?.message || friendlyAuthError(error?.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Coordinator account setup" subtitle="Create your lab coordinator account using the invitation link." >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {!inviteToken && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>Coordinator invitation link is missing. Ask your department coordinator for an invite.</span>
          </div>
        )}
        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <div className="auth-role-note">
          <span className="auth-role-note__icon"><ShieldCheck size={14} /></span>
          <span>This invitation grants access to coordinator tools and can only be used once.</span>
        </div>

        <AuthField id="coordinator-name" label="Full name" autoComplete="name" placeholder="e.g. Alex Chen" icon={<User size={18} />} value={name} onChange={event => setName(event.target.value)} required />
        <AuthField id="coordinator-email" label="Work email" type="email" autoComplete="email" placeholder="you@university.edu" icon={<Mail size={18} />} value={email} onChange={event => setEmail(event.target.value)} required />
        <AuthField id="coordinator-password" label="Password" type="password" autoComplete="new-password" placeholder="Create a password" icon={<Lock size={18} />} value={password} onChange={event => setPassword(event.target.value)} required />
        <PasswordStrength password={password} />
        <AuthField id="coordinator-confirm-password" label="Confirm password" type="password" autoComplete="new-password" placeholder="Type it again" icon={<Lock size={18} />} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required />

        <button type="submit" className="btn-primary auth-submit" disabled={submitting || !inviteToken}>
          {submitting ? <><span className="auth-spinner" aria-hidden="true" /> Creating coordinator account...</> : 'Create coordinator account'}
        </button>
      </form>
      <div className="auth-footer">
        Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
      </div>
    </AuthLayout>
  );
};
