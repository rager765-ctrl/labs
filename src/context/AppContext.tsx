import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
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
import { initAnalytics } from '../services/firebase';
import {
  listenToAuthChanges,
  signInUser,
  signUpUser,
  signOutUser,
  signUpCoordinatorWithInvite,
} from '../services/authService';
import {
  subscribeToSessions,
  subscribeToAttendance,
  subscribeToCorrections,
  saveAttendanceToFirestore,
  saveSessionToFirestore,
  updateSessionStatusInFirestore,
  saveCorrectionToFirestore,
  updateCorrectionInFirestore,
  seedFirestoreIfEmpty,
  createCoordinatorInvite,
} from '../services/firestoreService';
import type { CoordinatorInvite } from '../services/firestoreService';
import {
  evaluateGeofenceProximity,
  calculateHaversineDistanceMeters,
  formatDistance,
} from '../services/geoService';
import type { AttendanceLocation } from '../types';

export interface CheckInCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface CheckInResult {
  success: boolean;
  code:
    | 'success_present'
    | 'success_late'
    | 'already_checked_in'
    | 'not_open'
    | 'invalid_session'
    | 'camera_error'
    | 'geofence_out_of_range'
    | 'geolocation_required';
  message: string;
  record?: AttendanceRecord;
  distanceMeters?: number;
  requiredRadius?: number;
  venueName?: string;
  isWithinGeofence?: boolean;
}

export interface CheckOutResult {
  success: boolean;
  message: string;
  record?: AttendanceRecord;
  distanceMeters?: number;
  isWithinGeofence?: boolean;
}

interface AppContextValue {
  currentRole: UserRole;
  currentUser: User;
  firebaseUser: FirebaseUser | null;
  isCloudConnected: boolean;
  students: User[];
  sessions: LabSession[];
  attendanceRecords: AttendanceRecord[];
  corrections: CorrectionRequest[];
  toasts: ToastMessage[];
  switchRole: (role: UserRole) => void;
  resetDemoData: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
  removeToast: (id: string) => void;
  checkInStudent: (sessionId: string, studentId: string, method?: string, coords?: CheckInCoords) => CheckInResult;
  checkOutStudent: (sessionId: string, studentId: string, coords?: CheckInCoords) => CheckOutResult;
  createSession: (session: Omit<LabSession, 'id' | 'status' | 'coordinatorId'>) => LabSession;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void;
  markAttendanceManual: (sessionId: string, studentId: string, status: AttendanceStatus, reason: string) => void;
  submitCorrectionRequest: (recordId: string, requestedStatus: AttendanceStatus, reason: string) => void;
  updateCorrectionStatus: (correctionId: string, status: 'approved' | 'rejected') => void;
  simulateRandomArrival: (sessionId: string) => User | null;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  registerWithEmail: (email: string, pass: string, name: string, role?: UserRole, studentId?: string) => Promise<User>;
  createCoordinatorInvite: () => Promise<CoordinatorInvite>;
  registerCoordinatorWithInvite: (token: string, email: string, pass: string, name: string) => Promise<User>;
  logoutFirebase: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => loadStoredState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Keep state synced with localStorage as offline/fast cache
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

  // Initialize Firebase Analytics, Auth Listener & Realtime Firestore listeners
  useEffect(() => {
    initAnalytics();

    // Listen to Firebase Auth state
    const unsubscribeAuth = listenToAuthChanges((profile: User | null, fbUser: FirebaseUser | null) => {
      setFirebaseUser(fbUser);
      if (profile) {
        setState(prev => ({
          ...prev,
          currentUser: profile,
          currentRole: profile.role,
        }));
      }
    });

    // Seed Firestore if empty
    seedFirestoreIfEmpty().then((seeded: boolean) => {
      if (seeded) {
        console.log('Seeded initial sessions and attendance to Firestore BaaS');
      }
      setIsCloudConnected(true);
    }).catch((err: unknown) => {
      console.warn('Firestore seeding check failed:', err);
    });

    // Realtime Firestore listeners
    const unsubSessions = subscribeToSessions((cloudSessions: LabSession[]) => {
      if (cloudSessions.length > 0) {
        setState(prev => ({ ...prev, sessions: cloudSessions }));
        setIsCloudConnected(true);
      }
    });

    const unsubAttendance = subscribeToAttendance((cloudAttendance: AttendanceRecord[]) => {
      if (cloudAttendance.length > 0) {
        setState(prev => ({ ...prev, attendanceRecords: cloudAttendance }));
        setIsCloudConnected(true);
      }
    });

    const unsubCorrections = subscribeToCorrections((cloudCorrections: CorrectionRequest[]) => {
      if (cloudCorrections.length > 0) {
        setState(prev => ({ ...prev, corrections: cloudCorrections }));
        setIsCloudConnected(true);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubSessions();
      unsubAttendance();
      unsubCorrections();
    };
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

  const checkInStudent = useCallback((
    sessionId: string,
    studentId: string,
    method = 'QR Code',
    coords?: CheckInCoords
  ): CheckInResult => {
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

    // Geofence & Proximity Verification
    let attendanceLocation: AttendanceLocation | undefined = undefined;
    if (session.geofence && session.geofence.enabled) {
      if (!coords) {
        return {
          success: false,
          code: 'geolocation_required',
          message: `Device GPS location is required to verify physical presence in ${session.geofence.venueName || session.room}. Please enable device location access.`,
        };
      }

      const evaluation = evaluateGeofenceProximity(
        coords.latitude,
        coords.longitude,
        coords.accuracy || 10,
        session.geofence
      );

      attendanceLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 10,
        distanceMeters: evaluation.distanceMeters,
        isWithinGeofence: evaluation.isWithin,
        timestamp: new Date().toISOString(),
      };

      if (!evaluation.isWithin && session.geofence.strictEnforcement) {
        return {
          success: false,
          code: 'geofence_out_of_range',
          message: `Location out of range: You are ${formatDistance(evaluation.distanceMeters)} away from ${session.geofence.venueName || session.room}. Must be within ${session.geofence.radiusMeters}m to check in.`,
          distanceMeters: evaluation.distanceMeters,
          requiredRadius: session.geofence.radiusMeters,
          venueName: session.geofence.venueName || session.room,
          isWithinGeofence: false,
        };
      }
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

    const geoAudit = attendanceLocation
      ? ` [GPS: ${formatDistance(attendanceLocation.distanceMeters)} from venue, ±${attendanceLocation.accuracy}m accuracy, ${attendanceLocation.isWithinGeofence ? 'Verified Inside' : 'Flagged Outside'}]`
      : '';

    const newRecord: AttendanceRecord = {
      id: existing ? existing.id : `rec-${Date.now()}-${studentId}`,
      sessionId,
      studentId,
      status: finalStatus,
      checkedInAt: now.toISOString(),
      updatedBy: `student-${method.toLowerCase()}`,
      note: isLate ? `Checked in ${diffMinutes} minutes after start threshold` : undefined,
      location: attendanceLocation,
      audit: [
        ...(existing?.audit || []),
        {
          at: now.toISOString(),
          actorId: studentId,
          action: `Checked in via ${method} (${finalStatus.toUpperCase()})${geoAudit}`,
        },
      ],
    };

    // Optimistic local state update
    setState(prev => {
      const filtered = prev.attendanceRecords.filter(r => !(r.sessionId === sessionId && r.studentId === studentId));
      return {
        ...prev,
        attendanceRecords: [newRecord, ...filtered],
      };
    });

    // Asynchronously push to Firebase Firestore
    saveAttendanceToFirestore(newRecord).catch((err: unknown) => {
      console.warn('Could not sync attendance to Firestore:', err);
    });

    const distInfo = attendanceLocation ? ` (📍 ${formatDistance(attendanceLocation.distanceMeters)})` : '';
    addToast(
      isLate ? `Checked in as Late (${session.title})${distInfo}` : `Successfully checked in to ${session.courseCode || session.title}!${distInfo}`,
      isLate ? 'info' : 'success',
      isLate ? 'Late Check-in' : 'Attendance Confirmed'
    );

    return {
      success: true,
      code: isLate ? 'success_late' : 'success_present',
      message: isLate
        ? `You were checked in late (${diffMinutes} min past threshold).`
        : 'Your presence and location have been recorded and verified for today’s practical session.',
      record: newRecord,
      distanceMeters: attendanceLocation?.distanceMeters,
      isWithinGeofence: attendanceLocation?.isWithinGeofence,
    };
  }, [state.sessions, state.attendanceRecords, addToast]);

  const checkOutStudent = useCallback((
    sessionId: string,
    studentId: string,
    coords?: CheckInCoords
  ): CheckOutResult => {
    const existing = state.attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
    if (!existing || !existing.checkedInAt) {
      return { success: false, message: 'You must check in before checking out.' };
    }

    if (existing.checkedOutAt) {
      return { success: false, message: `Already checked out at ${new Date(existing.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` };
    }

    const session = state.sessions.find(s => s.id === sessionId);
    const now = new Date().toISOString();

    let checkoutLocation: AttendanceLocation | undefined = undefined;
    if (coords) {
      const distance = session?.geofence
        ? calculateHaversineDistanceMeters(coords.latitude, coords.longitude, session.geofence.latitude, session.geofence.longitude)
        : 0;
      const isWithin = session?.geofence ? distance <= session.geofence.radiusMeters : true;
      checkoutLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy || 10,
        distanceMeters: distance,
        isWithinGeofence: isWithin,
        timestamp: now,
      };
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkedOutAt: now,
      checkoutLocation,
      audit: [
        ...existing.audit,
        {
          at: now,
          actorId: studentId,
          action: checkoutLocation
            ? `Student checked out [GPS: ${formatDistance(checkoutLocation.distanceMeters)} from venue]`
            : 'Student checked out successfully',
        },
      ],
    };

    // Optimistic local state update
    setState(prev => ({
      ...prev,
      attendanceRecords: prev.attendanceRecords.map(r => r.id === existing.id ? updatedRecord : r),
    }));

    // Asynchronously update in Firestore
    saveAttendanceToFirestore(updatedRecord).catch((err: unknown) => {
      console.warn('Could not sync checkout to Firestore:', err);
    });

    addToast('Lab practical check-out confirmed. Good work today!', 'success', 'Checked Out');

    return {
      success: true,
      message: 'Check-out completed successfully. Your exit timestamp and location have been recorded.',
      record: updatedRecord,
      distanceMeters: checkoutLocation?.distanceMeters,
      isWithinGeofence: checkoutLocation?.isWithinGeofence,
    };
  }, [state.sessions, state.attendanceRecords, addToast]);

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

    // Asynchronously push to Firestore
    saveSessionToFirestore(newSession).catch((err: unknown) => {
      console.warn('Could not sync created session to Firestore:', err);
    });

    addToast(`Session "${newSession.title}" scheduled successfully`, 'success', 'Session Created');
    return newSession;
  }, [state.currentUser.id, addToast]);

  const updateSessionStatus = useCallback((sessionId: string, status: SessionStatus) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, status } : s),
    }));

    // Update in Firestore
    updateSessionStatusInFirestore(sessionId, status).catch((err: unknown) => {
      console.warn('Could not sync session status to Firestore:', err);
    });

    addToast(`Session status updated to ${status.toUpperCase()}`, 'info');
  }, [addToast]);

  const markAttendanceManual = useCallback((
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    reason: string
  ) => {
    const now = new Date().toISOString();
    let recordToSave: AttendanceRecord;

    setState(prev => {
      const existing = prev.attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
      let updatedRecords: AttendanceRecord[];

      if (existing) {
        recordToSave = {
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
        updatedRecords = prev.attendanceRecords.map(r => r.id === existing.id ? recordToSave : r);
      } else {
        recordToSave = {
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
        updatedRecords = [recordToSave, ...prev.attendanceRecords];
      }

      // Save to Firestore
      saveAttendanceToFirestore(recordToSave).catch((err: unknown) => {
        console.warn('Could not sync manual attendance to Firestore:', err);
      });

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

    // Save to Firestore
    saveCorrectionToFirestore(newCorrection).catch((err: unknown) => {
      console.warn('Could not sync correction request to Firestore:', err);
    });

    addToast('Correction request submitted to the lab coordinator for review', 'success', 'Request Sent');
  }, [state.attendanceRecords, addToast]);

  const updateCorrectionStatus = useCallback((correctionId: string, status: 'approved' | 'rejected') => {
    const correction = state.corrections.find(c => c.id === correctionId);
    if (!correction) return;

    setState(prev => {
      let updatedAttendance = prev.attendanceRecords;
      if (status === 'approved') {
        updatedAttendance = prev.attendanceRecords.map(rec => {
          if (rec.id === correction.recordId) {
            const updated: AttendanceRecord = {
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
            saveAttendanceToFirestore(updated).catch(console.warn);
            return updated;
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

    // Update in Firestore
    updateCorrectionInFirestore(correctionId, status).catch(console.warn);

    addToast(`Correction request ${status}`, status === 'approved' ? 'success' : 'info');
  }, [state.corrections, addToast]);

  const simulateRandomArrival = useCallback((sessionId: string): User | null => {
    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return null;

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

    let simulatedCoords: CheckInCoords | undefined = undefined;
    if (session.geofence && session.geofence.enabled) {
      // 0.0001 deg is approx 11m
      const offsetLat = (Math.random() - 0.5) * 0.0002;
      const offsetLng = (Math.random() - 0.5) * 0.0002;
      simulatedCoords = {
        latitude: session.geofence.latitude + offsetLat,
        longitude: session.geofence.longitude + offsetLng,
        accuracy: 8,
      };
    }

    checkInStudent(sessionId, chosenStudent.id, 'Simulated Proximity Scan', simulatedCoords);
    return chosenStudent;
  }, [state.sessions, state.attendanceRecords, state.students, checkInStudent, addToast]);

  const loginWithEmail = async (email: string, pass: string): Promise<User> => {
    try {
      const userProfile = await signInUser(email, pass);
      setState(prev => ({
        ...prev,
        currentUser: userProfile,
        currentRole: userProfile.role,
      }));
      addToast(`Signed in as ${userProfile.name} (${userProfile.role})`, 'success', 'Authenticated');
      return userProfile;
    } catch (err: any) {
      addToast(err.message || 'Failed to sign in', 'error', 'Authentication Error');
      throw err;
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'student',
    studentId?: string
  ): Promise<User> => {
    try {
      const userProfile = await signUpUser(email, pass, name, role, studentId);
      setState(prev => ({
        ...prev,
        currentUser: userProfile,
        currentRole: userProfile.role,
      }));
      addToast(`Account created for ${userProfile.name}`, 'success', 'Welcome');
      return userProfile;
    } catch (err: any) {
      addToast(err.message || 'Failed to register', 'error', 'Registration Error');
      throw err;
    }
  };

  const createCoordinatorInviteLink = async (): Promise<CoordinatorInvite> => {
    if (!firebaseUser || state.currentRole !== 'coordinator') {
      throw new Error('Sign in with a coordinator account to create an onboarding link.');
    }
    return createCoordinatorInvite(firebaseUser.uid);
  };

  const registerCoordinatorFromInvite = async (token: string, email: string, pass: string, name: string): Promise<User> => {
    const userProfile = await signUpCoordinatorWithInvite(token, email, pass, name);
    setState(prev => ({ ...prev, currentUser: userProfile, currentRole: 'coordinator' }));
    addToast(`Coordinator account created for ${userProfile.name}`, 'success', 'Welcome');
    return userProfile;
  };

  const logoutFirebase = async () => {
    await signOutUser();
    addToast('Signed out of Firebase account', 'info');
  };

  const syncToCloud = async () => {
    try {
      for (const s of state.sessions) {
        await saveSessionToFirestore(s);
      }
      for (const a of state.attendanceRecords) {
        await saveAttendanceToFirestore(a);
      }
      for (const c of state.corrections) {
        await saveCorrectionToFirestore(c);
      }
      setIsCloudConnected(true);
      addToast('All local data successfully synchronized to Firebase Firestore!', 'success', 'Cloud Synced');
    } catch (err: any) {
      addToast('Failed to sync to Firebase: ' + err.message, 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRole: state.currentRole,
        currentUser: state.currentUser,
        firebaseUser,
        isCloudConnected,
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
        loginWithEmail,
        registerWithEmail,
        createCoordinatorInvite: createCoordinatorInviteLink,
        registerCoordinatorWithInvite: registerCoordinatorFromInvite,
        logoutFirebase,
        syncToCloud,
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
