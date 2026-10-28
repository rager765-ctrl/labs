import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Clock, MapPin, User as UserIcon, Calendar, ArrowLeft, QrCode, LogOut, CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
import { formatTime, formatDate, formatFullDateTime } from '../../services/storage';

export const StudentSessionDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { sessions, attendanceRecords, currentUser, checkOutStudent, submitCorrectionRequest, corrections } = useApp();

  const [isReporting, setIsReporting] = useState(false);
  const [requestedStatus, setRequestedStatus] = useState<'present' | 'excused' | 'late'>('excused');
  const [reason, setReason] = useState('');

  const session = sessions.find(s => s.id === sessionId);
  const studentRecord = (session && currentUser)
    ? attendanceRecords.find(r => r.sessionId === session.id && r.studentId === currentUser.id)
    : undefined;
  const correction = studentRecord ? corrections.find(c => c.recordId === studentRecord.id) : undefined;

  if (!session) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2>Session Not Found</h2>
        <p>The requested laboratory session could not be located.</p>
        <button onClick={() => navigate('/student')} className="btn-primary" style={{ marginTop: '16px' }}>
          Back to Home
        </button>
      </div>
    );
  }

  const isCheckedIn = studentRecord && (studentRecord.status === 'present' || studentRecord.status === 'late');
  const isCheckedOut = !!studentRecord?.checkedOutAt;

  const handleCheckout = () => {
    if (session && currentUser) {
      checkOutStudent(session.id, currentUser.id);
    }
  };

  const handleSubmitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRecord || !reason.trim()) return;
    submitCorrectionRequest(studentRecord.id, requestedStatus, reason.trim());
    setIsReporting(false);
    setReason('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-brand-50)',
        paddingBottom: '40px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 'var(--layout-content-max)',
          margin: '0 auto',
          padding: '20px var(--layout-page-inset)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
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
            alignSelf: 'flex-start',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Main Session Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-line)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand-600)', letterSpacing: '0.04em' }}>
                {session.courseCode} • {session.labName}
              </span>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '4px 0 0 0', lineHeight: '24px' }}>
                {session.title}
              </h1>
            </div>
            <StatusBadge status={session.status} size="md" />
          </div>

          {/* Quick Schedule Grid */}
          <div
            style={{
              backgroundColor: 'var(--color-brand-50)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '12px',
            }}
          >
            <div>
              <div style={{ color: 'var(--color-ink-500)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                <Calendar size={13} />
                <span>Date</span>
              </div>
              <strong style={{ color: 'var(--color-ink-900)' }}>{formatDate(session.startsAt)}</strong>
            </div>

            <div>
              <div style={{ color: 'var(--color-ink-500)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                <Clock size={13} />
                <span>Time Window</span>
              </div>
              <strong style={{ color: 'var(--color-ink-900)' }}>
                {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
              </strong>
            </div>

            <div>
              <div style={{ color: 'var(--color-ink-500)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                <MapPin size={13} />
                <span>Room</span>
              </div>
              <strong style={{ color: 'var(--color-ink-900)' }}>{session.room}</strong>
            </div>

            <div>
              <div style={{ color: 'var(--color-ink-500)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                <UserIcon size={13} />
                <span>Coordinator</span>
              </div>
              <strong style={{ color: 'var(--color-ink-900)' }}>Dr. Elena Vance</strong>
            </div>
          </div>

          {/* Geolocation Verification Notice */}
          {session.geofence && session.geofence.enabled && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: 'var(--color-ink-800)',
              }}
            >
              <MapPin size={16} color="var(--color-brand-600)" />
              <div>
                <strong>Geolocation Verification Required:</strong> Your device must be within {session.geofence.radiusMeters}m of {session.room} when scanning.
              </div>
            </div>
          )}

          {/* Description & Requirements */}
          {session.description && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-900)', marginBottom: '4px' }}>
                Laboratory Syllabus & Tasks
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-ink-700)', lineHeight: '18px', margin: 0 }}>
                {session.description}
              </p>
            </div>
          )}

          {session.notes && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-warning-100)',
                color: 'var(--color-warning-700)',
                fontSize: '12px',
                lineHeight: '16px',
              }}
            >
              <FileText size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Student Instructions:</strong> {session.notes}
              </div>
            </div>
          )}
        </div>

        {/* Attendance Status & Actions Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-line)',
            padding: '18px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              Your Attendance Status
            </h2>
            {studentRecord && <StatusBadge status={studentRecord.status} size="sm" />}
          </div>

          {studentRecord ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor:
                    studentRecord.status === 'present'
                      ? 'var(--color-success-100)'
                      : studentRecord.status === 'late'
                      ? 'var(--color-warning-100)'
                      : '#FDECEE',
                  color:
                    studentRecord.status === 'present'
                      ? 'var(--color-success-700)'
                      : studentRecord.status === 'late'
                      ? 'var(--color-warning-700)'
                      : 'var(--color-danger-700)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  Officially Recorded as {studentRecord.status.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--color-ink-700)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {studentRecord.checkedInAt && (
                  <div>
                    <strong>Check-in recorded:</strong> {formatFullDateTime(studentRecord.checkedInAt)}
                  </div>
                )}
                {studentRecord.checkedOutAt && (
                  <div>
                    <strong>Check-out recorded:</strong> {formatFullDateTime(studentRecord.checkedOutAt)}
                  </div>
                )}
                {studentRecord.note && (
                  <div>
                    <strong>Session note:</strong> {studentRecord.note}
                  </div>
                )}
              </div>

              {/* Check out button if checked in and session is live and not checked out */}
              {session.status === 'live' && isCheckedIn && !isCheckedOut && session.requiresCheckOut && (
                <button
                  onClick={handleCheckout}
                  className="btn-secondary"
                  style={{ width: '100%', height: '44px', marginTop: '8px' }}
                >
                  <LogOut size={16} />
                  <span>Check Out of Laboratory</span>
                </button>
              )}

              {/* Correction or dispute */}
              {session.status === 'completed' && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-line)' }}>
                  {correction ? (
                    <div style={{ fontSize: '12px', color: 'var(--color-ink-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <StatusBadge status={correction.status} size="sm" />
                      <span>Correction request is under review by coordinator</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsReporting(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-brand-700)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                      }}
                    >
                      <ShieldAlert size={14} />
                      <span>Dispute or Request Attendance Correction</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: '0 0 14px 0' }}>
                No attendance has been logged yet for this practical session.
              </p>
              {session.status === 'live' ? (
                <button
                  onClick={() => navigate('/student/scan')}
                  className="btn-primary"
                  style={{ width: '100%', height: '46px' }}
                >
                  <QrCode size={18} />
                  <span>Open Scanner to Check In</span>
                </button>
              ) : (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-ink-500)',
                    backgroundColor: 'var(--color-brand-50)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {session.status === 'scheduled'
                    ? 'Check-in opens 15 minutes before session start time.'
                    : 'This session has concluded.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Audit Trail if present */}
        {studentRecord?.audit && studentRecord.audit.length > 0 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-line)',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--color-ink-900)' }}>
              Audit History Log
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {studentRecord.audit.map((entry, idx) => (
                <div key={idx} style={{ fontSize: '11px', color: 'var(--color-ink-700)', borderLeft: '2px solid var(--color-brand-600)', paddingLeft: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{entry.action}</div>
                  <div style={{ color: 'var(--color-ink-500)' }}>{formatFullDateTime(entry.at)}</div>
                  {entry.reason && <div style={{ fontStyle: 'italic', marginTop: '2px' }}>"{entry.reason}"</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Correction Modal */}
        {isReporting && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'var(--color-overlay)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setIsReporting(false)}
          >
            <div
              className="animate-slide-up"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                width: '100%',
                maxWidth: '400px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
                Request Correction
              </h3>
              <form onSubmit={handleSubmitCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Requested Status
                  </label>
                  <select
                    value={requestedStatus}
                    onChange={(e) => setRequestedStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-line)',
                      padding: '0 10px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="present">Present</option>
                    <option value="excused">Excused (Medical / Excused Absence)</option>
                    <option value="late">Late</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Reason & Notes *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide detailed justification for the coordinator..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-line)',
                      padding: '8px 10px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsReporting(false)}
                    className="btn-secondary"
                    style={{ flex: 1, height: '42px', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, height: '42px', fontSize: '13px' }}
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
