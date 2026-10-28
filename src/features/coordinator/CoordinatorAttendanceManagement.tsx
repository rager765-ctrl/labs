import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CoordinatorNav } from '../../components/coordinator/CoordinatorNav';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { AttendanceStatus } from '../../types';
import {
  ArrowLeft,
  Search,
  Edit3,
  History,
  Download,
  MapPin,
  FileText,
} from 'lucide-react';
import { formatTime, formatDate, formatFullDateTime } from '../../services/storage';
import { formatDistance } from '../../services/geoService';
import { exportSessionAttendanceCsv, buildSessionRosterPdfHtml } from '../../services/exportService';
import { PdfReportModal } from '../../components/common/PdfReportModal';

export const CoordinatorAttendanceManagement: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { sessions, attendanceRecords, students, markAttendanceManual, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');

  // Manual mark modal state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [reasonInput, setReasonInput] = useState('');

  // Audit history modal state
  const [viewingAuditStudentId, setViewingAuditStudentId] = useState<string | null>(null);

  // PDF Preview & Extraction modal state
  const [showPdfModal, setShowPdfModal] = useState(false);

  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    return (
      <div className="coordinator-layout">
        <CoordinatorNav />
        <main className="coordinator-main" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Session Not Found</h2>
          <button onClick={() => navigate('/coordinator/sessions')} className="btn-primary" style={{ marginTop: '16px' }}>
            Back to Sessions
          </button>
        </main>
      </div>
    );
  }

  // Use the session's saved roster so students who register after it ended are not marked missed.
  const sessionRosterIds = new Set([
    ...(session.eligibleStudentIds || []),
    ...attendanceRecords.filter(record => record.sessionId === session.id).map(record => record.studentId),
  ]);
  const registeredStudents = students.filter(student => student.role === 'student' && sessionRosterIds.has(student.id));

  // Map each student with their attendance record
  const allStudentRoster = registeredStudents.map(student => {
    const record = attendanceRecords.find(r => r.sessionId === session.id && r.studentId === student.id);
    const status: AttendanceStatus = record ? record.status : 'absent';
    return {
      student,
      record,
      status,
    };
  });

  const studentRoster = allStudentRoster.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (item.student.name || '').toLowerCase().includes(q) || (item.student.studentId?.toLowerCase().includes(q) ?? false);
  });

  const handleOpenEdit = (studentId: string, currentStatus: AttendanceStatus) => {
    setSelectedStudentId(studentId);
    setNewStatus(currentStatus);
    setReasonInput('');
  };

  const handleSaveManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !reasonInput.trim()) return;

    markAttendanceManual(session.id, selectedStudentId, newStatus, reasonInput.trim());
    setSelectedStudentId(null);
    setReasonInput('');
  };

  const currentExportRoster = (searchQuery.trim() || statusFilter !== 'all') ? studentRoster : allStudentRoster;
  const pdfHtml = buildSessionRosterPdfHtml(session, currentExportRoster);

  const handleExportRosterCsv = () => {
    try {
      const { filename, rowCount } = exportSessionAttendanceCsv(session, currentExportRoster);
      addToast(`Downloaded ${rowCount} attendee records to ${filename}`, 'success', 'CSV Export Complete');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      addToast('Could not generate CSV file. Please try again.', 'error');
    }
  };

  const handleOpenPdfExtractor = () => {
    setShowPdfModal(true);
  };

  const auditRecord = viewingAuditStudentId
    ? attendanceRecords.find(r => r.sessionId === session.id && r.studentId === viewingAuditStudentId)
    : null;
  const auditStudent = viewingAuditStudentId
    ? students.find(s => s.id === viewingAuditStudentId)
    : null;

  return (
    <div className="coordinator-layout" style={{ backgroundColor: 'var(--color-brand-50)' }}>
      <CoordinatorNav />

      <main className="coordinator-main">
        {/* Back Link */}
        <button
          onClick={() => navigate(`/coordinator/sessions/${session.id}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--color-brand-700)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Session Live Monitor</span>
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-brand-600)' }}>
              {session.title} · ATTENDANCE
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-ink-900)', margin: '2px 0 0 0' }}>
              Attendance Records & Manual Override
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-500)', margin: 0 }}>
              {session.title} • {session.room}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportRosterCsv}
              className="btn-secondary"
              style={{ height: '38px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Download CSV spreadsheet"
            >
              <Download size={14} />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handleOpenPdfExtractor}
              className="btn-primary"
              style={{
                height: '38px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#2563EB',
                borderColor: '#2563EB',
              }}
              title="Open formatted PDF report and extraction viewer"
            >
              <FileText size={14} />
              <span>Extract PDF Report</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--color-brand-50)',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-line)',
                padding: '0 12px',
                height: '38px',
                flex: 1,
                minWidth: '220px',
              }}
            >
              <Search size={15} color="var(--color-ink-500)" style={{ marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search visitors by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '12px',
                  background: 'transparent',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
              {(['all', 'present', 'late', 'absent', 'excused'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid',
                    borderColor: statusFilter === filter ? 'var(--color-brand-700)' : 'var(--color-line)',
                    backgroundColor: statusFilter === filter ? 'var(--color-brand-700)' : '#FFFFFF',
                    color: statusFilter === filter ? '#FFFFFF' : 'var(--color-ink-700)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Roster Table / Card List */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-brand-50)', borderBottom: '1px solid var(--color-line)', color: 'var(--color-ink-700)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Attendee</th>
                  <th style={{ padding: '12px 16px' }}>Student ID</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Check-In</th>
                  <th style={{ padding: '12px 16px' }}>Check-Out</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentRoster.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-ink-500)' }}>
                      No attendees match the current search or status.
                    </td>
                  </tr>
                ) : (
                  studentRoster.map(({ student, record, status }) => (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: '1px solid var(--color-line)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-ink-900)' }}>{student.name}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-brand-700)', fontWeight: 600, fontSize: '12px' }}>
                        {student.studentId}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={status} size="sm" />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-ink-700)' }}>
                        {record?.checkedInAt ? (
                          <div>
                            <div>{formatTime(record.checkedInAt)}</div>
                            {record.location && (
                              <div
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: record.location.isWithinGeofence ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  marginTop: '2px',
                                }}
                                title={`±${record.location.accuracy}m accuracy at (${record.location.latitude.toFixed(5)}, ${record.location.longitude.toFixed(5)})`}
                              >
                                <MapPin size={9} />
                                <span>{formatDistance(record.location.distanceMeters)}</span>
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-ink-700)' }}>
                        {record?.checkedOutAt ? formatTime(record.checkedOutAt) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEdit(student.id, status)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-pill)',
                              border: '1px solid var(--color-line)',
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-brand-700)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Manually adjust attendance record"
                          >
                            <Edit3 size={12} />
                            <span>{record ? 'Edit' : 'Mark'}</span>
                          </button>

                          {record?.audit && record.audit.length > 0 && (
                            <button
                              onClick={() => setViewingAuditStudentId(student.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-pill)',
                                border: '1px solid var(--color-line)',
                                backgroundColor: 'var(--color-brand-50)',
                                color: 'var(--color-ink-700)',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                              title="View audit trail"
                            >
                              <History size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manual Mark Override Modal */}
        {selectedStudentId && (
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
            onClick={() => setSelectedStudentId(null)}
          >
            <div
              className="animate-slide-up"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: 'var(--shadow-sheet)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>
                {attendanceRecords.some(record => record.sessionId === session.id && record.studentId === selectedStudentId)
                  ? 'Edit Attendance Submission'
                  : 'Manual Attendance Recording'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-500)', margin: '0 0 16px 0' }}>
                Record exception, verified paper arrival, or medical absence with mandatory audit reason.
              </p>

              <form onSubmit={handleSaveManualAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Select Status *
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-line)',
                      padding: '0 10px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="present">Present (In Lab)</option>
                    <option value="late">Late Arrival</option>
                    <option value="excused">Excused Absence</option>
                    <option value="absent">Absent / Unrecorded</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Mandatory Audit Reason / Justification *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Verified lab presence by instructor, phone dead during QR scan..."
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-line)',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(null)}
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
                    {attendanceRecords.some(record => record.sessionId === session.id && record.studentId === selectedStudentId)
                      ? 'Save Attendance Edit'
                      : 'Save & Record Audit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Audit Trail Viewer Modal */}
        {viewingAuditStudentId && auditRecord && (
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
            onClick={() => setViewingAuditStudentId(null)}
          >
            <div
              className="animate-slide-up"
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: 'var(--shadow-sheet)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                    Attendance History: {auditStudent?.name}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                    ID: {auditStudent?.studentId}
                  </div>
                </div>
                <button
                  onClick={() => setViewingAuditStudentId(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {auditRecord.audit.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: '3px solid var(--color-brand-600)',
                      paddingLeft: '10px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--color-ink-900)' }}>
                      {entry.action}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-500)' }}>
                      {formatFullDateTime(entry.at)} • By {entry.actorId}
                    </div>
                    {entry.reason && (
                      <div style={{ fontSize: '11px', color: 'var(--color-ink-700)', fontStyle: 'italic', marginTop: '2px' }}>
                        "{entry.reason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setViewingAuditStudentId(null)}
                className="btn-primary"
                style={{ width: '100%', height: '40px', marginTop: '16px', fontSize: '13px' }}
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        )}

        {/* Formatted PDF Report & Extraction Modal */}
        <PdfReportModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          title={`Official Attendance Dossier: ${session.title}`}
          subtitle={`${formatDate(session.startsAt)} • ${session.room} • ${currentExportRoster.length} Attendee Records`}
          htmlContent={pdfHtml}
          onDownloadCsv={handleExportRosterCsv}
        />
      </main>
    </div>
  );
};
