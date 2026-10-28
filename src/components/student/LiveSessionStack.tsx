import React, { useRef, useState } from 'react';
import type { AttendanceRecord, LabSession } from '../../types';
import { CheckInActionCard } from './CheckInActionCard';
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';

interface LiveSessionStackProps {
  sessions: LabSession[];
  attendanceRecords: AttendanceRecord[];
  studentId?: string;
  checkingOutSessionId: string | null;
  onCheckIn: (session: LabSession) => void;
  onCheckOut: (session: LabSession) => void;
  onView: (session: LabSession) => void;
}

export const LiveSessionStack: React.FC<LiveSessionStackProps> = ({
  sessions,
  attendanceRecords,
  studentId,
  checkingOutSessionId,
  onCheckIn,
  onCheckOut,
  onView,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = (nextIndex: number) => {
    if (sessions.length < 2) return;
    setActiveIndex((nextIndex + sessions.length) % sessions.length);
  };

  if (sessions.length === 0) {
    return (
      <div className="card" style={{ padding: '20px', textAlign: 'center', background: '#fff' }}>
        <Radio size={22} color="var(--color-ink-500)" style={{ margin: '0 auto 8px' }} />
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink-700)' }}>No active meeting sessions today</div>
        <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-ink-500)' }}>Live sessions will appear here when a coordinator starts them.</div>
      </div>
    );
  }

  const visibleCards = Math.min(sessions.length, 3);

  return (
    <div
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX === null) return;
        const endX = event.changedTouches[0]?.clientX;
        if (endX === undefined) return;
        const deltaX = endX - startX;
        if (deltaX < -45) goTo(activeIndex + 1);
        else if (deltaX > 45) goTo(activeIndex - 1);
      }}
      style={{ touchAction: 'pan-y' }}
    >
      <div style={{ display: 'grid', paddingBottom: `${Math.max(0, visibleCards - 1) * 8}px` }}>
        {sessions.map((session, index) => {
          const offset = (index - activeIndex + sessions.length) % sessions.length;
          if (offset >= visibleCards) return null;
          const record = studentId
            ? attendanceRecords.find(item => item.sessionId === session.id && item.studentId === studentId)
            : undefined;

          return (
            <div
              key={session.id}
              style={{
                gridArea: '1 / 1',
                zIndex: visibleCards - offset,
                transform: `translateY(${offset * 8}px) scale(${1 - offset * 0.025})`,
                transformOrigin: 'top center',
                transition: 'transform 220ms ease, opacity 220ms ease',
                pointerEvents: offset === 0 ? 'auto' : 'none',
                opacity: offset === 0 ? 1 : 0.94,
              }}
            >
              <CheckInActionCard
                session={session}
                attendanceRecord={record}
                isCheckingOut={checkingOutSessionId === session.id}
                onCheckInClick={() => onCheckIn(session)}
                onCheckOutClick={() => onCheckOut(session)}
                onViewSessionClick={() => onView(session)}
              />
            </div>
          );
        })}
      </div>

      {sessions.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px 0', color: 'var(--color-ink-500)' }}>
          <button type="button" className="btn-icon" aria-label="Previous live session" onClick={() => goTo(activeIndex - 1)} style={{ width: '32px', height: '32px' }}>
            <ChevronLeft size={18} />
          </button>
          <div aria-live="polite" style={{ fontSize: '11px', fontWeight: 600 }}>
            {activeIndex + 1} of {sessions.length} live sessions - Swipe to switch
          </div>
          <button type="button" className="btn-icon" aria-label="Next live session" onClick={() => goTo(activeIndex + 1)} style={{ width: '32px', height: '32px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

