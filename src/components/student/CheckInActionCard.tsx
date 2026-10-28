import React from 'react';
import type { LabSession, AttendanceRecord } from '../../types';
import { QrCode, LogOut, CheckCircle2, Clock, MapPin, AlertCircle } from 'lucide-react';
import { formatTime } from '../../services/storage';

interface CheckInActionCardProps {
  session: LabSession | null;
  attendanceRecord?: AttendanceRecord;
  onCheckInClick: () => void;
  onCheckOutClick: () => void;
  isCheckingOut?: boolean;
  onViewSessionClick: () => void;
}

export const CheckInActionCard: React.FC<CheckInActionCardProps> = ({
  session,
  attendanceRecord,
  onCheckInClick,
  onCheckOutClick,
  isCheckingOut = false,
  onViewSessionClick,
}) => {
  if (!session) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-ink-500)', fontSize: '13px', marginBottom: '8px' }}>
          No active or upcoming lab sessions scheduled today.
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
          Check your attendance history or syllabus for future sessions.
        </div>
      </div>
    );
  }

  const isCheckedIn = !!attendanceRecord && (attendanceRecord.status === 'present' || attendanceRecord.status === 'late');
  const isCheckedOut = !!attendanceRecord?.checkedOutAt;
  const isLive = session.status === 'live';

  return (
    <div
      className="card"
      style={{
        padding: '16px',
        border: '1px solid var(--color-line)',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Session Title & Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
        <div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-brand-600)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {session.courseCode || 'LAB PRACTICAL'}
          </span>
          <h2
            onClick={onViewSessionClick}
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-ink-900)',
              lineHeight: '20px',
              marginTop: '2px',
              cursor: 'pointer',
            }}
          >
            {session.title}
          </h2>
        </div>
        <button
          onClick={onViewSessionClick}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-brand-700)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '2px 4px',
            whiteSpace: 'nowrap',
          }}
        >
          Details →
        </button>
      </div>

      {/* Time & Room Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: 'var(--color-ink-700)',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={14} color="var(--color-ink-500)" />
          <span>{formatTime(session.startsAt)} – {formatTime(session.endsAt)}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={14} color="var(--color-ink-500)" />
          <span>{session.room}</span>
        </div>
        {session.geofence && session.geofence.enabled && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--color-brand-50)',
              color: 'var(--color-brand-700)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <MapPin size={11} />
            <span>GPS Geofenced ({session.geofence.radiusMeters}m)</span>
          </div>
        )}
      </div>

      {/* Current Attendance State Feedback */}
      {isCheckedIn && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: attendanceRecord.status === 'late' ? 'var(--color-warning-100)' : 'var(--color-success-100)',
            color: attendanceRecord.status === 'late' ? 'var(--color-warning-700)' : 'var(--color-success-700)',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '14px',
          }}
        >
          <CheckCircle2 size={16} strokeWidth={2.5} />
          <span>
            {attendanceRecord.status === 'late' ? 'Recorded Late' : 'Checked In'} at {formatTime(attendanceRecord.checkedInAt || '')}
            {isCheckedOut && ` • Checked out at ${formatTime(attendanceRecord.checkedOutAt || '')}`}
          </span>
        </div>
      )}

      {/* Two action cards: Check In & Check Out */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}
      >
        {/* Check In Action */}
        <button
          onClick={onCheckInClick}
          disabled={isCheckedIn || !isLive}
          className="btn-primary"
          style={{
            width: '100%',
            height: '46px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: isCheckedIn
              ? '#DCE2F3'
              : !isLive
              ? '#E2E8F0'
              : 'var(--color-brand-700)',
            color: isCheckedIn ? '#8790AC' : !isLive ? '#64748B' : '#FFFFFF',
          }}
          title={
            isCheckedIn
              ? 'Already checked in'
              : !isLive
              ? `Session is not live yet (${session.status})`
              : 'Tap to scan QR or enter PIN'
          }
        >
          <QrCode size={18} strokeWidth={2.2} />
          <span>{isCheckedIn ? 'Checked In' : 'Check In'}</span>
        </button>

        {/* Check Out Action */}
        <button
          onClick={onCheckOutClick}
          disabled={!isCheckedIn || isCheckedOut || isCheckingOut}
          className="btn-secondary"
          style={{
            width: '100%',
            height: '46px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: !isCheckedIn || isCheckedOut ? '#F1F5F9' : 'var(--color-brand-100)',
            color: !isCheckedIn || isCheckedOut ? '#94A3B8' : 'var(--color-brand-700)',
          }}
          title={
            !isCheckedIn
              ? 'Check in first to unlock check out'
              : isCheckedOut
              ? 'Already checked out'
              : isCheckingOut
              ? 'Checking device location and completing checkout'
              : 'Tap to verify your device location and complete checkout'
          }
        >
          <LogOut size={18} strokeWidth={2.2} />
          <span>{isCheckedOut ? 'Checked Out' : isCheckingOut ? 'Verifying Location...' : 'Check Out'}</span>
        </button>
      </div>

      {/* Explanation helper if disabled */}
      {!isCheckedIn && !isLive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', fontSize: '11px', color: 'var(--color-ink-500)' }}>
          <AlertCircle size={13} />
          <span>Check-in unlocks when the coordinator starts the session.</span>
        </div>
      )}
      {isCheckedIn && !isCheckedOut && session.requiresCheckOut && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', fontSize: '11px', color: 'var(--color-brand-600)' }}>
          <Clock size={13} />
          <span>Please remember to check out before leaving the laboratory.</span>
        </div>
      )}
    </div>
  );
};
