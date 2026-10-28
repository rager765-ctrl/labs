import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { StudentBottomNav } from '../../components/student/StudentBottomNav';
import { AttendanceOverview } from '../../components/student/AttendanceOverview';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { AttendanceStatus } from '../../types';
import { Search, Clock, MapPin, AlertCircle, MessageSquarePlus, ChevronRight, ChevronDown } from 'lucide-react';
import { formatTime, formatDate, calculateStudentAttendanceMetrics } from '../../services/storage';

export const StudentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, sessions, attendanceRecords, submitCorrectionRequest, corrections } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<AttendanceStatus | 'all'>('all');
  const [selectedSession, setSelectedSession] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);

  // Correction request modal state
  const [reportingRecordId, setReportingRecordId] = useState<string | null>(null);
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>('present');
  const [reasonInput, setReasonInput] = useState('');

  // Filter student's past and recorded sessions
  const studentRecords = currentUser
    ? attendanceRecords.filter(r => r.studentId === currentUser.id)
    : [];

  // Map records with their session details
  const historyItems = studentRecords
    .map(record => {
      const session = sessions.find(s => s.id === record.sessionId);
      const correction = corrections.find(c => c.recordId === record.id);
      return {
        record,
        session,
        correction,
      };
    })
    .filter(item => item.session !== undefined);

  const monthKey = (dateValue: string) => {
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  const months = Array.from(new Set(historyItems.map(({ session }) => session ? monthKey(session.startsAt) : '').filter(Boolean)))
    .sort((a, b) => b.localeCompare(a))
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      return { key, label: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)) };
    });

  const filteredItems = historyItems.filter(item => {
    if (selectedFilter !== 'all' && item.record.status !== selectedFilter) return false;
    if (selectedSession !== 'all' && item.session?.id !== selectedSession) return false;
    if (selectedMonth !== 'all' && (!item.session || monthKey(item.session.startsAt) !== selectedMonth)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.session?.title.toLowerCase().includes(q) ||
      item.session?.labName?.toLowerCase().includes(q) ||
      item.session?.room.toLowerCase().includes(q)
    );
  });
  const metrics = calculateStudentAttendanceMetrics(filteredItems.map(item => item.record), currentUser?.id || '');
  const hasActiveFilters = !!searchQuery.trim() || selectedFilter !== 'all' || selectedSession !== 'all' || selectedMonth !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedSession('all');
    setSelectedMonth('all');
  };

  const handleOpenReportModal = (recordId: string, currentStatus: AttendanceStatus) => {
    setReportingRecordId(recordId);
    setRequestedStatus(currentStatus === 'absent' ? 'excused' : 'present');
    setReasonInput('');
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingRecordId || !reasonInput.trim()) return;
    submitCorrectionRequest(reportingRecordId, requestedStatus, reasonInput.trim());
    setReportingRecordId(null);
    setReasonInput('');
  };

  return (
    <div
      className="app-page-shell"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-brand-50)',
        paddingBottom: 'calc(var(--size-nav) + 32px)',
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
        {/* Page Header */}
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '0 0 4px 0' }}>
            Attendance History &amp; Analytics
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: 0 }}>
            Review your Innovations Lab visits by meeting, month, and attendance status.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-line)',
              padding: '0 14px',
              height: '42px',
            }}
          >
            <Search size={16} color="var(--color-ink-500)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Search meeting title, location, or room..."
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-500)' }}>
              Meeting
              <select
                value={selectedSession}
                onChange={event => setSelectedSession(event.target.value)}
                style={{ minWidth: 0, width: '100%', height: '38px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-line)', padding: '0 9px', color: 'var(--color-ink-900)', background: '#FFFFFF', fontSize: '12px' }}
              >
                <option value="all">All meetings</option>
                {Array.from(new Map(historyItems.filter(item => item.session).map(item => [item.session!.id, item.session!.title])).entries()).map(([id, title]) => <option key={id} value={id}>{title}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-500)' }}>
              Month
              <select
                value={selectedMonth}
                onChange={event => setSelectedMonth(event.target.value)}
                style={{ minWidth: 0, width: '100%', height: '38px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-line)', padding: '0 9px', color: 'var(--color-ink-900)', background: '#FFFFFF', fontSize: '12px' }}
              >
                <option value="all">All months</option>
                {months.map(month => <option key={month.key} value={month.key}>{month.label}</option>)}
              </select>
            </label>
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
            }}
          >
            {(['all', 'present', 'late', 'absent', 'excused'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid',
                  borderColor: selectedFilter === filter ? 'var(--color-brand-700)' : 'var(--color-line)',
                  backgroundColor: selectedFilter === filter ? 'var(--color-brand-700)' : '#FFFFFF',
                  color: selectedFilter === filter ? '#FFFFFF' : 'var(--color-ink-700)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}
              >
                {filter === 'all' ? 'All Records' : filter === 'absent' ? 'Missed' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Filter-responsive attendance analytics */}
        <section aria-label="Attendance analytics">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '6px 10px', backgroundColor: '#FFFFFF', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink-900)', margin: 0 }}>Attendance Analytics</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {metrics.total > 0 && <span style={{ fontSize: '11px', color: 'var(--color-brand-700)', fontWeight: 700 }}>{metrics.rate}%</span>}
              <span aria-label={`${filteredItems.length} of ${historyItems.length} records`} title={`${filteredItems.length} of ${historyItems.length} records`} style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>{filteredItems.length}/{historyItems.length}</span>
              {hasActiveFilters && <button type="button" onClick={clearFilters} style={{ border: 0, background: 'none', padding: 0, color: 'var(--color-brand-700)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Reset</button>}
              <button
                type="button"
                className="btn-icon"
                aria-label={analyticsExpanded ? 'Collapse attendance analytics' : 'Expand attendance analytics'}
                aria-expanded={analyticsExpanded}
                aria-controls="attendance-analytics-content"
                onClick={() => setAnalyticsExpanded(value => !value)}
                style={{ width: '30px', height: '30px', flexShrink: 0 }}
              >
                <ChevronDown size={16} style={{ transform: analyticsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }} />
              </button>
            </div>
          </div>
          <div id="attendance-analytics-content" hidden={!analyticsExpanded} style={{ marginTop: '8px' }}>
            <AttendanceOverview metrics={metrics} />
          </div>
        </section>

        {/* History Records List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-line)',
              }}
            >
              <AlertCircle size={32} color="var(--color-ink-500)" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                No attendance records match your filter
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-500)', marginTop: '4px' }}>
                Try adjusting your search query or reset status filters.
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary"
                  style={{ height: '36px', marginTop: '14px', fontSize: '12px' }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredItems.map(({ record, session, correction }) => {
              if (!session) return null;
              return (
                <div
                  key={record.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-line)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  {/* Top line: Meeting & Status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                        {session.labName}
                      </span>
                      <h2
                        onClick={() => navigate(`/student/sessions/${session.id}`)}
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--color-ink-900)',
                          margin: '2px 0 0 0',
                          cursor: 'pointer',
                        }}
                      >
                        {session.title}
                      </h2>
                    </div>
                    <StatusBadge status={record.status} size="sm" />
                  </div>

                  {/* Room & Dates */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--color-ink-700)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="var(--color-ink-500)" />
                      {formatDate(session.startsAt)} â€¢ {formatTime(session.startsAt)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} color="var(--color-ink-500)" />
                      {session.room}
                    </span>
                  </div>

                  {/* Check in / Check out Timestamps */}
                  {(record.checkedInAt || record.checkedOutAt || record.note) && (
                    <div
                      style={{
                        backgroundColor: 'var(--color-brand-50)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '8px 10px',
                        fontSize: '11px',
                        color: 'var(--color-ink-700)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {record.checkedInAt && (
                        <div>
                          <strong>Check-in:</strong> {formatTime(record.checkedInAt)}
                        </div>
                      )}
                      {record.checkedOutAt && (
                        <div>
                          <strong>Check-out:</strong> {formatTime(record.checkedOutAt)}
                        </div>
                      )}
                      {record.note && (
                        <div style={{ color: 'var(--color-ink-500)', fontStyle: 'italic' }}>
                          Note: {record.note}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Correction Status or Report Button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid var(--color-line)' }}>
                    {correction ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <StatusBadge status={correction.status} size="sm" />
                        <span style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                          {correction.status === 'resolved' || correction.status === 'approved' ? 'Issue fixed' : correction.status === 'rejected' ? 'Issue reviewed' : 'Issue reported'}: requested {correction.requestedStatus}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenReportModal(record.id, record.status)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-brand-600)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                        }}
                      >
                        <MessageSquarePlus size={13} />
                        <span>Report an issue / dispute</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/student/sessions/${session.id}`)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-ink-500)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span>Session log</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Report Issue / Correction Request Modal */}
      {reportingRecordId && (
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
          onClick={() => setReportingRecordId(null)}
        >
          <div
            className="animate-slide-up"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: 'var(--shadow-sheet)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>
              Report Attendance Issue
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '0 0 16px 0' }}>
              Submit an attendance correction request to the Innovations Lab coordinator.
            </p>

            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Requested Correction Status
                </label>
                <select
                  value={requestedStatus}
                  onChange={(e) => setRequestedStatus(e.target.value as AttendanceStatus)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-line)',
                    padding: '0 10px',
                    fontSize: '13px',
                  }}
                >
                  <option value="present">Present (I was in the lab)</option>
                  <option value="excused">Excused (Medical / Approved absence)</option>
                  <option value="late">Late (Arrived within late window)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Reason / Supporting Explanation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Scanner froze upon arrival, or medical slip presented to department..."
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
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

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReportingRecordId(null)}
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <StudentBottomNav />
    </div>
  );
};
