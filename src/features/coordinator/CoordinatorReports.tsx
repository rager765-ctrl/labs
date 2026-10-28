import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Download,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { formatDate, calculateStudentAttendanceMetrics, calculateSessionMetrics } from '../../services/storage';

export const CoordinatorReports: React.FC = () => {
  const { sessions, attendanceRecords, students, addToast } = useApp();

  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const getCourseKey = (session: typeof sessions[number]) =>
    session.courseCode?.trim().toLocaleUpperCase() || session.labName?.trim().toLocaleLowerCase() || session.title.trim().toLocaleLowerCase();
  const getSessionMonth = (session: typeof sessions[number]) => {
    const date = new Date(session.startsAt);
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const courses = Array.from(new Map(sessions.map(session => {
    const key = getCourseKey(session);
    const code = session.courseCode?.trim();
    const label = code && session.labName?.trim() ? `${code} - ${session.labName.trim()}` : code || session.labName?.trim() || session.title;
    return [key, { key, label }] as const;
  })).values()).sort((a, b) => a.label.localeCompare(b.label));
  const months = Array.from(new Set(sessions.map(getSessionMonth).filter(Boolean)))
    .sort((a, b) => b.localeCompare(a))
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      return { key, label: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)) };
    });

  const filteredSessions = sessions.filter(session =>
    (selectedCourse === 'all' || getCourseKey(session) === selectedCourse) &&
    (selectedMonth === 'all' || getSessionMonth(session) === selectedMonth)
  );
  const filteredSessionIds = new Set(filteredSessions.map(session => session.id));
  const filteredAttendanceRecords = attendanceRecords.filter(record => filteredSessionIds.has(record.sessionId));
  const sessionMetrics = filteredSessions.map(session => ({
    session,
    metrics: calculateSessionMetrics(session, filteredAttendanceRecords),
  }));
  const heldSessionCount = filteredSessions.filter(session => session.status === 'completed' || session.status === 'live').length;
  const expectedAttendance = sessionMetrics.reduce((sum, item) => sum + item.metrics.totalExpected, 0);
  const arrivedAttendance = sessionMetrics.reduce((sum, item) => sum + item.metrics.totalArrived, 0);
  const excusedAttendance = sessionMetrics.reduce((sum, item) => sum + item.metrics.excused, 0);
  const cohortComplianceRate = expectedAttendance > 0 ? Math.round(((arrivedAttendance + excusedAttendance) / expectedAttendance) * 100) : 0;

  // Calculate students needing follow-up (attendance rate < 75%)
  const studentsWithRates = students.map(student => {
    const metrics = calculateStudentAttendanceMetrics(filteredAttendanceRecords, student.id);
    return {
      student,
      metrics,
    };
  });

  const studentsAtRisk = filteredSessions.length > 0 ? studentsWithRates.filter(s => s.metrics.rate < 75) : [];

  const handleExportReport = () => {
    addToast('Demo CSV report generated and downloaded to device', 'success', 'Export Complete');
  };

  return (
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '0 0 4px 0' }}>
              Attendance Reports & Analytics
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: 0 }}>
              Audit laboratory compliance, participation trends, and students requiring academic support.
            </p>
          </div>

          <button
            onClick={handleExportReport}
            className="btn-primary"
            style={{ height: '40px', fontSize: '13px' }}
          >
            <Download size={15} />
            <span>Export Analytics CSV (Demo)</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-500)' }}>Course Filter:</span>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-line)',
                padding: '0 10px',
                fontSize: '12px',
              }}
            >
              <option value="all">All courses</option>
              {courses.map(course => <option key={course.key} value={course.key}>{course.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-500)' }}>Month Filter:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-line)',
                padding: '0 10px',
                fontSize: '12px',
              }}
            >
              <option value="all">All months</option>
              {months.map(month => <option key={month.key} value={month.key}>{month.label}</option>)}
            </select>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-500)' }}>
              LABORATORY SESSIONS HELD
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)', marginTop: '4px' }}>
              {heldSessionCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-success-700)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} /> All syllabus targets on schedule
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-500)' }}>
              COHORT COMPLIANCE RATE
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-brand-700)', marginTop: '4px' }}>
              {cohortComplianceRate}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-brand-600)', marginTop: '4px' }}>
              {expectedAttendance ? `${arrivedAttendance} attended, ${excusedAttendance} excused of ${expectedAttendance}` : 'No attendance data for this filter'}
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-500)' }}>
              STUDENTS NEEDING INTERVENTION
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: studentsAtRisk.length > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)', marginTop: '4px' }}>
              {studentsAtRisk.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '4px' }}>
              Below the 75% department requirement
            </div>
          </div>
        </div>

        {/* Students At Risk Alert Table */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <AlertTriangle size={18} color="var(--color-warning-700)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Students At Risk (Below 75% Laboratory Attendance)
            </h2>
          </div>

          {filteredSessions.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-brand-50)', borderRadius: 'var(--radius-sm)', color: 'var(--color-ink-500)', fontSize: '13px' }}>
              No session data matches the selected course and month.
            </div>
          ) : studentsAtRisk.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-success-100)', borderRadius: 'var(--radius-sm)', color: 'var(--color-success-700)', fontSize: '13px' }}>
              ✓ Excellent news: All students in the cohort currently meet or exceed the 75% attendance threshold!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {studentsAtRisk.map(({ student, metrics }) => (
                <div
                  key={student.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#FDECEE',
                    border: '1px solid #FECACA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-ink-900)' }}>
                      {student.name} ({student.studentId})
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                      {student.programme} • {metrics.present} Attended, {metrics.absent} Missed
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-danger-700)' }}>
                      {metrics.rate}%
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--color-danger-700)', fontWeight: 600 }}>
                      WARNING ISSUED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Attendance Breakdown Table */}
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0' }}>
            Session Attendance Breakdown
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-500)', fontSize: '11px' }}>
                  <th style={{ padding: '8px 12px' }}>Course</th>
                  <th style={{ padding: '8px 12px' }}>Session</th>
                  <th style={{ padding: '8px 12px' }}>Date</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                  <th style={{ padding: '8px 12px' }}>Turnout</th>
                  <th style={{ padding: '8px 12px' }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {sessionMetrics.map(({ session, metrics: m }) => {
                  return (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--color-line)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                        {session.courseCode || session.labName}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-ink-900)' }}>
                        {session.title}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-ink-700)' }}>
                        {formatDate(session.startsAt)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <StatusBadge status={session.status} size="sm" />
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-ink-900)' }}>
                        {m.totalArrived} / {m.totalExpected}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: m.rate >= 75 ? 'var(--color-success-700)' : 'var(--color-danger-700)' }}>
                        {m.rate}%
                      </td>
                    </tr>
                  );
                })}
                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '18px 12px', textAlign: 'center', color: 'var(--color-ink-500)' }}>
                      No session data matches these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
