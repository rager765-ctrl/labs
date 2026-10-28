import React from 'react';
import type { AttendanceStatus, SessionStatus } from '../../types';
import { CheckCircle2, Clock, XCircle, ShieldCheck, Radio, Calendar, CheckSquare, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: AttendanceStatus | SessionStatus | 'pending' | 'approved' | 'rejected';
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', showIcon = true }) => {
  let bg = 'var(--color-brand-100)';
  let color = 'var(--color-brand-700)';
  let label: string = status;
  let Icon = CheckCircle2;

  switch (status) {
    case 'present':
      bg = 'var(--color-success-100)';
      color = 'var(--color-success-700)';
      label = 'Present';
      Icon = CheckCircle2;
      break;
    case 'late':
      bg = 'var(--color-warning-100)';
      color = 'var(--color-warning-700)';
      label = 'Late';
      Icon = Clock;
      break;
    case 'absent':
      bg = '#FDECEE';
      color = 'var(--color-danger-700)';
      label = 'Absent';
      Icon = XCircle;
      break;
    case 'excused':
      bg = '#F1F5F9';
      color = '#475569';
      label = 'Excused';
      Icon = ShieldCheck;
      break;
    case 'live':
      bg = '#E0EAFF';
      color = 'var(--color-brand-700)';
      label = 'Live Now';
      Icon = Radio;
      break;
    case 'scheduled':
      bg = '#EEF2FF';
      color = '#4338CA';
      label = 'Scheduled';
      Icon = Calendar;
      break;
    case 'completed':
      bg = '#ECFDF5';
      color = '#047857';
      label = 'Completed';
      Icon = CheckSquare;
      break;
    case 'cancelled':
      bg = '#F3F4F6';
      color = '#6B7280';
      label = 'Cancelled';
      Icon = Ban;
      break;
    case 'pending':
      bg = 'var(--color-warning-100)';
      color = 'var(--color-warning-700)';
      label = 'Review Pending';
      Icon = Clock;
      break;
    case 'approved':
      bg = 'var(--color-success-100)';
      color = 'var(--color-success-700)';
      label = 'Approved';
      Icon = CheckCircle2;
      break;
    case 'rejected':
      bg = '#FDECEE';
      color = 'var(--color-danger-700)';
      label = 'Rejected';
      Icon = XCircle;
      break;
  }

  const isLive = status === 'live';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: bg,
        color: color,
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        borderRadius: 'var(--radius-pill)',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        lineHeight: '16px',
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {isLive && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-brand-600)',
            animation: 'pulseGlow 1.5s infinite',
          }}
        />
      )}
      {showIcon && !isLive && <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2.2} />}
      {label}
    </span>
  );
};
