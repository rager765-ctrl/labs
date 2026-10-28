import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { TopDemoBar } from './components/common/TopDemoBar';
import { ToastContainer } from './components/common/ToastContainer';
import { NotFound } from './components/common/NotFound';

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
      <TopDemoBar />
      <ToastContainer />

      <Routes>
        {/* Default Landing: Redirect to active role dashboard */}
        <Route path="/" element={<Navigate to={currentRole === 'student' ? '/student' : '/coordinator'} replace />} />

        {/* Student Routes */}
        <Route path="/student" element={<StudentHome />} />
        <Route path="/student/scan" element={<ScannerView />} />
        <Route path="/student/history" element={<StudentHistory />} />
        <Route path="/student/sessions/:sessionId" element={<StudentSessionDetail />} />
        <Route path="/student/profile" element={<StudentProfile />} />

        {/* Coordinator Routes */}
        <Route path="/coordinator" element={<CoordinatorDashboard />} />
        <Route path="/coordinator/sessions" element={<CoordinatorSessionList />} />
        <Route path="/coordinator/sessions/new" element={<CreateSessionForm />} />
        <Route path="/coordinator/sessions/:sessionId" element={<CoordinatorSessionLive />} />
        <Route path="/coordinator/sessions/:sessionId/attendance" element={<CoordinatorAttendanceManagement />} />
        <Route path="/coordinator/reports" element={<CoordinatorReports />} />
        <Route path="/coordinator/profile" element={<CoordinatorProfile />} />

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
