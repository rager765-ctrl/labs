import React, { useId, useState } from 'react';
import { Eye, EyeOff, AlertCircle, ShieldCheck, QrCode, BarChart3, Clock } from 'lucide-react';
import { BrandMark } from '../../components/common/BrandMark';
import './auth.css';

/* ---------------- Layout ---------------- */

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  wide?: boolean;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, wide, children }) => (
  <div className="auth-page">
    <aside className="auth-brand" aria-label="About the platform">
      <svg className="auth-brand__shapes" viewBox="0 0 400 300" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <circle cx="360" cy="40" r="120" fill="#fff" />
        <circle cx="40" cy="290" r="100" fill="#fff" />
        <circle cx="290" cy="220" r="34" stroke="#fff" strokeWidth="6" />
      </svg>

      <div className="auth-brand__logo">
        <span className="auth-brand__logo-mark"><BrandMark size={22} /></span>
        <span>LabAttend</span>
      </div>

      <div className="auth-brand__copy">
        <h2 className="auth-brand__title">Lab attendance, without the paper sheet.</h2>
        <p className="auth-brand__subtitle">
          Record Innovations Lab visits, check in to meetings, and manage your attendance history.
        </p>

        <ul className="auth-brand__points">
          <li className="auth-brand__point">
            <span className="auth-brand__point-icon"><QrCode size={16} /></span>
            Check in and out with a quick QR scan
          </li>
          <li className="auth-brand__point">
            <span className="auth-brand__point-icon"><Clock size={16} /></span>
            See your attendance history at a glance
          </li>
          <li className="auth-brand__point">
            <span className="auth-brand__point-icon"><BarChart3 size={16} /></span>
            Coordinators monitor arrivals as they happen
          </li>
        </ul>

        <svg className="auth-brand__art" viewBox="0 0 360 200" fill="none" aria-hidden="true">
          <rect x="20" y="20" width="200" height="150" rx="18" fill="#fff" fillOpacity="0.14" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" />
          <rect x="40" y="44" width="80" height="10" rx="5" fill="#fff" fillOpacity="0.7" />
          <rect x="40" y="64" width="130" height="8" rx="4" fill="#fff" fillOpacity="0.35" />
          <rect x="40" y="100" width="70" height="44" rx="10" fill="#fff" fillOpacity="0.9" />
          <rect x="120" y="100" width="70" height="44" rx="10" fill="#fff" fillOpacity="0.3" />
          <rect x="230" y="50" width="110" height="110" rx="16" fill="#fff" />
          <rect x="246" y="66" width="26" height="26" rx="3" fill="#171A2B" />
          <rect x="298" y="66" width="26" height="26" rx="3" fill="#171A2B" />
          <rect x="246" y="118" width="26" height="26" rx="3" fill="#171A2B" />
          <rect x="284" y="104" width="10" height="10" fill="#171A2B" />
          <rect x="300" y="120" width="10" height="10" fill="#171A2B" />
          <rect x="314" y="134" width="10" height="10" fill="#171A2B" />
          <circle cx="330" cy="170" r="16" fill="#FEF08A" />
          <path d="m323 170 5 5 9-10" stroke="#171A2B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </aside>

    <main className="auth-main">
      <section className={`auth-card ${wide ? 'auth-card--wide' : ''}`} aria-labelledby="auth-title">
        <header className="auth-card__header">
          <h1 id="auth-title" className="auth-card__title">{title}</h1>
          <p className="auth-card__subtitle">{subtitle}</p>
        </header>
        {children}
      </section>
    </main>
  </div>
);

/* ---------------- Field ---------------- */

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
  labelAction?: React.ReactNode;
}

export const AuthField: React.FC<FieldProps> = ({ label, icon, error, hint, labelAction, required, type, id, ...rest }) => {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={`auth-field ${error ? 'auth-field--error' : ''}`}>
      <label htmlFor={inputId} className="auth-field__label">
        <span>
          {label}
          {required && <span className="auth-field__required" aria-hidden="true">*</span>}
        </span>
        {labelAction}
      </label>
      <div className="auth-field__control">
        {icon && <span className="auth-field__icon">{icon}</span>}
        <input
          id={inputId}
          type={isPassword && visible ? 'text' : type}
          className={`auth-input ${isPassword ? 'auth-input--has-toggle' : ''}`}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-field__toggle"
            onClick={() => setVisible(v => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="auth-field__error" role="alert">
          <AlertCircle size={12} /> {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="auth-field__hint">{hint}</span>
      ) : null}
    </div>
  );
};

/* ---------------- Select ---------------- */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const AuthSelect: React.FC<SelectProps> = ({ label, icon, error, options, placeholder, required, id, ...rest }) => {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className={`auth-field ${error ? 'auth-field--error' : ''}`}>
      <label htmlFor={selectId} className="auth-field__label">
        <span>
          {label}
          {required && <span className="auth-field__required" aria-hidden="true">*</span>}
        </span>
      </label>
      <div className="auth-field__control">
        {icon && <span className="auth-field__icon">{icon}</span>}
        <select
          id={selectId}
          className="auth-select"
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          required={required}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {error && (
        <span id={`${selectId}-error`} className="auth-field__error" role="alert">
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  );
};

/* ---------------- Password strength ---------------- */

export const passwordChecks = (pw: string) => ({
  length: pw.length >= 8,
  upper: /[A-Z]/.test(pw),
  number: /\d/.test(pw),
  symbol: /[^A-Za-z0-9]/.test(pw),
});

export const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const checks = passwordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;
  const levels = [
    { label: 'Too weak', color: 'var(--color-danger-700)' },
    { label: 'Weak', color: 'var(--color-danger-700)' },
    { label: 'Fair', color: 'var(--color-warning-700)' },
    { label: 'Good', color: 'var(--color-brand-600)' },
    { label: 'Strong', color: 'var(--color-success-700)' },
  ];
  const level = levels[score];

  if (!password) return null;

  return (
    <div className="auth-strength" aria-live="polite">
      <div className="auth-strength__bars" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <span key={i} className="auth-strength__bar" style={{ backgroundColor: i < score ? level.color : undefined }} />
        ))}
      </div>
      <span className="auth-strength__label">
        Password strength: <strong style={{ color: level.color }}>{level.label}</strong>
      </span>
      <ul className="auth-checklist">
        {[
          ['length', 'At least 8 characters'],
          ['upper', 'One uppercase letter'],
          ['number', 'One number'],
          ['symbol', 'One symbol'],
        ].map(([key, text]) => {
          const met = checks[key as keyof typeof checks];
          return (
            <li key={key} className={`auth-checklist__item ${met ? 'auth-checklist__item--met' : ''}`}>
              {met ? <ShieldCheck size={12} /> : <span aria-hidden="true">•</span>}
              <span>{text}</span>
              <span className="sr-only">{met ? '(met)' : '(not met)'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/* ---------------- Firebase error messages ---------------- */

export const friendlyAuthError = (code?: string): string => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 8 characters).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes or reset your password.';
    case 'auth/network-request-failed':
      return "Can't reach the server. Check your connection and try again.";
    case 'auth/operation-not-allowed':
      return 'Email sign-in is not enabled for this project yet.';
    default:
      return 'Something went wrong. Please try again.';
  }
};
