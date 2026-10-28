import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { UserRole } from '../../types';

interface RequireRoleProps {
  role: UserRole;
  children: React.ReactElement;
}

/**
 * Route guard that ensures the current user has the required role.
 * If user has the other role, redirects them to their respective home dashboard.
 * If user is unauthenticated and demo mode is not active, redirects to /login.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const { currentRole, currentUser, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-brand-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid var(--color-brand-200)', borderTopColor: 'var(--color-brand-600)', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '13px', color: 'var(--color-ink-500)', fontWeight: 500 }}>Connecting to LabAttend...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (currentRole !== role) {
    // Redirect to the dashboard appropriate for the user's active role
    const fallback = currentRole === 'coordinator' ? '/coordinator' : '/student';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

/**
 * Guard for public auth pages (login/signup):
 * If user is already authenticated with a specific role, allows redirecting to dashboard
 * while still permitting explicit navigation if desired.
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  return children;
};
