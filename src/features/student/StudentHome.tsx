import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { WelcomeHeader } from '../../components/student/WelcomeHeader';
import { CheckInActionCard } from '../../components/student/CheckInActionCard';
import { AttendanceOverview } from '../../components/student/AttendanceOverview';
import { UpcomingSessionList } from '../../components/student/UpcomingSessionList';
import { StudentBottomNav } from '../../components/student/StudentBottomNav';
import { calculateStudentAttendanceMetrics } from '../../services/storage';
import { ArrowRight, Sparkles } from 'lucide-react';

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, sessions, attendanceRecords, checkOutStudent, addToast } = useApp();

  const metrics = calculateStudentAttendanceMetrics(attendanceRecords, currentUser?.id || '');

  // Today's primary live or upcoming session
  const todayLiveSession = sessions.find(s => s.status === 'live');
  const todayScheduledSession = sessions.find(s => s.status === 'scheduled');
  const primarySession = todayLiveSession || todayScheduledSession || sessions[0] || null;

  const primaryRecord = (primarySession && currentUser)
    ? attendanceRecords.find(r => r.sessionId === primarySession.id && r.studentId === currentUser.id)
    : undefined;

  // Other upcoming sessions
  const otherSessions = sessions.filter(s => s.id !== primarySession?.id && (s.status === 'live' || s.status === 'scheduled'));

  const handleCheckIn = () => {
    navigate('/student/scan');
  };

  const handleCheckOut = () => {
    if (!primarySession || !currentUser) return;
    const result = checkOutStudent(primarySession.id, currentUser.id);
    if (!result.success) {
      addToast(result.message, 'error');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-brand-50)',
        paddingBottom: 'calc(var(--size-nav) + 32px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 'var(--layout-content-max)',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Welcome Branded Art Header */}
        <WelcomeHeader
          user={currentUser}
          onOpenNotifications={() => addToast('No unread notifications at this time.', 'info')}
        />

        {/* Content Container with page inset */}
        <div
          style={{
            padding: '0 var(--layout-page-inset)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Active Session & Check-In Action Card */}
          <section aria-labelledby="section-current-session">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2
                id="section-current-session"
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--color-ink-900)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Today’s Lab Session
              </h2>
              {todayLiveSession && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-brand-700)',
                  }}
                >
                  <Sparkles size={12} />
                  <span>Check-In Open</span>
                </span>
              )}
            </div>
            <CheckInActionCard
              session={primarySession}
              attendanceRecord={primaryRecord}
              onCheckInClick={handleCheckIn}
              onCheckOutClick={handleCheckOut}
              onViewSessionClick={() => {
                if (primarySession) navigate(`/student/sessions/${primarySession.id}`);
              }}
            />
          </section>

          {/* Attendance Overview Stats */}
          <section aria-labelledby="section-overview">
            <h2
              id="section-overview"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--color-ink-900)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px',
              }}
            >
              Attendance Record
            </h2>
            <AttendanceOverview metrics={metrics} />
          </section>

          {/* Upcoming Sessions List */}
          <section aria-labelledby="section-upcoming">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2
                id="section-upcoming"
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--color-ink-900)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Upcoming Laboratories
              </h2>
              <button
                onClick={() => navigate('/student/history')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand-700)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </button>
            </div>
            <UpcomingSessionList
              sessions={otherSessions}
              onSelectSession={(s) => navigate(`/student/sessions/${s.id}`)}
            />
          </section>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <StudentBottomNav />
    </div>
  );
};
