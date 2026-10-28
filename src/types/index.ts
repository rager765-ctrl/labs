export type UserRole = 'student' | 'coordinator';

export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface User {
  id: string;
  name: string;
  studentId?: string;
  email?: string;
  role: UserRole;
  programme?: string;
  level?: string;
  avatarUrl?: string;
}

export interface LabSession {
  id: string;
  title: string;
  courseCode?: string;
  labName: string;
  room: string;
  coordinatorId: string;
  eligibleStudentIds: string[];
  startsAt: string;
  endsAt: string;
  checkInOpensAt: string;
  lateAfterMinutes: number;
  status: SessionStatus;
  requiresCheckOut: boolean;
  pin?: string;
  qrCode?: string;
  description?: string;
  notes?: string;
}

export interface AttendanceAuditEntry {
  at: string;
  actorId: string;
  action: string;
  reason?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
  note?: string;
  updatedBy: string;
  audit: AttendanceAuditEntry[];
}

export interface CorrectionRequest {
  id: string;
  recordId: string;
  sessionId: string;
  studentId: string;
  currentStatus: AttendanceStatus;
  requestedStatus: AttendanceStatus;
  reason: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}
