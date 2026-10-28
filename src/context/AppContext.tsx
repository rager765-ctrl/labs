import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  User,
  LabSession,
  AttendanceRecord,
  CorrectionRequest,
  UserRole,
  AttendanceStatus,
  SessionStatus,
  ToastMessage,
} from '../types';
import {
  loadStoredState,
  saveStoredState,
  resetStoredState,
} from '../services/storage';
import type { AppState } from '../services/storage';
import { CURRENT_STUDENT, CURRENT_COORDINATOR } from '../services/mockData';

interface CheckInResult {
  success: boolean;
  code: 'success_present' | 'success_late' | 'already_checked_in' | 'not_open' | 'invalid_session' | 'camera_error';
  message: string;
  record?: AttendanceRecord;
}

interface CheckOutResult {
  success: boolean;
  message: string;
  record?: AttendanceRecord;
}

interface AppContextValue {
  currentRole: UserRole;
  currentUser: User;
  students: User[];
  sessions: LabSession[];
  attendanceRecords: AttendanceRecord[];
  corrections: CorrectionRequest[];
  toasts: ToastMessage[];
  switchRole: (role: UserRole) => void;
  resetDemoData: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
  removeToast: (id: string) => void;
  checkInStudent: (sessionId: string, studentId: string, method?: string) => CheckInResult;
  checkOutStudent: (sessionId: string, studentId: string) => CheckOutResult;
  createSession: (session: Omit<LabSession, 'id' | 'status' | 'coordinatorId'>) => LabSession;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void;
  markAttendanceManual: (sessionId: string, studentId: string, status: AttendanceStatus, reason: string) => void;
  submitCorrectionRequest: (recordId: string, requestedStatus: AttendanceStatus, reason: string) => void;
  updateCorrectionStatus: (correctionId: string, status: 'approved' | 'rejected') => void;
  simulateRandomArrival: (sessionId: string) => User | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => loadStoredState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Keep state synced with localStorage
  useEffect(() => {
    saveStoredState(state);
  }, [state]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, message, type, title };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setState(prev => ({
      ...prev,
      currentRole: role,
      currentUser: role === 'student' ? CURRENT_STUDENT : CURRENT_COORDINATOR,
    }));
    addToast(`Switched view to ${role === 'student' ? 'Student mode' : 'Lab Coordinator mode'}`, 'info');
  }, [addToast]);

  const resetDemoData = useCallback(() => {
    const fresh = resetStoredState();
    setState(fresh);
    addToast('Demo database restored to default clean state', 'success', 'Reset Complete');
  }, [addToast]);

  const checkInStudent = useCallback((sessionId: string, studentId: string, method = 'QR Code'): CheckInResult => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, code: 'invalid_session', message: 'Session not found or invalid session code.' };
    }

    if (session.status !== 'live') {
      return {
        success: false,
        code: 'not_open',
        message: session.status === 'scheduled'
          ? `Check-in is not open yet. Starts at ${new Date(session.checkInOpensAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'This practical session is completed and check-in is closed.',
      };
    }

    // Check if already checked in
    const existing = state.attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
    if (existing && existing.status !== 'absent') {
      return {
        success: false,
        code: 'already_checked_in',
        message: `You are already recorded as ${existing.status.toUpperCase()} at ${new Date(existing.checkedInAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        record: existing,
      };
    }

    // Determine if late
    const now = new Date();
    const sessionStart = new Date(session.startsAt);
    const diffMinutes = Math.floor((now.getTime() - sessionStart.getTime()) / (1000 * 60));
    const isLate = diffMinutes > session.lateAfterMinutes;
    const finalStatus: AttendanceStatus = isLate ? 'late' : 'present';

    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `rec-${Date.now()}-${studentId}`,
      sessionId,
      studentId,
      status: finalStatus,
      checkedInAt: now.toISOString(),
      updatedBy: `student-${method.toLowerCase()}`,
      note: isLate ? `Checked in ${diffMinutes} minutes after start threshold` : undefined,
      audit: [
        ...(existing?.audit || []),
        {
          at: now.toISOString(),
          actorId: studentId,
          action: `Checked in via ${method} (${finalStatus.toUpperCase()})`,
        },
      ],
    };

    setState(prev => {
      const filtered = prev.attendanceRecords.filter(r => !(r.sessionId === sessionId && r.studentId === studentId));
      return {
        ...prev,
        attendanceRecords: [newRecord, ...filtered],
      };
    });

    addToast(
      isLate ? `Checked in as Late (${session.title})` : `Successfully checked in to ${session.courseCode || session.title}!`,
      isLate ? 'info' : 'success',
      isLate ? 'Late Check-in' : 'Attendance Confirmed'
    );

    return {
      success: true,
      code: isLate ? 'success_late' : 'success_present',
      message: isLate
        ? `You were checked in late (${diffMinutes} min past threshold).`
        : 'Your presence has been recorded and verified for today’s practical session.',
      record: newRecord,
    };
  }, [state.sessions, state.attendanceRecords, addToast]);

  const checkOutStudent = useCallback((sessionId: string, studentId: string): CheckOutResult => {
    const existing = state.attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
    if (!existing || !existing.checkedInAt) {
      return { success: false, message: 'You must check in before checking out.' };
    }

    if (existing.checkedOutAt) {
      return { success: false, message: `Already checked out at ${new Date(existing.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` };
    }

    const now = new Date().toISOString();
    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkedOutAt: now,
      audit: [
        ...existing.audit,
        { at: now, actorId: studentId, action: 'Student checked out successfully' },
      ],
    };

    setState(prev => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.map(r => r.id === existing.id ? updatedRecord : r),
    }));

    addToast('Lab practical check-out confirmed. Good work today!', 'success', 'Checked Out');

    return {
      success: true,
      message: 'Check-out completed successfully. Your exit timestamp has been recorded.',
      record: updatedRecord,
    };
  }, [state.attendanceRecords, addToast]);

  const createSession = useCallback((data: Omit<LabSession, 'id' | 'status' | 'coordinatorId'>): LabSession => {
    const id = `session-${Date.now()}`;
    const newSession: LabSession = {
      ...data,
      id,
      coordinatorId: state.currentUser.id,
      status: 'scheduled',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      qrCode: `SESSION-${data.courseCode || 'LAB'}-${Date.now().toString().slice(-4)}`,
    };

    setState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
    }));

    addToast(`Session "${newSession.title}" scheduled successfully`, 'success', 'Session Created');
    return newSession;
  }, [state.currentUser.id, addToast]);

  const updateSessionStatus = useCallback((sessionId: string, status: SessionStatus) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, status } : s),
    }));
    addToast(`Session status updated to ${status.toUpperCase()}`, 'info');
  }, [addToast]);

  const markAttendanceManual = useCallback((
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    reason: string
  ) => {
    const now = new Date().toISOString();
    setState(prev => {
      const existing = prev.attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
      let updatedRecords: AttendanceRecord[];

      if (existing) {
        const updated: AttendanceRecord = {
          ...existing,
          status,
          updatedBy: prev.currentUser.id,
          note: reason,
          checkedInAt: existing.checkedInAt || (status === 'present' || status === 'late' ? now : undefined),
          audit: [
            ...existing.audit,
            {
              at: now,
              actorId: prev.currentUser.id,
              action: `Manual status change: ${existing.status} -> ${status}`,
              reason,
            },
          ],
        };
        updatedRecords = prev.attendanceRecords.map(r => r.id === existing.id ? updated : r);
      } else {
        const fresh: AttendanceRecord = {
          id: `rec-${Date.now()}-${studentId}`,
          sessionId,
          studentId,
          status,
          checkedInAt: (status === 'present' || status === 'late') ? now : undefined,
          updatedBy: prev.currentUser.id,
          note: reason,
          audit: [
            {
              at: now,
              actorId: prev.currentUser.id,
              action: `Manual attendance recorded: ${status.toUpperCase()}`,
              reason,
            },
          ],
        };
        updatedRecords = [fresh, ...prev.attendanceRecords];
      }

      return {
        ...prev,
        attendanceRecords: updatedRecords,
      };
    });

    addToast(`Student marked as ${status.toUpperCase()}`, 'success', 'Attendance Updated');
  }, [addToast]);

  const submitCorrectionRequest = useCallback((recordId: string, requestedStatus: AttendanceStatus, reason: string) => {
    const record = state.attendanceRecords.find(r => r.id === recordId);
    if (!record) return;

    const newCorrection: CorrectionRequest = {
      id: `corr-${Date.now()}`,
      recordId,
      sessionId: record.sessionId,
      studentId: record.studentId,
      currentStatus: record.status,
      requestedStatus,
      reason,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    setState(prev => ({
      ...prev,
      corrections: [newCorrection, ...prev.corrections],
    }));

    addToast('Correction request submitted to the lab coordinator for review', 'success', 'Request Sent');
  }, [state.attendanceRecords, addToast]);

  const updateCorrectionStatus = useCallback((correctionId: string, status: 'approved' | 'rejected') => {
    const correction = state.corrections.find(c => c.id === correctionId);
    if (!correction) return;

    setState(prev => {
      // If approved, update attendance record too
      let updatedAttendance = prev.attendanceRecords;
      if (status === 'approved') {
        updatedAttendance = prev.attendanceRecords.map(rec => {
          if (rec.id === correction.recordId) {
            return {
              ...rec,
              status: correction.requestedStatus,
              note: `Correction approved: ${correction.reason}`,
              audit: [
                ...rec.audit,
                {
                  at: new Date().toISOString(),
                  actorId: prev.currentUser.id,
                  action: `Correction approved (${correction.requestedStatus})`,
                  reason: correction.reason,
                },
              ],
            };
          }
          return rec;
        });
      }

      return {
        ...prev,
        attendanceRecords: updatedAttendance,
        corrections: prev.corrections.map(c => c.id === correctionId ? { ...c, status } : c),
      };
    });

    addToast(`Correction request ${status}`, status === 'approved' ? 'success' : 'info');
  }, [state.corrections, addToast]);

  const simulateRandomArrival = useCallback((sessionId: string): User | null => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    // Find a student who is not yet checked in
    const checkedInStudentIds = new Set(
      state.attendanceRecords
        .filter(r => r.sessionId === sessionId && (r.status === 'present' || r.status === 'late'))
        .map(r => r.studentId)
    );

    const availableStudents = state.students.filter(s => !checkedInStudentIds.has(s.id));
    if (availableStudents.length === 0) {
      addToast('All eligible students are already checked in for this session!', 'info');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availableStudents.length);
    const chosenStudent = availableStudents[randomIndex];

    checkInStudent(sessionId, chosenStudent.id, 'Simulated QR Scan');
    return chosenStudent;
  }, [state.sessions, state.attendanceRecords, state.students, checkInStudent, addToast]);

  return (
    <AppContext.Provider
      value={{
        currentRole: state.currentRole,
        currentUser: state.currentUser,
        students: state.students,
        sessions: state.sessions,
        attendanceRecords: state.attendanceRecords,
        corrections: state.corrections,
        toasts,
        switchRole,
        resetDemoData,
        addToast,
        removeToast,
        checkInStudent,
        checkOutStudent,
        createSession,
        updateSessionStatus,
        markAttendanceManual,
        submitCorrectionRequest,
        updateCorrectionStatus,
        simulateRandomArrival,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
