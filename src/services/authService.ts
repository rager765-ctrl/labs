import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, UserRole } from '../types';

export const signInUser = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = credential.user;

  // Retrieve user document from Firestore
  const userDocRef = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(userDocRef);

  if (snap.exists()) {
    return snap.data() as User;
  }

  // Fallback profile if doc doesn't exist
  const defaultProfile: User = {
    id: fbUser.uid,
    name: fbUser.displayName || 'University Member',
    email: fbUser.email || email,
    role: 'student',
    studentId: 'STU-' + fbUser.uid.substring(0, 6).toUpperCase(),
    programme: 'B.Sc. Computer Science',
    level: 'Level 300',
  };

  await setDoc(userDocRef, defaultProfile);
  return defaultProfile;
};

export const signUpUser = async (
  email: string,
  password: string,
  name: string,
  role: UserRole = 'student',
  studentId?: string,
  programme?: string,
  level?: string
): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = credential.user;

  await updateProfile(fbUser, { displayName: name });

  const profile: User = {
    id: fbUser.uid,
    name,
    email: fbUser.email || email,
    role,
    studentId: studentId || (role === 'student' ? 'STU-' + fbUser.uid.substring(0, 6).toUpperCase() : 'FAC-8042'),
    programme: programme || (role === 'student' ? 'B.Sc. Computer Science' : 'School of Computing'),
    level: level || (role === 'student' ? 'Level 300' : 'Lab Coordinator'),
  };

  const userDocRef = doc(db, 'users', fbUser.uid);
  await setDoc(userDocRef, profile);

  return profile;
};

export const signUpCoordinatorWithInvite = async (
  inviteToken: string,
  email: string,
  password: string,
  name: string
): Promise<User> => {
  const inviteRef = doc(db, 'coordinatorInvites', inviteToken);
  const inviteSnapshot = await getDoc(inviteRef);
  if (!inviteSnapshot.exists()) throw new Error('This coordinator invitation is invalid.');
  const invite = inviteSnapshot.data();
  if (invite.usedBy || invite.expiresAt.toMillis() <= Date.now()) {
    throw new Error('This coordinator invitation has expired or has already been used.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = credential.user;
  const profile: User = {
    id: fbUser.uid,
    name,
    email: fbUser.email || email,
    role: 'coordinator',
    studentId: `FAC-${fbUser.uid.substring(0, 6).toUpperCase()}`,
    programme: 'School of Computing',
    level: 'Lab Coordinator',
    onboardingInvite: inviteToken,
  };

  try {
    await updateProfile(fbUser, { displayName: name });
    await runTransaction(db, async (transaction) => {
      const currentInvite = await transaction.get(inviteRef);
      if (!currentInvite.exists()) throw new Error('This coordinator invitation is invalid.');
      const currentData = currentInvite.data();
      if (currentData.usedBy || currentData.expiresAt.toMillis() <= Date.now()) {
        throw new Error('This coordinator invitation has expired or has already been used.');
      }
      transaction.update(inviteRef, { usedBy: fbUser.uid, usedAt: Date.now() });
      transaction.set(doc(db, 'users', fbUser.uid), profile);
    });
    return profile;
  } catch (error) {
    await deleteUser(fbUser).catch(() => undefined);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const listenToAuthChanges = (
  callback: (user: User | null, fbUser: FirebaseUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null, null);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        callback(snap.data() as User, fbUser);
      } else {
        const fallback: User = {
          id: fbUser.uid,
          name: fbUser.displayName || 'University Member',
          email: fbUser.email || '',
          role: 'student',
          studentId: 'STU-' + fbUser.uid.substring(0, 6).toUpperCase(),
          programme: 'B.Sc. Computer Science',
          level: 'Level 300',
        };
        callback(fallback, fbUser);
      }
    } catch (err) {
      console.warn('Error fetching user document from Firestore:', err);
      callback(null, fbUser);
    }
  });
};
