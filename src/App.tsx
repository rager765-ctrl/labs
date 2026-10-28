import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/common/ToastContainer';
import { NotFound } from './components/common/NotFound';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Auth screens
import { LoginPage } from './features/auth/LoginPage';
import { SignupPage } from './features/auth/SignupPage';
import { CoordinatorSignupPage } from './features/auth/CoordinatorSignupPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { RequireRole } from './components/common/RouteGuards';

// Student screens
import { StudentHome } from './features/student/StudentHome';
import { ScannerView } from './features/student/ScannerView';
import { StudentHistory } from './features/student/StudentHistory';
import { StudentSessionDetail } from './features/student/StudentSessionDetail';
import { StudentProfile } from './features/student/StudentProfile';

// Coordinator screens
import { CoordinatorDashboard } from './features/coordinator/CoordinatorDashboard';
import { CoordinatorSessionList } from './features/coordinator/CoordinatorSessionList';
import { CreateSessionForm } from './features/coordinator/CreateSessionForm';
import { CoordinatorSessionLive } from './features/coordinator/CoordinatorSessionLive';
import { CoordinatorAttendanceManagement } from './features/coordinator/CoordinatorAttendanceManagement';
import { CoordinatorReports } from './features/coordinator/CoordinatorReports';
import { CoordinatorProfile } from './features/coordinator/CoordinatorProfile';

// Splash and Onboarding
import { SplashScreen } from './components/common/SplashScreen';
import { OnboardingScreen, ONBOARDING_COMPLETED_KEY } from './features/onboarding/OnboardingScreen';

const RootLanding: React.FC = () => {
  const { currentRole, currentUser, authLoading } = useApp();
  const [minSplashDone, setMinSplashDone] = React.useState<boolean>(false);

  // Check if visitor has previously completed or skipped onboarding
  const hasSeenOnboarding = React.useMemo(() => {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  }, []);

  // Ensure a smooth presentation minimum (~900ms) to avoid visual jitter
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashDone(true);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  // For both old and new users during startup, show the branded splash screen with the 3 loading dots
  if (authLoading || !minSplashDone) {
    return <SplashScreen message="Initializing university practical session..." />;
  }

  // If user is new (has not seen onboarding and is not authenticated), show the onboarding walkthrough
  if (!hasSeenOnboarding && !currentUser) {
    return <OnboardingScreen />;
  }

  // For old users (or authenticated returning users), jump straight to active dashboard or login
  if (currentUser) {
    return <Navigate to={currentRole === 'coordinator' ? '/coordinator' : '/student'} replace />;
  }

  return <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  return (
    <>
      <ToastContainer />

      <Routes>
        {/* Default Landing: Splash with 3 dots for old users, Walkthrough for new users */}
        <Route path="/" element={<RootLanding />} />

        {/* Dedicated Walkthrough Tour Route (replayable anytime) */}
        <Route path="/onboarding" element={<OnboardingScreen forceShow />} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/coordinator-signup" element={<CoordinatorSignupPage />} />
        <Route path="/signup/coordinator" element={<CoordinatorSignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Student Routes protected with RBAC */}
        <Route path="/student" element={<RequireRole role="student"><StudentHome /></RequireRole>} />
        <Route path="/student/scan" element={<RequireRole role="student"><ScannerView /></RequireRole>} />
        <Route path="/student/history" element={<RequireRole role="student"><StudentHistory /></RequireRole>} />
        <Route path="/student/sessions/:sessionId" element={<RequireRole role="student"><StudentSessionDetail /></RequireRole>} />
        <Route path="/student/profile" element={<RequireRole role="student"><StudentProfile /></RequireRole>} />

        {/* Coordinator Routes protected with RBAC */}
        <Route path="/coordinator" element={<RequireRole role="coordinator"><CoordinatorDashboard /></RequireRole>} />
        <Route path="/coordinator/sessions" element={<RequireRole role="coordinator"><CoordinatorSessionList /></RequireRole>} />
        <Route path="/coordinator/sessions/new" element={<RequireRole role="coordinator"><CreateSessionForm /></RequireRole>} />
        <Route path="/coordinator/sessions/:sessionId/edit" element={<RequireRole role="coordinator"><CreateSessionForm /></RequireRole>} />
        <Route path="/coordinator/sessions/:sessionId" element={<RequireRole role="coordinator"><CoordinatorSessionLive /></RequireRole>} />
        <Route path="/coordinator/sessions/:sessionId/attendance" element={<RequireRole role="coordinator"><CoordinatorAttendanceManagement /></RequireRole>} />
        <Route path="/coordinator/reports" element={<RequireRole role="coordinator"><CoordinatorReports /></RequireRole>} />
        <Route path="/coordinator/profile" element={<RequireRole role="coordinator"><CoordinatorProfile /></RequireRole>} />

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
