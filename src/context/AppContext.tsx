import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { initAnalytics } from '../services/firebase';
import {
  listenToAuthChanges,
  signInUser,
  signUpUser,
  signUpCoordinator,
  signOutUser,
  signUpCoordinatorWithInvite,
  updateRegisteredProfile,
} from '../services/authService';
import {
  subscribeToSessions,
  subscribeToAttendance,
  subscribeToCorrections,
  subscribeToStudents,
  saveAttendanceToFirestore,
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  updateSessionStatusInFirestore,
  saveCorrectionToFirestore,
  updateCorrectionInFirestore,
  seedFirestoreIfEmpty,
  createCoordinatorInvite,
  createDemoCoordinatorInvite,
} from '../services/firestoreService';
import type { CoordinatorInvite } from '../services/firestoreService';
import {
  evaluateGeofenceProximity,
  formatDistance,
  getDeviceCurrentPosition,
} from '../services/geoService';
import {
  notifySessionLive,
  notifySessionScheduled,
  notifyCorrectionDecision,
  notifyCoordinatorAttendeeEvent,
  setupForegroundNotificationListener,
  triggerSystemNotification,
  pingBackendHealth,
  autoReconcileFcmPush,
} from '../services/fcmClientService';
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
  code?: 'geolocation_required' | 'geofence_out_of_range';
  message: string;
  record?: AttendanceRecord;
  distanceMeters?: number;
  isWithinGeofence?: boolean;
}

interface AppContextValue {
  currentRole: UserRole;
  currentUser: User;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
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
  checkOutStudent: (sessionId: string, studentId: string) => Promise<CheckOutResult>;
  createSession: (session: Omit<LabSession, 'id' | 'status' | 'coordinatorId'>) => Promise<LabSession> | LabSession;
  updateSession: (sessionId: string, session: Omit<LabSession, 'id' | 'status' | 'coordinatorId'>) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void;
  markAttendanceManual: (sessionId: string, studentId: string, status: AttendanceStatus, reason: string) => void;
  submitCorrectionRequest: (recordId: string, requestedStatus: AttendanceStatus, reason: string) => void;
  updateCorrectionStatus: (correctionId: string, status: 'approved' | 'rejected' | 'resolved') => void;
  simulateRandomArrival: (sessionId: string) => User | null;
  loginWithEmail: (email: string, pass: string) => Promise<User>;
  registerWithEmail: (email: string, pass: string, name: string, role?: UserRole, studentId?: string) => Promise<User>;
  createCoordinatorInvite: () => Promise<CoordinatorInvite>;
  registerCoordinatorWithInvite: (token: string, email: string, pass: string, name: string) => Promise<User>;
  registerCoordinator: (
    email: string,
    pass: string,
    name: string,
    staffId: string,
    department: string,
    designation: string,
    labRoom: string,
    inviteToken?: string
  ) => Promise<User>;
  updateCurrentUser: (changes: Partial<Pick<User, 'name' | 'email' | 'studentId' | 'programme' | 'level' | 'labRoom'>>) => Promise<void>;
  logoutFirebase: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => loadStoredState());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [cloudAttendanceReady, setCloudAttendanceReady] = useState({ sessions: false, attendance: false });

  const stateRef = useRef(state);
  stateRef.current = state;

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

  // Initialize Firebase Analytics & Listen to Firebase Auth state
  useEffect(() => {
    initAnalytics();

    const unsubscribeAuth = listenToAuthChanges((profile: User | null, fbUser: FirebaseUser | null) => {
      setFirebaseUser(fbUser);
      if (profile) {
        setState(prev => ({
          ...prev,
          currentUser: profile,
          currentRole: profile.role,
        }));
      } else if (!fbUser) {
        setState(prev => ({
          ...prev,
          currentUser: null as any,
        }));
      }
      setAuthLoading(false);
    });

    // Seed Firestore connectivity check
    seedFirestoreIfEmpty().then((seeded: boolean) => {
      if (seeded) {
        console.log('Seeded initial sessions and attendance to Firestore BaaS');
      }
      setIsCloudConnected(true);
    }).catch((err: unknown) => {
      console.warn('Firestore seeding check:', err);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const effectiveRole = state.currentRole || state.currentUser?.role || 'student';
  const effectiveUid = firebaseUser?.uid || state.currentUser?.id;

  // Manage Realtime Firestore Listeners Reactively (re-established when user authenticates or role changes)
  useEffect(() => {
    if (!firebaseUser) {
      setIsCloudConnected(false);
      setCloudAttendanceReady({ sessions: false, attendance: false });
      return;
    }

    setIsCloudConnected(true);
    setCloudAttendanceReady({ sessions: false, attendance: false });

    // Track initial syncs to avoid firing duplicate alerts on first load
    let initialSessionsSync = true;
    let initialAttendanceSync = true;
    let initialCorrectionsSync = true;

    // 1. Live meeting sessions
    const unsubSessions = subscribeToSessions((cloudSessions: LabSession[]) => {
      if (!initialSessionsSync) {
        // Detect session transitioning to live
        cloudSessions.forEach(sess => {
          const prev = stateRef.current.sessions.find(s => s.id === sess.id);
          if (sess.status === 'live' && prev?.status !== 'live' && effectiveRole === 'student') {
            triggerSystemNotification(
              `🔴 Meeting Live: ${sess.title}`,
              `Check-in is now open at ${sess.room || 'the lab'}. Tap to verify attendance.`,
              `/student/sessions/${sess.id}`
            );
          }
        });
      }
      initialSessionsSync = false;
      setState(prev => ({ ...prev, sessions: cloudSessions }));
      setCloudAttendanceReady(prev => ({ ...prev, sessions: true }));
    });

    // 2. Live Registered Students
    const unsubStudents = subscribeToStudents((cloudStudents: User[]) => {
      setState(prev => ({ ...prev, students: cloudStudents }));
    });

    // 3. Live Attendance (scoped to studentId for students, global for coordinators)
    const unsubAttendance = subscribeToAttendance(
      (cloudAttendance: AttendanceRecord[]) => {
        if (!initialAttendanceSync && effectiveRole === 'coordinator') {
          // Detect new check-ins or check-outs
          const existingIds = new Set(stateRef.current.attendanceRecords.map(r => r.id));
          cloudAttendance.forEach(rec => {
            if (!existingIds.has(rec.id) && (rec.status === 'present' || rec.status === 'late')) {
              const studentName = stateRef.current.students.find(s => s.id === rec.studentId)?.name || 'Attendee';
              const sessTitle = stateRef.current.sessions.find(s => s.id === rec.sessionId)?.title || 'Meeting';
              triggerSystemNotification(
                `🟢 Attendee Checked In: ${studentName}`,
                `${studentName} checked in as ${rec.status.toUpperCase()} for "${sessTitle}".`,
                `/coordinator/sessions/${rec.sessionId}`
              );
            }
          });
        }
        initialAttendanceSync = false;
        setState(prev => ({ ...prev, attendanceRecords: cloudAttendance }));
        setCloudAttendanceReady(prev => ({ ...prev, attendance: true }));
      },
      effectiveRole,
      effectiveUid
    );

    // 4. Live Corrections (scoped to studentId for students, global for coordinators)
    const unsubCorrections = subscribeToCorrections(
      (cloudCorrections: CorrectionRequest[]) => {
        if (!initialCorrectionsSync) {
          if (effectiveRole === 'coordinator') {
            const existingCorrIds = new Set(stateRef.current.corrections.map(c => c.id));
            cloudCorrections.forEach(corr => {
              if (!existingCorrIds.has(corr.id) && corr.status === 'pending') {
                const studentName = stateRef.current.students.find(s => s.id === corr.studentId)?.name || 'Attendee';
                triggerSystemNotification(
                  `⚖️ New Issue Request: ${studentName}`,
                  `${studentName} submitted an attendance correction for coordinator review.`,
                  '/coordinator'
                );
              }
            });
          } else if (effectiveRole === 'student') {
            cloudCorrections.forEach(corr => {
              const prevCorr = stateRef.current.corrections.find(c => c.id === corr.id);
              if (corr.studentId === effectiveUid && corr.status !== 'pending' && prevCorr?.status === 'pending') {
                triggerSystemNotification(
                  `Correction ${corr.status === 'approved' ? 'Approved ✅' : corr.status === 'resolved' ? 'Resolved ✅' : 'Rejected ❌'}`,
                  `Your attendance correction was ${corr.status}.`,
                  '/student/history'
                );
              }
            });
          }
        }
        initialCorrectionsSync = false;
        setState(prev => ({ ...prev, corrections: cloudCorrections }));
      },
      effectiveRole,
      effectiveUid
    );

    return () => {
      unsubSessions();
      unsubStudents();
      unsubAttendance();
      unsubCorrections();
    };
  }, [firebaseUser?.uid, effectiveRole, effectiveUid]);

  // Listen for foreground push notifications and display notification toast + native OS notification
  useEffect(() => {
    let unsubPromise: Promise<(() => void) | null> | null = null;
    unsubPromise = setupForegroundNotificationListener(payload => {
      const title = payload.title || 'Innovations Lab Attendance';
      const body = payload.body || 'New session or attendance update.';

      addToast(body, 'info', title);
    });

    return () => {
      if (unsubPromise) {
        unsubPromise.then(unsub => {
          if (unsub) unsub();
        });
      }
    };
  }, [addToast]);

  // Seamless auto-reconciliation of FCM push subscription across server restarts, app launches, and network reconnects
  useEffect(() => {
    const uid = firebaseUser?.uid || state.currentUser?.id;
    if (!uid) return;
    const role = state.currentUser?.role || state.currentRole || 'student';

    // 1. Initial silent reconciliation on user auth / state load
    autoReconcileFcmPush(uid, role).catch(() => {});

    // 2. Re-reconcile when window regains focus or comes back online
    const handleSync = () => {
      autoReconcileFcmPush(uid, role).catch(() => {});
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('online', handleSync);

    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('online', handleSync);
    };
  }, [firebaseUser?.uid, state.currentUser?.id, state.currentUser?.role, state.currentRole]);

  // Client keep-alive ping for backend service on Render with automatic push resync
  useEffect(() => {
    const triggerReconcile = () => {
      const uid = firebaseUser?.uid || stateRef.current.currentUser?.id;
      const role = stateRef.current.currentUser?.role || stateRef.current.currentRole || 'student';
      if (uid) {
        autoReconcileFcmPush(uid, role).catch(() => {});
      }
    };

    pingBackendHealth().then(res => {
      if (res.healthy) triggerReconcile();
    }).catch(() => {});

    const interval = setInterval(() => {
      pingBackendHealth().then(res => {
        if (res.healthy) triggerReconcile();
      }).catch(() => {});
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [firebaseUser?.uid]);

  // Close expired sessions and record roster members who never checked in. Coordinators reconcile
  // the full roster; students can also record their own missed status when their app is active.
  useEffect(() => {
    const role = state.currentUser?.role;
    if (role !== 'coordinator' && role !== 'student') return;
    if (firebaseUser && !(cloudAttendanceReady.sessions && cloudAttendanceReady.attendance)) return;

    const finalizeEndedSessions = () => {
      const now = Date.now();
      const endedSessions = state.sessions.filter(session => {
        const endTime = new Date(session.endsAt).getTime();
        return session.status !== 'cancelled' && Number.isFinite(endTime) && endTime <= now;
      });
      if (endedSessions.length === 0) return;

      const absentRecords: AttendanceRecord[] = [];
      const currentStudentId = state.currentUser?.id;
      for (const session of endedSessions) {
        const sessionRoster = new Set(session.eligibleStudentIds || []);
        const roster = role === 'coordinator'
          ? sessionRoster
          : new Set(currentStudentId && sessionRoster.has(currentStudentId) ? [currentStudentId] : []);
        for (const studentId of roster) {
          const existing = state.attendanceRecords.find(record => record.sessionId === session.id && record.studentId === studentId);
          if (existing) continue;
          const nowIso = new Date(now).toISOString();
          absentRecords.push({
            id: `absent-${session.id}-${studentId}`,
            sessionId: session.id,
            studentId,
            status: 'absent',
            updatedBy: 'attendance-system',
            note: 'Missed: no attendance was verified before the session ended.',
            audit: [{ at: nowIso, actorId: 'attendance-system', action: 'Automatically marked missed when session duration ended.' }],
          });
        }
      }

      const sessionsToComplete = role === 'coordinator'
        ? endedSessions.filter(session => session.status !== 'completed')
        : [];
      if (absentRecords.length === 0 && sessionsToComplete.length === 0) return;

      setState(previous => ({
        ...previous,
        sessions: role === 'coordinator'
          ? previous.sessions.map(session =>
              endedSessions.some(ended => ended.id === session.id) ? { ...session, status: 'completed' } : session
            )
          : previous.sessions,
        attendanceRecords: [
          ...absentRecords.filter(absent => !previous.attendanceRecords.some(record => record.sessionId === absent.sessionId && record.studentId === absent.studentId)),
          ...previous.attendanceRecords,
        ],
      }));

      for (const session of sessionsToComplete) {
        updateSessionStatusInFirestore(session.id, 'completed').catch((error: unknown) => {
          console.warn('Could not sync the automatically completed session:', error);
        });
      }
      for (const record of absentRecords) {
        saveAttendanceToFirestore(record).catch((error: unknown) => {
          console.warn('Could not sync automatic missed attendance:', error);
        });
      }
    };

    finalizeEndedSessions();
    const nextEndTime = state.sessions
      .filter(session => session.status !== 'cancelled')
      .map(session => new Date(session.endsAt).getTime())
      .filter(endTime => Number.isFinite(endTime) && endTime > Date.now())
      .sort((a, b) => a - b)[0];
    if (!nextEndTime) return;
    const timer = window.setTimeout(finalizeEndedSessions, Math.min(2_147_000_000, Math.max(0, nextEndTime - Date.now() + 20)));
    return () => window.clearTimeout(timer);
  }, [state.currentUser?.role, state.currentUser?.id, state.sessions, state.students, state.attendanceRecords, firebaseUser, cloudAttendanceReady]);

  const switchRole = useCallback((role: UserRole) => {
    setState(prev => ({
      ...prev,
      currentRole: role,
    }));
    addToast(`Switched view to ${role === 'student' ? 'Attendee mode' : 'Lab Coordinator mode'}`, 'info');
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
          : 'This meeting session has ended and check-in is closed.',
      };
    }

    if (new Date(session.endsAt).getTime() <= Date.now()) {
      return {
        success: false,
        code: 'not_open',
        message: 'This session duration has ended and attendance is now closed.',
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
        message: `Attendance already recorded: You are already marked as ${existing.status.toUpperCase()} for this session. PIN check-in and QR scan are equal alternatives—duplicate check-ins are not permitted.`,
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

    // Notify coordinators of student arrival
    const studentUser = state.students.find(s => s.id === studentId) || (state.currentUser?.id === studentId ? state.currentUser : undefined);
    notifyCoordinatorAttendeeEvent({
      type: 'checkin',
      studentName: studentUser?.name || 'Attendee',
      studentId,
      sessionTitle: session.title,
      sessionId: session.id,
      status: finalStatus,
    }).catch(err => {
      console.warn('Could not fire coordinator check-in alert:', err);
    });

    const distInfo = attendanceLocation ? ` (📍 ${formatDistance(attendanceLocation.distanceMeters)})` : '';
    addToast(
      isLate ? `Checked in as Late (${session.title})${distInfo}` : `Successfully checked in to ${session.title}!${distInfo}`,
      isLate ? 'info' : 'success',
      isLate ? 'Late Check-in' : 'Attendance Confirmed'
    );

    return {
      success: true,
      code: isLate ? 'success_late' : 'success_present',
      message: isLate
        ? `You were checked in late (${diffMinutes} min past threshold).`
        : 'Your arrival and location have been recorded for this meeting.',
      record: newRecord,
      distanceMeters: attendanceLocation?.distanceMeters,
      isWithinGeofence: attendanceLocation?.isWithinGeofence,
    };
  }, [state.sessions, state.attendanceRecords, addToast]);

  const checkOutStudent = useCallback(async (
    sessionId: string,
    studentId: string
  ): Promise<CheckOutResult> => {
    const existing = state.attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
    if (!existing || !existing.checkedInAt) {
      return { success: false, message: 'You must check in before checking out.' };
    }

    if (existing.checkedOutAt) {
      return { success: false, message: `Already checked out at ${new Date(existing.checkedOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` };
    }

    const session = state.sessions.find(s => s.id === sessionId);
    if (!session) return { success: false, message: 'This session could not be found.' };

    let position;
    try {
      position = await getDeviceCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    } catch (error) {
      return {
        success: false,
        code: 'geolocation_required',
        message: error instanceof Error ? error.message : 'Device location access is required to check out.',
      };
    }

    const now = new Date().toISOString();

    let distance = 0;
    let isWithin = true;
    if (session.geofence?.enabled) {
      const proximity = evaluateGeofenceProximity(
        position.latitude,
        position.longitude,
        position.accuracy,
        session.geofence
      );
      distance = proximity.distanceMeters;
      isWithin = proximity.isWithin;
      if (!isWithin) {
        return {
          success: false,
          code: 'geofence_out_of_range',
          message: `Check-out blocked: you are ${formatDistance(distance)} from ${session.geofence.venueName || session.room}. Move within ${session.geofence.radiusMeters}m of the session location and try again.`,
          distanceMeters: distance,
          isWithinGeofence: false,
        };
      }
    }

    const checkoutLocation: AttendanceLocation = {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      distanceMeters: distance,
      isWithinGeofence: isWithin,
      timestamp: now,
    };

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkedOutAt: now,
      checkoutLocation,
      audit: [
        ...existing.audit,
        {
          at: now,
          actorId: studentId,
          action: `Attendee checked out [GPS: ${formatDistance(checkoutLocation.distanceMeters)} from venue; accuracy ±${checkoutLocation.accuracy}m]`,
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

    // Notify coordinators of student departure
    const studentUser = state.students.find(s => s.id === studentId) || (state.currentUser?.id === studentId ? state.currentUser : undefined);
    notifyCoordinatorAttendeeEvent({
      type: 'checkout',
      studentName: studentUser?.name || 'Attendee',
      studentId,
      sessionTitle: session.title,
      sessionId: session.id,
    }).catch(err => {
      console.warn('Could not fire coordinator check-out alert:', err);
    });

    addToast('Your departure has been recorded. Thank you!', 'success', 'Checked Out');

    return {
      success: true,
      message: 'Check-out completed successfully. Your exit timestamp and location have been recorded.',
      record: updatedRecord,
      distanceMeters: checkoutLocation?.distanceMeters,
      isWithinGeofence: checkoutLocation?.isWithinGeofence,
    };
  }, [state.sessions, state.attendanceRecords, addToast]);

  const createSession = useCallback(async (data: Omit<LabSession, 'id' | 'status' | 'coordinatorId'>): Promise<LabSession> => {
    const id = `session-${crypto.randomUUID()}`;
    const coordId = firebaseUser?.uid || state.currentUser?.id || 'coord-admin';
    const newSession: LabSession = {
      ...data,
      id,
      coordinatorId: coordId,
      status: 'scheduled',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      qrCode: `LABATTEND:${id}`,
    };

    setState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions.filter(s => s.id !== id)],
    }));

    try {
      await saveSessionToFirestore(newSession);
      addToast(`Session "${newSession.title}" scheduled successfully`, 'success', 'Session Created');

      // Dispatch FCM push notification to subscribed user accounts
      notifySessionScheduled(newSession).catch((err) => {
        console.warn('Could not fire scheduled session push notification:', err);
      });
    } catch (err: any) {
      console.warn('Could not sync created session to Firestore:', err);
      addToast('Session saved, but may not be visible on other devices yet.', 'info');
    }

    return newSession;
  }, [firebaseUser?.uid, state.currentUser?.id, addToast]);

  const updateSessionStatus = useCallback((sessionId: string, status: SessionStatus) => {
    const existingSession = state.sessions.find(s => s.id === sessionId);

    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, status } : s),
    }));

    // Update in Firestore
    updateSessionStatusInFirestore(sessionId, status).catch((err: unknown) => {
      console.warn('Could not sync session status to Firestore:', err);
    });

    // When a coordinator toggles a session live, fire push notifications
    if (status === 'live' && existingSession) {
      notifySessionLive({ ...existingSession, status: 'live' }).catch((err) => {
        console.warn('Could not fire live session push notification:', err);
      });
    }

    addToast(`Session status updated to ${status.toUpperCase()}`, 'info');
  }, [state.sessions, addToast]);

  const updateSession = useCallback((sessionId: string, updates: Omit<LabSession, 'id' | 'status' | 'coordinatorId'>) => {
    const existing = state.sessions.find(session => session.id === sessionId);
    if (!existing) return;
    const updatedSession = { ...existing, ...updates };
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(session => session.id === sessionId ? updatedSession : session),
    }));
    saveSessionToFirestore(updatedSession).catch((err: unknown) => {
      console.warn('Could not sync updated session to Firestore:', err);
    });
    addToast(`Session "${updatedSession.title}" updated successfully`, 'success', 'Session Updated');
  }, [state.sessions, addToast]);

  const deleteSession = useCallback((sessionId: string) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.filter(session => session.id !== sessionId),
    }));
    deleteSessionFromFirestore(sessionId).catch((err: unknown) => {
      console.warn('Could not delete session from Firestore:', err);
      addToast('Unable to delete the session. Please try again.', 'error');
    });
    addToast('Session deleted.', 'success', 'Session Deleted');
  }, [addToast]);

  const markAttendanceManual = useCallback((
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    reason: string
  ) => {
    const now = new Date().toISOString();
    let recordToSave: AttendanceRecord;
    const pendingCorrections = state.corrections.filter(
      correction => correction.sessionId === sessionId && correction.studentId === studentId && correction.status === 'pending'
    );

    setState(prev => {
      const existing = prev.attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentId);
      let updatedRecords: AttendanceRecord[];

      if (existing) {
        recordToSave = {
          ...existing,
          status,
          updatedBy: prev.currentUser?.id || 'admin',
          note: reason,
          checkedInAt: existing.checkedInAt || (status === 'present' || status === 'late' ? now : undefined),
          audit: [
            ...existing.audit,
            {
              at: now,
              actorId: prev.currentUser?.id || 'admin',
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
          updatedBy: prev.currentUser?.id || 'admin',
          note: reason,
          audit: [
            {
              at: now,
              actorId: prev.currentUser?.id || 'admin',
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

    if (pendingCorrections.length > 0) {
      const resolvedIds = new Set(pendingCorrections.map(correction => correction.id));
      setState(prev => ({
        ...prev,
        corrections: prev.corrections.map(correction => resolvedIds.has(correction.id) ? { ...correction, status: 'resolved' } : correction),
      }));
      pendingCorrections.forEach(correction => {
        updateCorrectionInFirestore(correction.id, 'resolved').catch((err: unknown) => {
          console.warn('Could not sync resolved attendance correction:', err);
        });

        // Fire FCM push notification to student about resolution
        const sessionObj = state.sessions.find(s => s.id === sessionId);
        notifyCorrectionDecision({
          studentId: correction.studentId,
          sessionTitle: sessionObj?.title || 'Lab Session',
          status: 'resolved',
          decisionReason: reason || `Coordinator manually resolved attendance to ${status.toUpperCase()}`,
        }).catch(err => {
          console.warn('Could not fire manual resolution push notification:', err);
        });
      });
    }

    addToast(`Attendee marked as ${status.toUpperCase()}`, 'success', 'Attendance Updated');
  }, [state.corrections, state.sessions, addToast]);

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

    // Notify coordinators that an issue/correction was submitted
    const studentUser = state.students.find(s => s.id === record.studentId) || (state.currentUser?.id === record.studentId ? state.currentUser : undefined);
    const sessionObj = state.sessions.find(s => s.id === record.sessionId);
    notifyCoordinatorAttendeeEvent({
      type: 'correction_submitted',
      studentName: studentUser?.name || 'Attendee',
      studentId: record.studentId,
      sessionTitle: sessionObj?.title || 'Lab Session',
      sessionId: record.sessionId,
      reason,
      status: requestedStatus,
    }).catch(err => {
      console.warn('Could not fire coordinator correction alert:', err);
    });

    addToast('Correction request submitted to the lab coordinator for review', 'success', 'Request Sent');
  }, [state.attendanceRecords, state.students, state.sessions, state.currentUser, addToast]);

  const updateCorrectionStatus = useCallback((correctionId: string, status: 'approved' | 'rejected' | 'resolved') => {
    const correction = state.corrections.find(c => c.id === correctionId);
    if (!correction) return;
    const sessionObj = state.sessions.find(s => s.id === correction.sessionId);

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
                  actorId: prev.currentUser?.id || 'admin',
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

    // Fire FCM push notification to the affected student account
    notifyCorrectionDecision({
      studentId: correction.studentId,
      sessionTitle: sessionObj?.title || 'Session',
      status,
      decisionReason: correction.reason,
    }).catch(err => {
      console.warn('Could not fire correction decision push notification:', err);
    });

    addToast(`Correction request ${status === 'resolved' ? 'resolved' : status}`, status === 'approved' || status === 'resolved' ? 'success' : 'info');
  }, [state.corrections, state.sessions, addToast]);

  const simulateRandomArrival = useCallback((_sessionId: string): User | null => {
    return null;
  }, []);

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
    if (state.currentRole !== 'coordinator') {
      throw new Error('Switch to a coordinator account to create an onboarding link.');
    }

    // If using local coordinator profile or unauthenticated
    if (!firebaseUser || state.currentUser?.id === 'user-coord-1') {
      return createDemoCoordinatorInvite(state.currentUser?.id || 'coord-1');
    }

    // Try creating via Firestore BaaS
    try {
      return await createCoordinatorInvite(firebaseUser.uid);
    } catch (err: any) {
      console.warn('Firestore invite creation failed, falling back to demo coordinator invite:', err);
      if (err?.code === 'permission-denied' || err?.message?.toLowerCase().includes('permission')) {
        return createDemoCoordinatorInvite(firebaseUser.uid);
      }
      throw err;
    }
  };

  const registerCoordinatorFromInvite = async (token: string, email: string, pass: string, name: string): Promise<User> => {
    const userProfile = await signUpCoordinatorWithInvite(token, email, pass, name);
    setState(prev => ({ ...prev, currentUser: userProfile, currentRole: 'coordinator' }));
    addToast(`Coordinator account created for ${userProfile.name}`, 'success', 'Welcome');
    return userProfile;
  };

  const registerCoordinator = async (
    email: string,
    pass: string,
    name: string,
    staffId: string,
    department: string,
    designation: string,
    labRoom: string,
    inviteToken?: string
  ): Promise<User> => {
    try {
      const userProfile = await signUpCoordinator(
        email,
        pass,
        name,
        staffId,
        department,
        designation,
        labRoom,
        inviteToken
      );
      setState(prev => ({
        ...prev,
        currentUser: userProfile,
        currentRole: 'coordinator',
      }));
      addToast(`Coordinator account created for ${userProfile.name}`, 'success', 'Welcome Faculty Coordinator');
      return userProfile;
    } catch (err: any) {
      addToast(err.message || 'Failed to create coordinator account', 'error', 'Registration Error');
      throw err;
    }
  };

  const updateCurrentUser = async (changes: Partial<Pick<User, 'name' | 'email' | 'studentId' | 'programme' | 'level' | 'labRoom'>>) => {
    const profile = state.currentUser;
    if (!profile) throw new Error('No signed-in profile is available to update.');
    const updatedProfile = await updateRegisteredProfile(firebaseUser, profile, changes);
    setState(prev => ({ ...prev, currentUser: updatedProfile }));
  };

  const logoutFirebase = async () => {
    await signOutUser();
    addToast('Logged out successfully', 'success');
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
      addToast('Your data is up to date.', 'success');
    } catch {
      addToast('Unable to update your data right now. Please try again.', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentRole: state.currentRole,
        currentUser: state.currentUser,
        firebaseUser,
        authLoading,
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
        updateSession,
        deleteSession,
        updateSessionStatus,
        markAttendanceManual,
        submitCorrectionRequest,
        updateCorrectionStatus,
        simulateRandomArrival,
        loginWithEmail,
        registerWithEmail,
        createCoordinatorInvite: createCoordinatorInviteLink,
        registerCoordinatorWithInvite: registerCoordinatorFromInvite,
        registerCoordinator,
        updateCurrentUser,
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
