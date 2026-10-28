import type { LabSession, User, AttendanceRecord, AttendanceStatus } from '../types';
import { formatDate, formatTime } from './storage';

/**
 * Escapes a field for safe CSV output (handles quotes, commas, newlines)
 */
function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Downloads a raw string content as a CSV file to the client's device
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  // Prepend UTF-8 BOM so Excel and other spreadsheet viewers parse UTF-8 characters cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 250);
}

export interface StudentRosterItem {
  student: User;
  status: AttendanceStatus;
  record?: AttendanceRecord;
}

/**
 * Generates and downloads a complete CSV attendance roster for a specific session
 */
export function exportSessionAttendanceCsv(
  session: LabSession,
  roster: StudentRosterItem[]
): { filename: string; rowCount: number } {
  const safeSessionTitle = session.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = session.startsAt ? session.startsAt.split('T')[0] : new Date().toISOString().split('T')[0];
  const filename = `${safeSessionTitle}_Attendance_${dateStr}.csv`;

  const rows: string[] = [];

  // Metadata headers
  rows.push(escapeCsv('SESSION ATTENDANCE ROSTER REPORT'));
  rows.push(`Session Title,${escapeCsv(session.title)}`);
  rows.push(`Date & Time,${escapeCsv(`${formatDate(session.startsAt)} (${formatTime(session.startsAt)} - ${formatTime(session.endsAt)})`)}`);
  rows.push(`Location / Room,${escapeCsv(`${session.labName || 'Innovations Lab'} - ${session.room}`)}`);
  rows.push(`Coordinator,${escapeCsv(session.coordinatorName || 'Unassigned / Not Specified')}`);
  rows.push(`Status,${escapeCsv(session.status.toUpperCase())}`);
  rows.push(`Generated At,${escapeCsv(new Date().toLocaleString())}`);
  rows.push(''); // Blank separator

  // Table Column Headers
  const headers = [
    'Student Name',
    'Student ID',
    'Email',
    'Programme',
    'Academic Level',
    'Attendance Status',
    'Check-In Time',
    'Check-Out Time',
    'GPS Verification',
    'GPS Distance (m)',
    'Audit Action / Notes',
  ];
  rows.push(headers.map(h => escapeCsv(h)).join(','));

  // Data rows
  roster.forEach(({ student, status, record }) => {
    const checkInTime = record?.checkedInAt ? new Date(record.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
    const checkOutTime = record?.checkedOutAt ? new Date(record.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
    
    let gpsStatus = 'No GPS recorded';
    let gpsDistance = 'N/A';
    if (record?.location) {
      gpsStatus = record.location.isWithinGeofence ? 'Verified Within Range' : 'Outside Geofence';
      gpsDistance = String(Math.round(record.location.distanceMeters));
    }

    const latestAudit = record?.audit && record.audit.length > 0
      ? record.audit[record.audit.length - 1]
      : null;
    const auditInfo = latestAudit ? `${latestAudit.action}${latestAudit.reason ? `: ${latestAudit.reason}` : ''}` : '';

    const row = [
      student.name,
      student.studentId || 'N/A',
      student.email || 'N/A',
      student.programme || 'N/A',
      student.level || 'N/A',
      status.toUpperCase(),
      checkInTime,
      checkOutTime,
      gpsStatus,
      gpsDistance,
      auditInfo,
    ];
    rows.push(row.map(val => escapeCsv(val)).join(','));
  });

  const csvContent = rows.join('\r\n');
  downloadCsvFile(filename, csvContent);

  return { filename, rowCount: roster.length };
}

export interface AnalyticsSessionMetricsItem {
  session: LabSession;
  metrics: {
    totalExpected: number;
    totalArrived: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    rate: number;
  };
}

export interface AnalyticsStudentRateItem {
  student: User;
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

/**
 * Generates and downloads a multi-metric Analytics CSV report
 */
export function exportAnalyticsReportCsv(
  sessionMetrics: AnalyticsSessionMetricsItem[],
  studentsWithRates: AnalyticsStudentRateItem[],
  cohortComplianceRate: number
): { filename: string } {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Attendance_Analytics_Report_${dateStr}.csv`;

  const rows: string[] = [];

  // Summary Metadata
  rows.push(escapeCsv('INNOVATIONS LAB ATTENDANCE ANALYTICS REPORT'));
  rows.push(`Report Generated,${escapeCsv(new Date().toLocaleString())}`);
  rows.push(`Overall Cohort Compliance Rate,${escapeCsv(`${cohortComplianceRate}%`)}`);
  rows.push(`Total Sessions Included,${escapeCsv(sessionMetrics.length)}`);
  rows.push(`Total Students Monitored,${escapeCsv(studentsWithRates.length)}`);
  rows.push('');

  // Section 1: Sessions Performance Summary
  rows.push(escapeCsv('--- SESSION ATTENDANCE BREAKDOWN ---'));
  const sessionHeaders = [
    'Session Title',
    'Date',
    'Time Window',
    'Room',
    'Coordinator',
    'Status',
    'Registered Expected',
    'Total Arrived',
    'On-Time (Present)',
    'Late Arrivals',
    'Absent',
    'Excused',
    'Attendance Rate (%)',
  ];
  rows.push(sessionHeaders.map(h => escapeCsv(h)).join(','));

  sessionMetrics.forEach(({ session, metrics }) => {
    const row = [
      session.title,
      formatDate(session.startsAt),
      `${formatTime(session.startsAt)} - ${formatTime(session.endsAt)}`,
      session.room,
      session.coordinatorName || 'Unassigned',
      session.status.toUpperCase(),
      metrics.totalExpected,
      metrics.totalArrived,
      metrics.present,
      metrics.late,
      metrics.absent,
      metrics.excused,
      `${metrics.rate}%`,
    ];
    rows.push(row.map(val => escapeCsv(val)).join(','));
  });

  rows.push('');
  rows.push('');

  // Section 2: Student Individual Compliance Breakdown
  rows.push(escapeCsv('--- INDIVIDUAL STUDENT ATTENDANCE RATES ---'));
  const studentHeaders = [
    'Student Name',
    'Student ID',
    'Email',
    'Programme',
    'Academic Level',
    'Sessions Attended',
    'Excused Absences',
    'Unexcused Absences',
    'Attendance Rate (%)',
    'Performance Status',
  ];
  rows.push(studentHeaders.map(h => escapeCsv(h)).join(','));

  studentsWithRates.forEach(({ student, metrics }) => {
    const performance = metrics.rate >= 80 ? 'Good Standing' : metrics.rate >= 70 ? 'Moderate Risk' : 'High Risk / Follow-up';
    const row = [
      student.name,
      student.studentId || 'N/A',
      student.email || 'N/A',
      student.programme || 'N/A',
      student.level || 'N/A',
      metrics.attendedCount,
      metrics.excused,
      metrics.absent,
      `${metrics.rate}%`,
      performance,
    ];
    rows.push(row.map(val => escapeCsv(val)).join(','));
  });

  const csvContent = rows.join('\r\n');
  downloadCsvFile(filename, csvContent);

  return { filename };
}

/**
 * Builds high-fidelity HTML for Session Roster PDF Extractor
 */
export function buildSessionRosterPdfHtml(
  session: LabSession,
  roster: StudentRosterItem[]
): string {
  const arrivedCount = roster.filter(r => r.status === 'present' || r.status === 'late').length;
  const presentCount = roster.filter(r => r.status === 'present').length;
  const lateCount = roster.filter(r => r.status === 'late').length;
  const absentCount = roster.filter(r => r.status === 'absent').length;
  const excusedCount = roster.filter(r => r.status === 'excused').length;
  const total = roster.length;
  const rate = total > 0 ? Math.round((arrivedCount / total) * 100) : 0;
  const docRef = `ATT-${session.id.slice(-6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

  const statusColorMap: Record<AttendanceStatus, { bg: string; text: string; border: string }> = {
    present: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    late: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
    absent: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    excused: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  };

  const rowsHtml = roster.map((item, index) => {
    const color = statusColorMap[item.status] || statusColorMap.absent;
    const checkInTime = item.record?.checkedInAt
      ? new Date(item.record.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';
    const checkOutTime = item.record?.checkedOutAt
      ? new Date(item.record.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '—';

    let locationTag = '—';
    if (item.record?.location) {
      locationTag = item.record.location.isWithinGeofence
        ? `GPS Verified (${Math.round(item.record.location.distanceMeters)}m)`
        : `Outside (${Math.round(item.record.location.distanceMeters)}m)`;
    }

    return `
      <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${index % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding: 10px 12px; font-size: 11px; color: #64748B; text-align: center;">${index + 1}</td>
        <td style="padding: 10px 12px;">
          <div style="font-weight: 700; font-size: 12px; color: #0F172A;">${item.student.name}</div>
          <div style="font-size: 10px; color: #64748B;">${item.student.email || ''}</div>
        </td>
        <td style="padding: 10px 12px; font-size: 11px; font-family: monospace; font-weight: 600; color: #334155;">
          ${item.student.studentId || 'N/A'}
        </td>
        <td style="padding: 10px 12px; font-size: 11px; color: #475569;">
          ${item.student.programme || 'N/A'}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; background-color: ${color.bg}; color: ${color.text}; border: 1px solid ${color.border};">
            ${item.status}
          </span>
        </td>
        <td style="padding: 10px 12px; font-size: 11px; color: #334155; text-align: center;">${checkInTime}</td>
        <td style="padding: 10px 12px; font-size: 11px; color: #334155; text-align: center;">${checkOutTime}</td>
        <td style="padding: 10px 12px; font-size: 10px; color: #64748B; text-align: center;">${locationTag}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${session.title} - Official Attendance Dossier</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 14mm 14mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
          background: #FFFFFF;
          padding: 24px;
        }
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 16px;
          border-bottom: 2px solid #0F172A;
          margin-bottom: 20px;
        }
        .institution-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          color: #0F172A;
          margin: 0 0 2px 0;
        }
        .institution-sub {
          font-size: 11px;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .badge-ref {
          text-align: right;
          font-size: 10px;
          color: #64748B;
        }
        .ref-pill {
          display: inline-block;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 700;
          color: #0F172A;
          margin-top: 4px;
        }
        .session-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 20px;
        }
        .info-cell label {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748B;
          font-weight: 700;
          margin-bottom: 3px;
        }
        .info-cell span {
          font-size: 12px;
          font-weight: 700;
          color: #0F172A;
        }
        .kpi-container {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
          margin-bottom: 22px;
        }
        .kpi-card {
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          text-align: center;
        }
        .kpi-card .val {
          font-size: 20px;
          font-weight: 900;
          color: #0F172A;
          line-height: 1.1;
        }
        .kpi-card .lbl {
          font-size: 9px;
          text-transform: uppercase;
          color: #64748B;
          font-weight: 700;
          margin-top: 4px;
        }
        .roster-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          overflow: hidden;
        }
        .roster-table th {
          background-color: #0F172A;
          color: #FFFFFF;
          padding: 10px 12px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .footer-signatures {
          margin-top: 36px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          padding-top: 24px;
          border-top: 1px dashed #CBD5E1;
        }
        .sig-block {
          border-top: 1px solid #0F172A;
          padding-top: 6px;
          font-size: 11px;
          color: #475569;
        }
        .no-print-toolbar {
          position: sticky;
          top: 0;
          background: #0F172A;
          color: #FFFFFF;
          padding: 12px 20px;
          margin: -24px -24px 24px -24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 100;
        }
        .btn-print {
          background: #2563EB;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-close {
          background: transparent;
          border: 1px solid #475569;
          color: #CBD5E1;
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        @media print {
          .no-print-toolbar { display: none !important; }
          body { padding: 0 !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-toolbar">
        <div>
          <strong style="font-size: 14px;">Print / PDF Document Preview</strong>
          <span style="font-size: 12px; color: #94A3B8; margin-left: 8px;">Click "Save as PDF" to save or print</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-print" onclick="window.print()">
            🖨️ Save as PDF / Print
          </button>
          <button class="btn-close" onclick="window.close()">
            Close
          </button>
        </div>
      </div>

      <div class="header-bar">
        <div>
          <div class="institution-sub">${session.labName || 'Innovations Lab'} · Department of Computer Science</div>
          <h1 class="institution-title">Official Attendance Record & Roster Dossier</h1>
          <div style="font-size: 12px; font-weight: 700; color: #2563EB; margin-top: 4px;">
            ${session.title}
          </div>
        </div>
        <div class="badge-ref">
          <div>OFFICIAL CERTIFIED REPORT</div>
          <div class="ref-pill">${docRef}</div>
          <div style="margin-top: 4px;">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      <div class="session-info-grid">
        <div class="info-cell">
          <label>Date & Time Window</label>
          <span>${formatDate(session.startsAt)} · ${formatTime(session.startsAt)} - ${formatTime(session.endsAt)}</span>
        </div>
        <div class="info-cell">
          <label>Meeting Venue / Room</label>
          <span>${session.room}</span>
        </div>
        <div class="info-cell">
          <label>Lead Coordinator</label>
          <span>${session.coordinatorName || 'Not Assigned / General'}</span>
        </div>
        <div class="info-cell">
          <label>Security & Geofence</label>
          <span>${session.geofence?.enabled ? `GPS Radius: ${session.geofence.radiusMeters}m` : 'QR & PIN Standard Verification'}</span>
        </div>
      </div>

      <div class="kpi-container">
        <div class="kpi-card" style="border-top: 3px solid #0F172A;">
          <div class="val">${total}</div>
          <div class="lbl">Registered</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #2563EB;">
          <div class="val">${arrivedCount}</div>
          <div class="lbl">Total Arrived</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #10B981;">
          <div class="val">${presentCount}</div>
          <div class="lbl">On-Time</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #F59E0B;">
          <div class="val">${lateCount}</div>
          <div class="lbl">Late</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #3B82F6;">
          <div class="val">${excusedCount}</div>
          <div class="lbl">Excused</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #EF4444;">
          <div class="val">${absentCount}</div>
          <div class="lbl">Absent</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #059669; background-color: #ECFDF5;">
          <div class="val" style="color: #065F46;">${rate}%</div>
          <div class="lbl" style="color: #065F46;">Turnout Rate</div>
        </div>
      </div>

      <table class="roster-table">
        <thead>
          <tr>
            <th style="width: 32px;">#</th>
            <th style="text-align: left;">Student Name & Email</th>
            <th style="text-align: left;">Student ID</th>
            <th style="text-align: left;">Programme</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Check-In</th>
            <th style="text-align: center;">Check-Out</th>
            <th style="text-align: center;">Location Verification</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer-signatures">
        <div class="sig-block">
          <strong>Certified by Session Coordinator / Instructor:</strong>
          <div style="height: 35px;"></div>
          <div>${session.coordinatorName ? `Name: ${session.coordinatorName}` : 'Signature: __________________________'}</div>
          <div>Date Certified: ________________________</div>
        </div>
        <div class="sig-block" style="text-align: right;">
          <strong>Innovations Lab Official Records Stamp:</strong>
          <div style="height: 35px;"></div>
          <div style="font-family: monospace; font-size: 10px; color: #64748B;">SYSTEM VERIFIED · SECURE LOG TIMESTAMP</div>
          <div style="font-size: 10px; color: #94A3B8;">Document ID: ${docRef}</div>
        </div>
      </div>

      <script>
        // Trigger print prompt automatically when loaded in new window
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Builds high-fidelity HTML for Analytics & Cohort Attendance PDF Extractor
 */
export function buildAnalyticsReportPdfHtml(
  sessionMetrics: AnalyticsSessionMetricsItem[],
  studentsWithRates: AnalyticsStudentRateItem[],
  cohortComplianceRate: number
): string {
  const docRef = `ANL-${Date.now().toString(36).toUpperCase()}`;

  const sessionRowsHtml = sessionMetrics.map((item, index) => {
    return `
      <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${index % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding: 9px 10px; font-weight: 700; color: #0F172A;">${item.session.title}</td>
        <td style="padding: 9px 10px; font-size: 11px; color: #475569;">${formatDate(item.session.startsAt)}</td>
        <td style="padding: 9px 10px; font-size: 11px; color: #475569;">${item.session.room}</td>
        <td style="padding: 9px 10px; font-size: 11px; color: #475569;">${item.session.coordinatorName || '—'}</td>
        <td style="padding: 9px 10px; text-align: center; font-weight: 600;">${item.metrics.totalArrived} / ${item.metrics.totalExpected}</td>
        <td style="padding: 9px 10px; text-align: center; color: #059669; font-weight: 600;">${item.metrics.present}</td>
        <td style="padding: 9px 10px; text-align: center; color: #D97706; font-weight: 600;">${item.metrics.late}</td>
        <td style="padding: 9px 10px; text-align: center; color: #DC2626; font-weight: 600;">${item.metrics.absent}</td>
        <td style="padding: 9px 10px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${item.metrics.rate >= 80 ? '#ECFDF5' : item.metrics.rate >= 70 ? '#FFFBEB' : '#FEF2F2'}; color: ${item.metrics.rate >= 80 ? '#065F46' : item.metrics.rate >= 70 ? '#92400E' : '#991B1B'};">
            ${item.metrics.rate}%
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const studentRowsHtml = studentsWithRates.map((item, index) => {
    const isAtRisk = item.metrics.rate < 75;
    return `
      <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${index % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding: 8px 10px; font-weight: 600; color: #0F172A;">${item.student.name}</td>
        <td style="padding: 8px 10px; font-family: monospace; font-size: 11px;">${item.student.studentId || 'N/A'}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: #475569;">${item.student.programme || 'N/A'}</td>
        <td style="padding: 8px 10px; text-align: center; font-weight: 600; color: #059669;">${item.metrics.attendedCount}</td>
        <td style="padding: 8px 10px; text-align: center; color: #2563EB;">${item.metrics.excused}</td>
        <td style="padding: 8px 10px; text-align: center; color: #DC2626;">${item.metrics.absent}</td>
        <td style="padding: 8px 10px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: ${item.metrics.rate >= 80 ? '#ECFDF5' : item.metrics.rate >= 75 ? '#FFFBEB' : '#FEF2F2'}; color: ${item.metrics.rate >= 80 ? '#065F46' : item.metrics.rate >= 75 ? '#92400E' : '#991B1B'};">
            ${item.metrics.rate}%
          </span>
        </td>
        <td style="padding: 8px 10px; font-size: 10px; font-weight: 700; text-align: center; color: ${isAtRisk ? '#DC2626' : '#059669'};">
          ${isAtRisk ? '⚠️ REQUIRES FOLLOW-UP' : 'COMPLIANT'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Innovations Lab - Attendance Analytics & Performance Dossier</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 12mm 12mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0F172A;
          background: #FFFFFF;
          padding: 20px;
        }
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 12px;
          border-bottom: 2px solid #0F172A;
          margin-bottom: 16px;
        }
        .institution-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          color: #0F172A;
          margin: 0 0 2px 0;
        }
        .institution-sub {
          font-size: 11px;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .badge-ref {
          text-align: right;
          font-size: 10px;
          color: #64748B;
        }
        .ref-pill {
          display: inline-block;
          background: #F1F5F9;
          border: 1px solid #CBD5E1;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 700;
          color: #0F172A;
          margin-top: 4px;
        }
        .kpi-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .kpi-card {
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          text-align: center;
        }
        .kpi-card .val {
          font-size: 22px;
          font-weight: 900;
          color: #0F172A;
        }
        .kpi-card .lbl {
          font-size: 10px;
          text-transform: uppercase;
          color: #64748B;
          font-weight: 700;
          margin-top: 3px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 16px 0 8px 0;
          color: #0F172A;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          border: 1px solid #CBD5E1;
          margin-bottom: 20px;
        }
        th {
          background-color: #0F172A;
          color: #FFFFFF;
          padding: 9px 10px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .no-print-toolbar {
          position: sticky;
          top: 0;
          background: #0F172A;
          color: #FFFFFF;
          padding: 12px 20px;
          margin: -20px -20px 20px -20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 100;
        }
        .btn-print {
          background: #2563EB;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }
        .btn-close {
          background: transparent;
          border: 1px solid #475569;
          color: #CBD5E1;
          padding: 7px 14px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        @media print {
          .no-print-toolbar { display: none !important; }
          body { padding: 0 !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-toolbar">
        <div>
          <strong style="font-size: 14px;">Analytics Dossier — Print & PDF Extractor</strong>
          <span style="font-size: 12px; color: #94A3B8; margin-left: 8px;">Select "Save as PDF" to export vector document</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-print" onclick="window.print()">🖨️ Save as PDF / Print</button>
          <button class="btn-close" onclick="window.close()">Close</button>
        </div>
      </div>

      <div class="header-bar">
        <div>
          <div class="institution-sub">Innovations Lab · School of Computing & Data Science</div>
          <h1 class="institution-title">Comprehensive Attendance Analytics & Performance Dossier</h1>
        </div>
        <div class="badge-ref">
          <div>EXECUTIVE COMPLIANCE AUDIT</div>
          <div class="ref-pill">${docRef}</div>
          <div style="margin-top: 3px;">Generated: ${new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div class="kpi-container">
        <div class="kpi-card" style="border-top: 3px solid #2563EB;">
          <div class="val" style="color: #2563EB;">${cohortComplianceRate}%</div>
          <div class="lbl">Cohort Compliance Rate</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #0F172A;">
          <div class="val">${sessionMetrics.length}</div>
          <div class="lbl">Sessions Analyzed</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #059669;">
          <div class="val">${studentsWithRates.filter(s => s.metrics.rate >= 75).length}</div>
          <div class="lbl">Compliant Attendees (>=75%)</div>
        </div>
        <div class="kpi-card" style="border-top: 3px solid #DC2626;">
          <div class="val" style="color: #DC2626;">${studentsWithRates.filter(s => s.metrics.rate < 75).length}</div>
          <div class="lbl">Attendees Requiring Follow-Up (<75%)</div>
        </div>
      </div>

      <div class="section-title">1. Meeting Sessions Performance Breakdown</div>
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Session Title</th>
            <th style="text-align: left;">Date</th>
            <th style="text-align: left;">Room</th>
            <th style="text-align: left;">Coordinator</th>
            <th style="text-align: center;">Arrived / Expected</th>
            <th style="text-align: center;">Present</th>
            <th style="text-align: center;">Late</th>
            <th style="text-align: center;">Absent</th>
            <th style="text-align: center;">Turnout</th>
          </tr>
        </thead>
        <tbody>
          ${sessionRowsHtml}
        </tbody>
      </table>

      <div class="section-title">2. Individual Attendee Compliance Roster</div>
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Student Name</th>
            <th style="text-align: left;">Student ID</th>
            <th style="text-align: left;">Programme</th>
            <th style="text-align: center;">Attended</th>
            <th style="text-align: center;">Excused</th>
            <th style="text-align: center;">Absent</th>
            <th style="text-align: center;">Rate (%)</th>
            <th style="text-align: center;">Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          ${studentRowsHtml}
        </tbody>
      </table>

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Triggers the browser PDF Extractor / Print Window
 */
export function openFormattedPdfExtractor(htmlContent: string): void {
  const printWindow = window.open('', '_blank', 'width=1100,height=850,menubar=no,toolbar=no,location=no,status=no');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    // Popup was blocked: fallback to hidden iframe print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 400);
    }
  }
}
