import type { User, LabSession, AttendanceRecord, CorrectionRequest, UserRole } from '../types';
import {
  CURRENT_STUDENT,
  MOCK_STUDENTS,
  createInitialSessions,
  createInitialAttendanceRecords,
  createInitialCorrections,
} from './mockData';

const STORAGE_KEY = 'attendance_platform_state_v1';

export interface AppState {
  currentRole: UserRole;
  currentUser: User;
  students: User[];
  sessions: LabSession[];
  attendanceRecords: AttendanceRecord[];
  corrections: CorrectionRequest[];
}

export function getInitialState(): AppState {
  return {
    currentRole: 'student',
    currentUser: CURRENT_STUDENT,
    students: MOCK_STUDENTS,
    sessions: createInitialSessions(),
    attendanceRecords: createInitialAttendanceRecords(),
    corrections: createInitialCorrections(),
  };
}

export function loadStoredState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      saveStoredState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.sessions || !parsed.attendanceRecords) {
      throw new Error('Incomplete storage schema');
    }
    return parsed;
  } catch (err) {
    console.warn('Failed to load state from localStorage, falling back to initial fixtures', err);
    const initial = getInitialState();
    saveStoredState(initial);
    return initial;
  }
}

export function saveStoredState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage', err);
  }
}

export function resetStoredState(): AppState {
  const initial = getInitialState();
  saveStoredState(initial);
  return initial;
}

// Attendance stats calculations
export function calculateStudentAttendanceMetrics(records: AttendanceRecord[], studentId: string) {
  const studentRecords = records.filter(r => r.studentId === studentId);
  const present = studentRecords.filter(r => r.status === 'present').length;
  const late = studentRecords.filter(r => r.status === 'late').length;
  const excused = studentRecords.filter(r => r.status === 'excused').length;
  const absent = studentRecords.filter(r => r.status === 'absent').length;
  
  // Total considered sessions where attendance was recorded or expected
  const total = present + late + excused + absent;
  // Present + Excused count 100%, Late counts 80% (or standard 100% presence with late flag)
  const attendedCount = present + late;
  const rate = total > 0 ? Math.round(((present + late + excused) / total) * 100) : 100;

  return {
    total,
    present,
    late,
    absent,
    excused,
    attendedCount,
    rate,
  };
}

export function calculateSessionMetrics(session: LabSession, records: AttendanceRecord[]) {
  const sessionRecords = records.filter(r => r.sessionId === session.id);
  const totalExpected = session.eligibleStudentIds.length;
  const present = sessionRecords.filter(r => r.status === 'present').length;
  const late = sessionRecords.filter(r => r.status === 'late').length;
  const excused = sessionRecords.filter(r => r.status === 'excused').length;
  const absent = sessionRecords.filter(r => r.status === 'absent').length;
  const totalArrived = present + late;
  const pending = Math.max(0, totalExpected - (present + late + excused + absent));
  const rate = totalExpected > 0 ? Math.round(((present + late) / totalExpected) * 100) : 0;

  return {
    totalExpected,
    present,
    late,
    excused,
    absent,
    totalArrived,
    pending,
    rate,
  };
}

export function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function formatFullDateTime(isoString: string): string {
  try {
    return `${formatDate(isoString)} at ${formatTime(isoString)}`;
  } catch {
    return '';
  }
}
