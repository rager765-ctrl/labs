import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, MailCheck, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { AuthLayout, AuthField, friendlyAuthError } from './AuthComponents';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err: any) {
      // Don't reveal whether an account exists for this email.
      if (err?.code === 'auth/user-not-found') setSent(true);
      else setFormError(friendlyAuthError(err?.code));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="If that email has an account, a reset link is on its way.">
        <div style={{ textAlign: 'center' }}>
          <div className="auth-success-icon"><MailCheck size={30} /></div>
          <p className="text-body" style={{ color: 'var(--color-ink-700)', marginBottom: 20 }}>
            We sent instructions to <strong>{email.trim()}</strong>. The link expires in 1 hour.
            Check your spam folder if you don't see it.
          </p>
          <Link to="/login" className="btn-primary auth-submit" id="reset-back-login">Back to sign in</Link>
          <button type="button" className="auth-link" style={{ marginTop: 16, fontSize: 13 }} onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your account email and we'll send you a reset link.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="auth-alert auth-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
        <AuthField
          id="reset-email" label="Email" type="email" autoComplete="email" inputMode="email"
          placeholder="you@university.edu" icon={<Mail size={18} />}
          value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
          error={error} required autoFocus
        />
        <button type="submit" className="btn-primary auth-submit" disabled={submitting} id="reset-submit">
          {submitting ? <><span className="auth-spinner" aria-hidden="true" /> Sending…</> : 'Send reset link'}
        </button>
      </form>
      <div className="auth-footer">
        <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
};
