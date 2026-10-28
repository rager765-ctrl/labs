import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { WelcomeHeader } from '../../components/student/WelcomeHeader';
import { LiveSessionStack } from '../../components/student/LiveSessionStack';
import { AttendanceOverview } from '../../components/student/AttendanceOverview';
import { UpcomingSessionList } from '../../components/student/UpcomingSessionList';
import { StudentBottomNav } from '../../components/student/StudentBottomNav';
import { calculateStudentAttendanceMetrics } from '../../services/storage';
import { ArrowRight, Sparkles } from 'lucide-react';

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, sessions, attendanceRecords, checkOutStudent, addToast } = useApp();
  const [checkingOutSessionId, setCheckingOutSessionId] = useState<string | null>(null);

  const metrics = calculateStudentAttendanceMetrics(attendanceRecords, currentUser?.id || '');

  const today = new Date().toDateString();
  const todayLiveSessions = sessions
    .filter(session => session.status === 'live' && new Date(session.startsAt).toDateString() === today)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const upcomingSessions = sessions
    .filter(session => session.status === 'scheduled')
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const handleCheckIn = (session: (typeof sessions)[number]) => {
    navigate(`/student/scan?sessionId=${encodeURIComponent(session.id)}`);
  };

  const handleCheckOut = async (session: (typeof sessions)[number]) => {
    if (!currentUser) return;
    setCheckingOutSessionId(session.id);
    try {
      const result = await checkOutStudent(session.id, currentUser.id);
      if (!result.success) addToast(result.message, 'error', 'Check-out blocked');
    } finally {
      setCheckingOutSessionId(null);
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
          {/* Swipeable stack of today's live sessions */}
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
                Today’s Live Lab Activities
              </h2>
              {todayLiveSessions.length > 0 && (
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
                  <span>{todayLiveSessions.length} Live</span>
                </span>
              )}
            </div>
            <LiveSessionStack
              sessions={todayLiveSessions}
              attendanceRecords={attendanceRecords}
              studentId={currentUser?.id}
              checkingOutSessionId={checkingOutSessionId}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              onView={(session) => navigate(`/student/sessions/${session.id}`)}
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
              sessions={upcomingSessions}
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
