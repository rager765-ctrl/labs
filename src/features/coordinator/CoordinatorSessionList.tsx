import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { SessionStatus } from '../../types';
import { PlusCircle, Search, Clock, MapPin, Users, ChevronRight, Play, Eye, Pencil, Trash2 } from 'lucide-react';
import { formatTime, formatDate, calculateSessionMetrics } from '../../services/storage';

export const CoordinatorSessionList: React.FC = () => {
  const navigate = useNavigate();
  const { sessions, attendanceRecords, updateSessionStatus, deleteSession } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');

  const filteredSessions = sessions.filter(session => {
    if (statusFilter !== 'all' && session.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(q) ||
      session.courseCode?.toLowerCase().includes(q) ||
      session.room.toLowerCase().includes(q) ||
      session.labName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '0 0 4px 0' }}>
              Laboratory Practical Sessions
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: 0 }}>
              Manage scheduling, live QR generation, student check-in windows, and audit records.
            </p>
          </div>

          <button
            onClick={() => navigate('/coordinator/sessions/new')}
            className="btn-primary"
            style={{ height: '42px', fontSize: '13px' }}
          >
            <PlusCircle size={16} />
            <span>Create Session</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-line)',
              padding: '0 16px',
              height: '44px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Search size={18} color="var(--color-ink-500)" style={{ marginRight: '10px' }} />
            <input
              type="text"
              placeholder="Search by course code, session title, lab name, or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '13px',
                color: 'var(--color-ink-900)',
                background: 'transparent',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--color-ink-500)', cursor: 'pointer', fontSize: '12px' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Status filter chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {(['all', 'live', 'scheduled', 'completed', 'cancelled'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid',
                  borderColor: statusFilter === filter ? 'var(--color-brand-700)' : 'var(--color-line)',
                  backgroundColor: statusFilter === filter ? 'var(--color-brand-700)' : '#FFFFFF',
                  color: statusFilter === filter ? '#FFFFFF' : 'var(--color-ink-700)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {filter === 'all' ? 'All Sessions' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions Grid / List */}
        {filteredSessions.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <Clock size={36} color="var(--color-ink-500)" style={{ margin: '0 auto 12px auto' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>
              No laboratory sessions found
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: '0 0 16px 0' }}>
              No sessions match your search criteria. Create a new lab session to get started.
            </p>
            <button
              onClick={() => navigate('/coordinator/sessions/new')}
              className="btn-primary"
              style={{ height: '40px' }}
            >
              <PlusCircle size={16} />
              <span>Schedule First Session</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredSessions.map(session => {
              const m = calculateSessionMetrics(session, attendanceRecords);
              const hasAttendance = attendanceRecords.some(record => record.sessionId === session.id);
              return (
                <div
                  key={session.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
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
                      <h2
                        onClick={() => navigate(`/coordinator/sessions/${session.id}`)}
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--color-ink-900)',
                          margin: '4px 0 0 0',
                          cursor: 'pointer',
                        }}
                      >
                        {session.title}
                      </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={session.status} size="md" />
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-ink-700)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} color="var(--color-ink-500)" />
                      {formatDate(session.startsAt)}, {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} color="var(--color-ink-500)" />
                      {session.room}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={14} color="var(--color-ink-500)" />
                      <strong>{m.totalArrived}</strong> / {m.totalExpected} Registered ({m.rate}%)
                    </span>
                    {session.pin && (
                      <span
                        style={{
                          backgroundColor: 'var(--color-brand-100)',
                          color: 'var(--color-brand-700)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          fontWeight: 600,
                          fontSize: '11px',
                        }}
                      >
                        PIN: {session.pin}
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--color-line)', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-ink-500)' }}>
                      Check-out required: <strong>{session.requiresCheckOut ? 'Yes' : 'No'}</strong> • Late threshold: <strong>{session.lateAfterMinutes} min</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {(session.status === 'scheduled' || session.status === 'live') && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate(`/coordinator/sessions/${session.id}/edit`)}
                            className="btn-secondary"
                            style={{ height: '36px', fontSize: '12px', padding: '0 12px' }}
                          >
                            <Pencil size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={hasAttendance}
                            onClick={() => {
                              if (window.confirm(`Delete “${session.title}”? This action cannot be undone.`)) deleteSession(session.id);
                            }}
                            title={hasAttendance ? 'This session has attendance records and cannot be deleted.' : 'Delete this scheduled session'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              height: '36px',
                              padding: '0 12px',
                              border: '1px solid #f2c4c9',
                              borderRadius: 'var(--radius-pill)',
                              background: hasAttendance ? '#f1f2f5' : '#fff',
                              color: hasAttendance ? '#9298a7' : 'var(--color-danger-700)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: hasAttendance ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      {session.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            updateSessionStatus(session.id, 'live');
                            navigate(`/coordinator/sessions/${session.id}`);
                          }}
                          className="btn-primary"
                          style={{ height: '36px', fontSize: '12px', padding: '0 12px' }}
                        >
                          <Play size={14} />
                          <span>Start Live Session</span>
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/coordinator/sessions/${session.id}`)}
                        className="btn-secondary"
                        style={{ height: '36px', fontSize: '12px', padding: '0 12px' }}
                      >
                        <Eye size={14} />
                        <span>View Live Monitor</span>
                      </button>

                      <button
                        onClick={() => navigate(`/coordinator/sessions/${session.id}/attendance`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0 12px',
                          height: '36px',
                          borderRadius: 'var(--radius-pill)',
                          border: '1px solid var(--color-line)',
                          backgroundColor: '#FFFFFF',
                          color: 'var(--color-ink-900)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span>Manual Roster</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
