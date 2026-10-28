import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { LabSession, AttendanceRecord, CorrectionRequest, SessionStatus } from '../types';

// Firestore Collection Names
export const SESSIONS_COLLECTION = 'sessions';
export const ATTENDANCE_COLLECTION = 'attendance';
export const CORRECTIONS_COLLECTION = 'corrections';
export const USERS_COLLECTION = 'users';
export const COORDINATOR_INVITES_COLLECTION = 'coordinatorInvites';
export const DEMO_INVITES_STORAGE_KEY = 'attendance_demo_coordinator_invites';

export interface CoordinatorInvite {
  token: string;
  createdBy: string;
  createdAt: number;
  expiresAt: Timestamp;
  usedBy: string | null;
}

export const getStoredDemoInvites = (): Record<string, CoordinatorInvite> => {
  try {
    const raw = localStorage.getItem(DEMO_INVITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const createDemoCoordinatorInvite = (createdBy: string = 'user-coord-1'): CoordinatorInvite => {
  const token = `demo-${crypto.randomUUID()}`;
  const createdAt = Date.now();
  const invite: CoordinatorInvite = {
    token,
    createdBy,
    createdAt,
    expiresAt: Timestamp.fromMillis(createdAt + 7 * 24 * 60 * 60 * 1000),
    usedBy: null,
  };
  try {
    const all = getStoredDemoInvites();
    all[token] = invite;
    localStorage.setItem(DEMO_INVITES_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to store demo invite in localStorage', err);
  }
  return invite;
};

export const createCoordinatorInvite = async (createdBy: string): Promise<CoordinatorInvite> => {
  const token = crypto.randomUUID();
  const createdAt = Date.now();
  const invite: CoordinatorInvite = {
    token,
    createdBy,
    createdAt,
    expiresAt: Timestamp.fromMillis(createdAt + 7 * 24 * 60 * 60 * 1000),
    usedBy: null,
  };
  await setDoc(doc(db, COORDINATOR_INVITES_COLLECTION, token), invite);
  return invite;
};

// Real-time listener for Sessions
export const subscribeToSessions = (onUpdate: (sessions: LabSession[]) => void): (() => void) => {
  const colRef = collection(db, SESSIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const sessionsList: LabSession[] = [];
      snapshot.forEach((docSnap) => {
        sessionsList.push(docSnap.data() as LabSession);
      });
      // Sort by start date
      sessionsList.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      onUpdate(sessionsList);
    },
    (error) => {
      console.warn('Firestore sessions subscription error:', error);
    }
  );
};

// Real-time listener for Attendance Records
export const subscribeToAttendance = (onUpdate: (records: AttendanceRecord[]) => void): (() => void) => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const recordsList: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        recordsList.push(docSnap.data() as AttendanceRecord);
      });
      onUpdate(recordsList);
    },
    (error) => {
      console.warn('Firestore attendance subscription error:', error);
    }
  );
};

// Real-time listener for Correction Requests
export const subscribeToCorrections = (onUpdate: (corrections: CorrectionRequest[]) => void): (() => void) => {
  const colRef = collection(db, CORRECTIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const correctionsList: CorrectionRequest[] = [];
      snapshot.forEach((docSnap) => {
        correctionsList.push(docSnap.data() as CorrectionRequest);
      });
      onUpdate(correctionsList);
    },
    (error) => {
      console.warn('Firestore corrections subscription error:', error);
    }
  );
};

// Save or Update Attendance Record
export const saveAttendanceToFirestore = async (record: AttendanceRecord): Promise<void> => {
  const docRef = doc(db, ATTENDANCE_COLLECTION, record.id);
  await setDoc(docRef, record, { merge: true });
};

// Save or Create Lab Session
export const saveSessionToFirestore = async (session: LabSession): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, session.id);
  await setDoc(docRef, session, { merge: true });
};

// Update Session Status
export const updateSessionStatusInFirestore = async (sessionId: string, status: SessionStatus): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(docRef, { status });
};

// Save Correction Request
export const saveCorrectionToFirestore = async (correction: CorrectionRequest): Promise<void> => {
  const docRef = doc(db, CORRECTIONS_COLLECTION, correction.id);
  await setDoc(docRef, correction, { merge: true });
};

// Update Correction Status
export const updateCorrectionInFirestore = async (
  correctionId: string,
  status: 'approved' | 'rejected'
): Promise<void> => {
  const docRef = doc(db, CORRECTIONS_COLLECTION, correctionId);
  await updateDoc(docRef, { status });
};

// Check Firestore connectivity without injecting mock fixtures
export const seedFirestoreIfEmpty = async (): Promise<boolean> => {
  try {
    const colRef = collection(db, SESSIONS_COLLECTION);
    await getDocs(colRef);
    return false;
  } catch (err) {
    console.warn('Firestore connection check:', err);
    return false;
  }
};
