import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Clock,
  MapPin,
  KeyRound,
  Play,
  StopCircle,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { formatTime, formatDate, calculateSessionMetrics } from '../../services/storage';
import { formatDistance } from '../../services/geoService';

export const CoordinatorSessionLive: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { sessions, attendanceRecords, students, updateSessionStatus, addToast } = useApp();

  const [qrRefreshKey, setQrRefreshKey] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    return (
      <div className="coordinator-layout">
        <CoordinatorNav />
        <main className="coordinator-main" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Session Not Found</h2>
          <p>The requested session could not be found.</p>
          <button onClick={() => navigate('/coordinator/sessions')} className="btn-primary" style={{ marginTop: '16px' }}>
            Back to Sessions
          </button>
        </main>
      </div>
    );
  }

  const metrics = calculateSessionMetrics(session, attendanceRecords);

  // Latest arrivals for this session
  const arrivals = attendanceRecords
    .filter(r => r.sessionId === session.id && (r.status === 'present' || r.status === 'late'))
    .sort((a, b) => new Date(b.checkedInAt || 0).getTime() - new Date(a.checkedInAt || 0).getTime());

  // Generate genuine high-contrast QR code for this session
  useEffect(() => {
    if (!session) return;
    const qrPayload = session.qrCode || session.id;
    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => {
        setQrDataUrl(url);
      })
      .catch(err => {
        console.error('Error generating session QR code:', err);
      });
  }, [session, qrRefreshKey]);

  const handleStartSession = () => {
    updateSessionStatus(session.id, 'live');
    addToast('Practical session is now LIVE. Students can scan to check in.', 'success', 'Session Started');
  };

  const handleEndSession = () => {
    if (window.confirm('Are you sure you want to end this practical session? Final attendance will be marked.')) {
      updateSessionStatus(session.id, 'completed');
      addToast('Session finalized and moved to completed archives.', 'info', 'Session Ended');
    }
  };

  return (
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        {/* Back Link */}
        <button
          onClick={() => navigate('/coordinator/sessions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--color-brand-700)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} />
          <span>All Sessions</span>
        </button>

        {/* Top Header Card */}
        <div
          className="card"
          style={{
            padding: '20px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                  {session.courseCode}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-ink-500)' }}>•</span>
                <span style={{ fontSize: '12px', color: 'var(--color-ink-700)' }}>{session.labName}</span>
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '4px 0 0 0' }}>
                {session.title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StatusBadge status={session.status} size="md" />

              {session.status === 'scheduled' && (
                <button onClick={handleStartSession} className="btn-primary" style={{ height: '38px', fontSize: '12px' }}>
                  <Play size={14} />
                  <span>Start Session</span>
                </button>
              )}

              {session.status === 'live' && (
                <button
                  onClick={handleEndSession}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: 'var(--radius-pill)',
                    border: 'none',
                    backgroundColor: '#FDECEE',
                    color: 'var(--color-danger-700)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <StopCircle size={14} />
                  <span>End Session</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-ink-700)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={14} color="var(--color-ink-500)" />
              {formatDate(session.startsAt)}, {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} color="var(--color-ink-500)" />
              {session.room}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={14} color="var(--color-ink-500)" />
              Checkout Required: <strong>{session.requiresCheckOut ? 'Yes' : 'No'}</strong>
            </span>
            {session.geofence && session.geofence.enabled && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'var(--color-success-100)',
                  color: 'var(--color-success-700)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 600,
                  fontSize: '11px',
                }}
              >
                <MapPin size={12} />
                <span>Geofence: {session.geofence.radiusMeters}m Radius {session.geofence.strictEnforcement ? '(Strict)' : '(Audit)'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Attendance Progress Bar */}
        <div className="card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-500)' }}>
                ATTENDANCE PROGRESS
              </span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
                {metrics.totalArrived} of {metrics.totalExpected} Students Checked In ({metrics.rate}%)
              </div>
            </div>

            <button
              onClick={() => navigate(`/coordinator/sessions/${session.id}/attendance`)}
              className="btn-secondary"
              style={{ height: '36px', fontSize: '12px', padding: '0 12px' }}
            >
              <span>Manage Roster</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Progress bar line */}
          <div
            style={{
              height: '10px',
              backgroundColor: 'var(--color-line)',
              borderRadius: 'var(--radius-pill)',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                width: `${(metrics.present / metrics.totalExpected) * 100}%`,
                backgroundColor: 'var(--color-success-700)',
                transition: 'width 0.3s ease',
              }}
              title={`Present: ${metrics.present}`}
            />
            <div
              style={{
                width: `${(metrics.late / metrics.totalExpected) * 100}%`,
                backgroundColor: 'var(--color-warning-700)',
                transition: 'width 0.3s ease',
              }}
              title={`Late: ${metrics.late}`}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-ink-700)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success-700)' }} />
              Present: <strong>{metrics.present}</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning-700)' }} />
              Late: <strong>{metrics.late}</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-line)' }} />
              Pending Arrival: <strong>{metrics.pending}</strong>
            </span>
          </div>
        </div>

        {/* 2-Column: Live QR & PIN Display | Live Arrivals Stream */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* QR Display Panel */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand-700)', textTransform: 'uppercase' }}>
                Laboratory Session Pass
              </span>
              <button
                onClick={() => {
                  setQrRefreshKey(prev => prev + 1);
                  addToast('Simulated rotating QR token refreshed', 'info');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand-600)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} />
                <span>Refresh QR Code</span>
              </button>
            </div>

            {/* Real High-Contrast Scannable QR Code */}
            <div
              key={qrRefreshKey}
              style={{
                width: '220px',
                height: '220px',
                backgroundColor: '#FFFFFF',
                border: '2px solid var(--color-ink-900)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                marginBottom: '16px',
                position: 'relative',
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Scannable QR code for ${session.title}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
                />
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', display: 'grid', placeItems: 'center', height: '100%' }}>
                  <span>Generating QR Code...</span>
                </div>
              )}
            </div>

            {/* PIN Code Box */}
            <div
              style={{
                backgroundColor: 'var(--color-brand-50)',
                border: '1px dashed var(--color-brand-500)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <KeyRound size={16} color="var(--color-brand-700)" />
              <span style={{ fontSize: '12px', color: 'var(--color-ink-700)' }}>Session PIN:</span>
              <strong style={{ fontSize: '18px', letterSpacing: '4px', color: 'var(--color-brand-700)' }}>
                {session.pin || '----'}
              </strong>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--color-ink-500)', margin: '0 0 8px 0', maxWidth: '300px' }}>
              Display this screen on the laboratory projector or terminal for students arriving in {session.room}.
            </p>
          </div>

          {/* Realtime Arrival Feed */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Recent Student Check-Ins
                </h2>
                <span style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                  Live incoming attendance records ({arrivals.length})
                </span>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }} />
                Listening
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {arrivals.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center', color: 'var(--color-ink-500)', fontSize: '12px' }}>
                  No students checked in yet. Start the session and have students scan or simulate an arrival.
                </div>
              ) : (
                arrivals.map(rec => {
                  const student = students.find(s => s.id === rec.studentId);
                  return (
                    <div
                      key={rec.id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-brand-50)',
                        border: '1px solid var(--color-line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-brand-100)',
                            color: 'var(--color-brand-700)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {student?.name.split(' ').map(n => n[0]).join('') || 'ST'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                            {student?.name || 'Student'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                            {student?.studentId} • {rec.checkedInAt ? formatTime(rec.checkedInAt) : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {rec.location && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: rec.location.isWithinGeofence ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                              backgroundColor: rec.location.isWithinGeofence ? 'var(--color-success-100)' : '#FDECEE',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-pill)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title={`GPS Coordinates: ${rec.location.latitude.toFixed(5)}, ${rec.location.longitude.toFixed(5)} (±${rec.location.accuracy}m)`}
                          >
                            <MapPin size={10} />
                            <span>{formatDistance(rec.location.distanceMeters)}</span>
                          </span>
                        )}
                        <StatusBadge status={rec.status} size="sm" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
