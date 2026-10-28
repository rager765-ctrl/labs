import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { WelcomeHeader } from '../../components/student/WelcomeHeader';
import { LiveSessionStack } from '../../components/student/LiveSessionStack';
import { UpcomingSessionList } from '../../components/student/UpcomingSessionList';
import { StudentBottomNav } from '../../components/student/StudentBottomNav';
import { Bell, Check, Clock3, Sparkles, X } from 'lucide-react';

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, sessions, attendanceRecords, corrections, checkOutStudent, addToast } = useApp();
  const [checkingOutSessionId, setCheckingOutSessionId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const readStorageKey = `attendance_notifications_read_${currentUser?.id || 'guest'}`;
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(readStorageKey) || '[]') as string[]; } catch { return []; }
  });
  useEffect(() => {
    try { setReadNotificationIds(JSON.parse(localStorage.getItem(readStorageKey) || '[]') as string[]); } catch { setReadNotificationIds([]); }
  }, [readStorageKey]);

  const notifications = useMemo(() => {
    const items: { id: string; title: string; message: string; at: string; kind: 'correction' | 'attendance' | 'session' }[] = [];
    if (!currentUser) return items;

    corrections.filter(item => item.studentId === currentUser.id && item.status !== 'pending').forEach(item => {
      const session = sessions.find(candidate => candidate.id === item.sessionId);
      const decision = item.status === 'approved' ? 'approved' : item.status === 'rejected' ? 'declined' : 'resolved';
      items.push({ id: `correction-${item.id}-${item.status}`, title: 'Coordinator reviewed your request', message: `Your attendance correction for ${session?.title || 'a meeting session'} was ${decision}.`, at: item.submittedAt, kind: 'correction' });
    });

    attendanceRecords.filter(record => record.studentId === currentUser.id).forEach(record => {
      const session = sessions.find(candidate => candidate.id === record.sessionId);
      record.audit?.forEach((entry, index) => {
        if (!entry.actorId || entry.actorId === currentUser.id || entry.actorId === 'attendance-system') return;
        items.push({ id: `attendance-${record.id}-${index}`, title: 'Coordinator updated attendance', message: `${session?.title || 'A meeting session'}: ${entry.action}${entry.reason ? ` — ${entry.reason}` : ''}`, at: entry.at, kind: 'attendance' });
      });
    });

    sessions.filter(session => session.eligibleStudentIds?.includes(currentUser.id) && session.status === 'live').forEach(session => {
      items.push({ id: `session-live-${session.id}`, title: 'Your meeting session is live', message: `${session.title}${session.room ? ` · ${session.room}` : ''}. Check in while attendance is open.`, at: session.startsAt, kind: 'session' });
    });
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [currentUser, corrections, attendanceRecords, sessions]);
  const unreadCount = notifications.filter(item => !readNotificationIds.includes(item.id)).length;

  const openNotifications = () => {
    const nextReadIds = Array.from(new Set([...readNotificationIds, ...notifications.map(item => item.id)]));
    setReadNotificationIds(nextReadIds);
    try { localStorage.setItem(readStorageKey, JSON.stringify(nextReadIds)); } catch { /* Notification history remains available for this session. */ }
    setNotificationsOpen(true);
  };

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
      className="app-page-shell"
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
          onOpenNotifications={openNotifications}
          unreadCount={unreadCount}
        />

        {notificationsOpen && (
          <div role="presentation" onClick={() => setNotificationsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 14px 20px' }}>
            <section role="dialog" aria-modal="true" aria-labelledby="notifications-title" onClick={event => event.stopPropagation()} style={{ width: '100%', maxWidth: '480px', maxHeight: 'min(78vh, 680px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '22px', boxShadow: '0 24px 70px rgba(15,23,42,.24)' }}>
              <header style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '38px', height: '38px', display: 'grid', placeItems: 'center', borderRadius: '13px', color: 'var(--color-brand-700)', background: 'var(--color-brand-50)' }}><Bell size={19} /></span><div><h2 id="notifications-title" style={{ margin: 0, fontSize: '17px', color: 'var(--color-ink-900)' }}>Notifications</h2><p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-ink-500)' }}>Coordinator updates and session activity</p></div></div>
                <button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications" style={{ border: 0, background: 'transparent', color: 'var(--color-ink-500)', padding: '8px', cursor: 'pointer' }}><X size={20} /></button>
              </header>
              <div style={{ overflowY: 'auto', padding: '8px 16px 16px' }}>
                {notifications.length === 0 ? <div style={{ padding: '42px 14px', textAlign: 'center', color: 'var(--color-ink-500)' }}><Check size={26} color="var(--color-brand-600)" /><p style={{ margin: '10px 0 4px', fontWeight: 700, color: 'var(--color-ink-800)' }}>You’re all caught up</p><p style={{ margin: 0, fontSize: '13px' }}>Coordinator decisions and active session updates will appear here.</p></div> : notifications.map(item => (
                  <article key={item.id} style={{ display: 'flex', gap: '12px', padding: '14px 2px', borderBottom: '1px solid var(--color-line)' }}>
                    <span style={{ flexShrink: 0, width: '34px', height: '34px', display: 'grid', placeItems: 'center', borderRadius: '11px', background: item.kind === 'correction' ? '#EEF2FF' : item.kind === 'session' ? '#ECFDF5' : '#F1F5F9', color: item.kind === 'correction' ? '#4F46E5' : item.kind === 'session' ? '#059669' : '#475569' }}>{item.kind === 'session' ? <Bell size={16} /> : item.kind === 'correction' ? <Check size={16} /> : <Clock3 size={16} />}</span>
                    <div style={{ minWidth: 0, flex: 1 }}><h3 style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--color-ink-900)' }}>{item.title}</h3><p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--color-ink-600)', overflowWrap: 'anywhere' }}>{item.message}</p><time style={{ display: 'block', marginTop: '6px', fontSize: '10px', color: 'var(--color-ink-400)' }}>{Number.isFinite(new Date(item.at).getTime()) ? new Date(item.at).toLocaleString() : 'Recently'}</time></div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

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
                Active Meeting Sessions
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
                Upcoming Meeting Sessions
              </h2>
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
