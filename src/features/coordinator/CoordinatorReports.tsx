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
  const [dateRange, setDateRange] = useState<'all' | 'recent' | 'month'>('all');

  const filteredSessions = sessions.filter(s => {
    if (selectedCourse !== 'all' && s.courseCode !== selectedCourse) return false;
    return true;
  });

  // Calculate students needing follow-up (attendance rate < 75%)
  const studentsWithRates = students.map(student => {
    const metrics = calculateStudentAttendanceMetrics(attendanceRecords, student.id);
    return {
      student,
      metrics,
    };
  });

  const studentsAtRisk = studentsWithRates.filter(s => s.metrics.rate < 75);

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
              <option value="all">All Modules (CS301, CS304, CS310, EE210)</option>
              <option value="CS301">CS301 Database Systems</option>
              <option value="CS304">CS304 Operating Systems</option>
              <option value="EE210">EE210 Embedded Systems</option>
              <option value="CS310">CS310 Software Studio</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-500)' }}>Time Scope:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              style={{
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-line)',
                padding: '0 10px',
                fontSize: '12px',
              }}
            >
              <option value="all">Entire Academic Semester</option>
              <option value="recent">Last 14 Days</option>
              <option value="month">Current Month</option>
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
              {filteredSessions.filter(s => s.status === 'completed' || s.status === 'live').length}
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
              89.4%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-brand-600)', marginTop: '4px' }}>
              +3.2% vs previous semester benchmark
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

          {studentsAtRisk.length === 0 ? (
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
                {filteredSessions.map(session => {
                  const m = calculateSessionMetrics(session, attendanceRecords);
                  return (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--color-line)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                        {session.courseCode}
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
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
