import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/common/ToastContainer';
import { NotFound } from './components/common/NotFound';

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

const AppContent: React.FC = () => {
  const { currentRole } = useApp();

  return (
    <>
      <ToastContainer />

      <Routes>
        {/* Default Landing: Redirect to active role dashboard */}
        <Route path="/" element={<Navigate to={currentRole === 'student' ? '/student' : '/coordinator'} replace />} />

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
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
};

export default App;
