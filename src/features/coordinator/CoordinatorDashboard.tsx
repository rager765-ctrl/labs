import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Radio,
  PlusCircle,
  Clock,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Play,
  UserPlus,
  Copy,
  Link2,
} from 'lucide-react';
import { formatTime, calculateSessionMetrics } from '../../services/storage';
import { CoordinatorFcmBanner } from '../../components/coordinator/CoordinatorFcmBanner';

export const CoordinatorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, sessions, attendanceRecords, students, corrections, updateSessionStatus, createCoordinatorInvite, addToast } = useApp();
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [inviteLink, setInviteLink] = React.useState('');
  const [inviteExpiry, setInviteExpiry] = React.useState('');
  const [generatingInvite, setGeneratingInvite] = React.useState(false);
  const [inviteError, setInviteError] = React.useState('');

  const todayStr = new Date().toDateString();

  // Sessions today
  const todaySessions = sessions.filter(s => {
    const d = new Date(s.startsAt);
    return d.toDateString() === todayStr;
  });

  const liveSessions = sessions.filter(s => s.status === 'live');
  const pendingCorrections = corrections.filter(c => c.status === 'pending');

  // Overall metrics calculation
  const totalStudents = students.length;
  // Today's total present count across today's sessions
  const todayRecords = attendanceRecords.filter(r => {
    const s = sessions.find(sess => sess.id === r.sessionId);
    if (!s) return false;
    return new Date(s.startsAt).toDateString() === todayStr && (r.status === 'present' || r.status === 'late');
  });

  const totalPossibleToday = todaySessions.reduce((acc, curr) => acc + (curr.eligibleStudentIds?.length || 0), 0);
  const overallRate = totalPossibleToday > 0 ? Math.round((todayRecords.length / totalPossibleToday) * 100) : 0;

  const handleStartSession = (sessionId: string) => {
    updateSessionStatus(sessionId, 'live');
    navigate(`/coordinator/sessions/${sessionId}`);
  };

  const toggleCoordinatorOnboarding = async () => {
    if (onboardingOpen) {
      setOnboardingOpen(false);
      return;
    }
    setOnboardingOpen(true);
    setGeneratingInvite(true);
    setInviteError('');
    try {
      const invite = await createCoordinatorInvite();
      setInviteLink(`${window.location.origin}/coordinator-signup?invite=${encodeURIComponent(invite.token)}`);
      setInviteExpiry(new Date(invite.expiresAt.toMillis()).toLocaleString());
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Could not create an onboarding link.');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      addToast('Coordinator onboarding link copied.', 'success', 'Link copied');
    } catch {
      addToast('Could not copy automatically. Select and copy the link.', 'error', 'Copy failed');
    }
  };

  return (
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        {/* Header with Title and Create Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-brand-700)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Innovations Lab Overview
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display, "Squada One", sans-serif)',
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-900)',
                margin: '2px 0 0 0',
              }}
            >
              Welcome, {(currentUser?.name || 'Coordinator').split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '2px 0 0 0' }}>
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/coordinator/sessions/new')}
              className="btn-primary"
              style={{ height: '42px', fontSize: '13px' }}
            >
              <PlusCircle size={16} />
              <span>Schedule Session</span>
            </button>
          </div>
        </div>

        {/* Live Coordinator Push Notifications & Check-in Alert Banner */}
        <CoordinatorFcmBanner />

        <section className="card" style={{ padding: '16px 18px', marginBottom: '22px' }} aria-labelledby="coordinator-onboarding-title">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--color-brand-100)', color: 'var(--color-brand-700)', display: 'grid', placeItems: 'center' }}>
                <UserPlus size={19} />
              </div>
              <div>
                <h2 id="coordinator-onboarding-title" style={{ margin: 0, fontSize: '15px', color: 'var(--color-ink-900)' }}>Onboard coordinators</h2>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-ink-500)' }}>Create a single-use signup link for a new lab coordinator.</p>
              </div>
            </div>
            <button type="button" className={onboardingOpen ? 'btn-secondary' : 'btn-primary'} onClick={toggleCoordinatorOnboarding} aria-expanded={onboardingOpen} style={{ height: '40px', fontSize: '12px' }}>
              <Link2 size={15} />
              <span>{onboardingOpen ? 'Hide onboarding link' : 'Generate coordinator link'}</span>
            </button>
          </div>

          {onboardingOpen && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-line)' }}>
              {generatingInvite ? (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-ink-600)' }}>Generating a secure invite link…</p>
              ) : inviteError ? (
                <div role="alert" style={{ color: 'var(--color-danger-700)', fontSize: '12px' }}>{inviteError}</div>
              ) : inviteLink ? (
                <>
                  <label htmlFor="coordinator-invite-link" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--color-ink-600)' }}>Single-use signup link · expires {inviteExpiry}</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input id="coordinator-invite-link" readOnly value={inviteLink} style={{ flex: 1, minWidth: '240px', height: '40px', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', padding: '0 10px', fontSize: '12px', color: 'var(--color-ink-700)' }} />
                    <button type="button" className="btn-secondary" onClick={copyInviteLink} style={{ height: '40px', fontSize: '12px' }}><Copy size={14} /> Copy link</button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </section>

        {/* 4 Metric Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          {/* Registered Students */}
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-brand-100)',
                color: 'var(--color-brand-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', fontWeight: 600 }}>REGISTERED VISITORS</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink-900)', lineHeight: '26px' }}>
                {totalStudents} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-ink-500)' }}>people</span>
              </div>
            </div>
          </div>

          {/* Present Today */}
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-success-100)',
                color: 'var(--color-success-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', fontWeight: 600 }}>RECORDED TODAY</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink-900)', lineHeight: '26px' }}>
                {todayRecords.length} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-ink-500)' }}>visits</span>
              </div>
            </div>
          </div>

          {/* Average Attendance Rate */}
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-brand-100)',
                color: 'var(--color-brand-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', fontWeight: 600 }}>ATTENDANCE RATE</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink-900)', lineHeight: '26px' }}>
                {overallRate}%
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: liveSessions.length > 0 ? '#E0EAFF' : '#F1F5F9',
                color: liveSessions.length > 0 ? 'var(--color-brand-700)' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', fontWeight: 600 }}>LIVE SESSIONS</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink-900)', lineHeight: '26px' }}>
                {liveSessions.length} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-ink-500)' }}>active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attention Items: Student Correction Requests */}
        {pendingCorrections.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--color-warning-100)',
              border: '1px solid #FED7AA',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="var(--color-warning-700)" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--color-warning-700)' }}>
                  {pendingCorrections.length} Attendance Correction Request awaiting review
                </strong>
                <div style={{ fontSize: '12px', color: '#78350F' }}>
                  Attendees have submitted attendance corrections for coordinator review.
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const corr = pendingCorrections[0];
                navigate(`/coordinator/sessions/${corr.sessionId}/attendance`);
              }}
              style={{
                padding: '6px 14px',
                backgroundColor: '#FFFFFF',
                color: 'var(--color-warning-700)',
                border: '1px solid #FDBA74',
                borderRadius: 'var(--radius-pill)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Review Disputes →
            </button>
          </div>
        )}

        {/* 2-Column Section: Today's Sessions & Attendance Trend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Today's meeting sessions */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Today's Meeting Schedule
              </h2>
              <button
                onClick={() => navigate('/coordinator/sessions')}
                style={{ background: 'none', border: 'none', color: 'var(--color-brand-700)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                All Sessions →
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todaySessions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-ink-500)', fontSize: '13px' }}>
                  No sessions scheduled for today.
                </div>
              ) : (
                todaySessions.map(session => {
                  const m = calculateSessionMetrics(session, attendanceRecords);
                  return (
                    <div
                      key={session.id}
                      style={{
                        padding: '14px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: session.status === 'live' ? '#F0F5FF' : 'var(--color-brand-50)',
                        border: '1px solid',
                        borderColor: session.status === 'live' ? 'var(--color-brand-500)' : 'var(--color-line)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                            {session.labName || session.room}
                          </div>
                          <h3
                            onClick={() => navigate(`/coordinator/sessions/${session.id}`)}
                            style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '2px 0 0 0', cursor: 'pointer' }}
                          >
                            {session.title}
                          </h3>
                        </div>
                        <StatusBadge status={session.status} size="sm" />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--color-ink-700)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="var(--color-ink-500)" />
                          {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="var(--color-ink-500)" />
                          {session.room}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} color="var(--color-ink-500)" />
                          {m.totalArrived} / {m.totalExpected} Present ({m.rate}%)
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        {session.status === 'scheduled' && (
                          <button
                            onClick={() => handleStartSession(session.id)}
                            className="btn-primary"
                            style={{ height: '36px', fontSize: '12px', padding: '0 12px' }}
                          >
                            <Play size={13} />
                            <span>Start Session (Open QR)</span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/coordinator/sessions/${session.id}`)}
                          className="btn-secondary"
                          style={{ height: '36px', fontSize: '12px', padding: '0 12px' }}
                        >
                          <span>Manage & Live Feed</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Attendance Trend */}
          <div className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>
              Attendance Trend & Participation
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '0 0 20px 0' }}>
              Overall attendance across Innovations Lab meeting sessions.
            </p>

            {attendanceRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--color-ink-500)', fontSize: '13px' }}>
                <TrendingUp size={32} color="var(--color-brand-400)" style={{ margin: '0 auto 10px', opacity: 0.6 }} />
                <div style={{ fontWeight: 600, color: 'var(--color-ink-700)' }}>No Attendance Records Yet</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Attendance metrics update as visitors check in and out.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', padding: '0 10px', gap: '12px' }}>
                  {sessions.slice(0, 6).map((sess) => {
                    const sessRecs = attendanceRecords.filter(r => r.sessionId === sess.id);
                    const presentCount = sessRecs.filter(r => r.status === 'present' || r.status === 'late').length;
                    const totalExpected = sess.eligibleStudentIds?.length || (sessRecs.length > 0 ? sessRecs.length : 1);
                    const rate = totalExpected > 0 ? Math.round((presentCount / totalExpected) * 100) : 0;
                    return (
                      <div key={sess.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: sess.status === 'live' ? 'var(--color-brand-700)' : 'var(--color-ink-700)' }}>
                          {rate}%
                        </span>
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '36px',
                            height: `${Math.max(8, (rate / 100) * 120)}px`,
                            backgroundColor: sess.status === 'live' ? 'var(--color-brand-600)' : 'var(--color-brand-100)',
                            borderRadius: 'var(--radius-xs) var(--radius-xs) 0 0',
                            transition: 'height 0.3s ease',
                          }}
                          title={`${sess.title}: ${rate}% (${presentCount}/${totalExpected})`}
                        />
                        <span style={{ fontSize: '11px', color: sess.status === 'live' ? 'var(--color-brand-700)' : 'var(--color-ink-500)', fontWeight: sess.status === 'live' ? 700 : 500 }}>
                          {sess.title}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '16px', padding: '10px 12px', backgroundColor: 'var(--color-brand-50)', borderRadius: 'var(--radius-xs)', fontSize: '11px', color: 'var(--color-ink-700)' }}>
                  Target attendance policy minimum: <strong>75%</strong>.
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
