import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { formatDate, calculateStudentAttendanceMetrics, calculateSessionMetrics } from '../../services/storage';
import { exportAnalyticsReportCsv, buildAnalyticsReportPdfHtml } from '../../services/exportService';
import { PdfReportModal } from '../../components/common/PdfReportModal';

export const CoordinatorReports: React.FC = () => {
  const { sessions, attendanceRecords, students, addToast } = useApp();

  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const getSessionMonth = (session: typeof sessions[number]) => {
    const date = new Date(session.startsAt);
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const months = Array.from(new Set(sessions.map(getSessionMonth).filter(Boolean)))
    .sort((a, b) => b.localeCompare(a))
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      return { key, label: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)) };
    });

  const filteredSessions = sessions.filter(session =>
    (selectedSession === 'all' || session.id === selectedSession) &&
    (selectedMonth === 'all' || getSessionMonth(session) === selectedMonth)
  );
  const filteredSessionIds = new Set(filteredSessions.map(session => session.id));
  const filteredAttendanceRecords = attendanceRecords.filter(record => filteredSessionIds.has(record.sessionId));
  const sessionParticipantIds = new Set([
    ...filteredSessions.flatMap(session => session.eligibleStudentIds || []),
    ...filteredAttendanceRecords.map(record => record.studentId),
  ]);
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
  const studentsWithRates = students.filter(student => sessionParticipantIds.has(student.id)).map(student => {
    const metrics = calculateStudentAttendanceMetrics(filteredAttendanceRecords, student.id);
    return {
      student,
      metrics,
    };
  });

  const studentsAtRisk = filteredSessions.length > 0 ? studentsWithRates.filter(s => s.metrics.rate < 75) : [];

  const [showPdfModal, setShowPdfModal] = useState(false);
  const pdfHtml = buildAnalyticsReportPdfHtml(sessionMetrics, studentsWithRates, cohortComplianceRate);

  const handleExportCsv = () => {
    try {
      const { filename } = exportAnalyticsReportCsv(sessionMetrics, studentsWithRates, cohortComplianceRate);
      addToast(`Downloaded analytics report to ${filename}`, 'success', 'CSV Download Complete');
    } catch (err) {
      console.error('Failed to export CSV report:', err);
      addToast('Could not generate CSV report. Please try again.', 'error');
    }
  };

  const handleOpenPdfModal = () => {
    setShowPdfModal(true);
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
              Track visitor arrivals, departures, and attendance across Innovations Lab sessions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportCsv}
              className="btn-secondary"
              style={{ height: '40px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Download CSV spreadsheet"
            >
              <Download size={15} />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handleOpenPdfModal}
              className="btn-primary"
              style={{
                height: '40px',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#2563EB',
                borderColor: '#2563EB',
              }}
              title="Open formatted PDF report and extraction viewer"
            >
              <FileText size={15} />
              <span>Extract PDF Report</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-500)' }}>Meeting:</span>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              style={{
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-line)',
                padding: '0 10px',
                fontSize: '12px',
              }}
            >
              <option value="all">All meetings</option>
              {sessions.map(session => <option key={session.id} value={session.id}>{session.title}</option>)}
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
              MEETING SESSIONS HELD
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-ink-900)', marginTop: '4px' }}>
              {heldSessionCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-success-700)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} /> Attendance activity recorded
            </div>
          </div>

          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-ink-500)' }}>
              ATTENDANCE RATE
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
              VISITORS WITH LOW ATTENDANCE
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: studentsAtRisk.length > 0 ? 'var(--color-danger-700)' : 'var(--color-success-700)', marginTop: '4px' }}>
              {studentsAtRisk.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-ink-500)', marginTop: '4px' }}>
              Below the 75% attendance threshold
            </div>
          </div>
        </div>

        {/* Students At Risk Alert Table */}
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <AlertTriangle size={18} color="var(--color-warning-700)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Visitors With Low Attendance (Below 75%)
            </h2>
          </div>

          {filteredSessions.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-brand-50)', borderRadius: 'var(--radius-sm)', color: 'var(--color-ink-500)', fontSize: '13px' }}>
              No session data matches the selected meeting and month.
            </div>
          ) : studentsAtRisk.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-success-100)', borderRadius: 'var(--radius-sm)', color: 'var(--color-success-700)', fontSize: '13px' }}>
              ✓ All visitors currently meet or exceed the 75% attendance threshold.
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
                      {student.name} · {student.studentId || 'Visitor'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                      {metrics.present} Attended, {metrics.absent} Missed
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
              <th style={{ padding: '8px 12px' }}>Location</th>
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
                        {session.labName || session.room}
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

        {/* Formatted PDF Analytics & Cohort Dossier Modal */}
        <PdfReportModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          title="Attendance Analytics & Performance Dossier"
          subtitle={`Innovations Lab • Overall Cohort Compliance: ${cohortComplianceRate}% • ${sessionMetrics.length} Sessions Analyzed`}
          htmlContent={pdfHtml}
          onDownloadCsv={handleExportCsv}
        />
      </main>
    </div>
  );
};
