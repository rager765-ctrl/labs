import React from 'react';
import { CheckCircle2, Clock, XCircle, TrendingUp } from 'lucide-react';

interface AttendanceOverviewProps {
  metrics: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attendedCount: number;
    rate: number;
  };
}

export const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ metrics }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Attendance rate banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-brand-100)',
              color: 'var(--color-brand-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', fontWeight: 500 }}>Overall Attendance</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-ink-900)' }}>
              {metrics.total > 0 ? `${metrics.rate}% Standing` : 'No Matching Records'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: metrics.total === 0 ? 'var(--color-ink-500)' : metrics.rate >= 75 ? 'var(--color-success-700)' : 'var(--color-danger-700)',
              backgroundColor: metrics.total === 0 ? 'rgba(0,0,0,0.05)' : metrics.rate >= 75 ? 'var(--color-success-100)' : 'var(--color-danger-100)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {metrics.total === 0 ? 'No Data' : metrics.rate >= 75 ? 'Good Standing' : 'Below 75% Target'}
          </span>
        </div>
      </div>

      {/* 3 Metric cards in a row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        {/* Attended */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-success-100)',
              color: 'var(--color-success-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '6px',
            }}
          >
            <CheckCircle2 size={16} strokeWidth={2.4} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ink-900)', lineHeight: '24px' }}>
            {metrics.present}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-ink-500)', fontWeight: 600, marginTop: '2px' }}>
            ATTENDED
          </div>
        </div>

        {/* Late */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-warning-100)',
              color: 'var(--color-warning-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '6px',
            }}
          >
            <Clock size={16} strokeWidth={2.4} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ink-900)', lineHeight: '24px' }}>
            {metrics.late}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-ink-500)', fontWeight: 600, marginTop: '2px' }}>
            LATE
          </div>
        </div>

        {/* Missed */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-danger-100)',
              color: 'var(--color-danger-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '6px',
            }}
          >
            <XCircle size={16} strokeWidth={2.4} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-ink-900)', lineHeight: '24px' }}>
            {metrics.absent}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-ink-500)', fontWeight: 600, marginTop: '2px' }}>
            MISSED
          </div>
        </div>
      </div>
    </div>
  );
};
