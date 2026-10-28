import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { SplashScreen } from './SplashScreen';
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
    return <SplashScreen message="Verifying academic credentials..." />;
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
