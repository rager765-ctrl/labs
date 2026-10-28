import React from 'react';
import type { LabSession } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Clock, MapPin, ChevronRight, Calendar, User } from 'lucide-react';
import { formatTime, formatDate } from '../../services/storage';

interface UpcomingSessionListProps {
  sessions: LabSession[];
  onSelectSession: (session: LabSession) => void;
}

export const UpcomingSessionList: React.FC<UpcomingSessionListProps> = ({ sessions, onSelectSession }) => {
  if (sessions.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-line)',
        }}
      >
        <Calendar size={28} color="var(--color-ink-500)" style={{ margin: '0 auto 8px auto' }} />
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
          No further sessions scheduled
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '4px' }}>
          There are no more meeting sessions scheduled for this period.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {sessions.map(session => (
        <div
          key={session.id}
          onClick={() => onSelectSession(session)}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-line)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, border-color 0.15s ease',
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelectSession(session);
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <StatusBadge status={session.status} size="sm" />
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-ink-900)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {session.title}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '4px',
                fontSize: '11px',
                color: 'var(--color-ink-500)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {formatDate(session.startsAt)}, {formatTime(session.startsAt)}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} />
                {session.room}
              </span>
              {session.coordinatorName && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} />
                  {session.coordinatorName}
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={18} color="var(--color-ink-500)" style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
};
