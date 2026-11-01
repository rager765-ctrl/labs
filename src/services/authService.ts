import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  deleteUser,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, runTransaction, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, UserRole } from '../types';
import { getStoredDemoInvites, DEMO_INVITES_STORAGE_KEY } from './firestoreService';

export const signInUser = async (email: string, password: string): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const fbUser = credential.user;

  // Retrieve user document from Firestore
  const userDocRef = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(userDocRef);

  if (snap.exists()) {
    const existing = snap.data() as User;
    if (existing.email === 'e.vance@university.edu' && existing.role !== 'coordinator') {
      existing.role = 'coordinator';
      existing.level = 'Senior Lab Coordinator';
      await setDoc(userDocRef, existing, { merge: true }).catch(() => undefined);
    }
    return existing;
  }

  // Fallback profile if doc doesn't exist
  const isCoord = fbUser.email === 'e.vance@university.edu' || fbUser.email?.toLowerCase().includes('coord');
  const defaultProfile: User = {
    id: fbUser.uid,
    name: fbUser.displayName || (isCoord ? 'Innovations Lab Coordinator' : (email.split('@')[0] || 'Attendee')),
    email: fbUser.email || email,
    role: isCoord ? 'coordinator' : 'student',
    studentId: isCoord ? 'FAC-8042' : 'VIS-' + fbUser.uid.substring(0, 6).toUpperCase(),
    ...(isCoord ? { programme: 'Innovations Lab', level: 'Senior Lab Coordinator' } : { programme: 'Innovations Lab' }),
  };

  await setDoc(userDocRef, defaultProfile, { merge: true });
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
    studentId: studentId || (role === 'student' ? 'VIS-' + fbUser.uid.substring(0, 6).toUpperCase() : 'FAC-8042'),
    ...(role === 'coordinator' ? { programme: programme || 'Innovations Lab', level: level || 'Lab Coordinator' } : {}),
  };

  const userDocRef = doc(db, 'users', fbUser.uid);
  await setDoc(userDocRef, profile);

  return profile;
};

export const signUpCoordinator = async (
  email: string,
  password: string,
  name: string,
  staffId: string,
  department: string,
  designation: string,
  labRoom: string,
  inviteToken?: string
): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = credential.user;

  await updateProfile(fbUser, { displayName: name });

  const profile: User = {
    id: fbUser.uid,
    name,
    email: fbUser.email || email,
    role: 'coordinator',
    studentId: staffId.trim() || `FAC-${fbUser.uid.substring(0, 6).toUpperCase()}`,
    programme: department.trim() || 'School of Computing & Data Science',
    level: designation.trim() || 'Senior Lab Coordinator',
    labRoom: labRoom.trim(),
    onboardingInvite: inviteToken || undefined,
  };

  const userDocRef = doc(db, 'users', fbUser.uid);
  await setDoc(userDocRef, profile);

  // If an invite token was attached, update it in storage/Firestore
  if (inviteToken) {
    const demoInvites = getStoredDemoInvites();
    if (demoInvites[inviteToken]) {
      demoInvites[inviteToken].usedBy = fbUser.uid;
      localStorage.setItem(DEMO_INVITES_STORAGE_KEY, JSON.stringify(demoInvites));
    } else {
      const inviteRef = doc(db, 'coordinatorInvites', inviteToken);
      await updateDoc(inviteRef, { usedBy: fbUser.uid, usedAt: Date.now() }).catch(() => undefined);
    }
  }

  return profile;
};

export const updateRegisteredProfile = async (
  fbUser: FirebaseUser | null,
  currentProfile: User,
  changes: Partial<Pick<User, 'name' | 'email' | 'studentId' | 'programme' | 'level' | 'labRoom'>>
): Promise<User> => {
  if (fbUser) {
    if (changes.name !== undefined && changes.name !== fbUser.displayName) {
      await updateProfile(fbUser, { displayName: changes.name });
    }
    if (changes.email && changes.email.trim() !== (fbUser.email || '').trim()) {
      await updateEmail(fbUser, changes.email.trim());
    }
    await setDoc(doc(db, 'users', fbUser.uid), changes, { merge: true });
  }

  return { ...currentProfile, ...changes };
};

export const signUpCoordinatorWithInvite = async (
  inviteToken: string,
  email: string,
  password: string,
  name: string
): Promise<User> => {
  // Check if this is a demo invitation (either prefixed or found in demo storage)
  const demoInvites = getStoredDemoInvites();
  const demoInvite = demoInvites[inviteToken];

  if (inviteToken.startsWith('demo-') || demoInvite) {
    if (demoInvite && demoInvite.usedBy) {
      throw new Error('This coordinator invitation has already been used.');
    }

    let fbUserId = `demo-coord-${Date.now()}`;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      fbUserId = credential.user.uid;
      await updateProfile(credential.user, { displayName: name });
    } catch (authErr) {
      console.warn('Firebase user creation skipped for demo token, creating coordinator locally:', authErr);
    }

    const profile: User = {
      id: fbUserId,
      name,
      email,
      role: 'coordinator',
      studentId: `FAC-${fbUserId.substring(0, 6).toUpperCase()}`,
      programme: 'School of Computing & Data Science',
      level: 'Senior Lab Coordinator',
      onboardingInvite: inviteToken,
    };

    if (demoInvite) {
      demoInvite.usedBy = fbUserId;
      demoInvites[inviteToken] = demoInvite;
      localStorage.setItem(DEMO_INVITES_STORAGE_KEY, JSON.stringify(demoInvites));
    }

    return profile;
  }

  const inviteRef = doc(db, 'coordinatorInvites', inviteToken);
  let inviteSnapshot;
  try {
    inviteSnapshot = await getDoc(inviteRef);
  } catch (err: any) {
    // If Firestore access is denied, fall back to checking local demo storage
    if (demoInvite) {
      const profile: User = {
        id: `demo-coord-${Date.now()}`,
        name,
        email,
        role: 'coordinator',
        studentId: `FAC-${Date.now().toString().slice(-4)}`,
        programme: 'School of Computing & Data Science',
        level: 'Senior Lab Coordinator',
        onboardingInvite: inviteToken,
      };
      return profile;
    }
    throw err;
  }

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
  let docUnsub: (() => void) | null = null;

  const authUnsub = onAuthStateChanged(auth, (fbUser) => {
    if (docUnsub) {
      docUnsub();
      docUnsub = null;
    }

    if (!fbUser) {
      callback(null, null);
      return;
    }

    const userDocRef = doc(db, 'users', fbUser.uid);
    const isCoordEmail = fbUser.email === 'e.vance@university.edu' || fbUser.email?.toLowerCase().includes('coord');

    // Subscribe in real-time to the user's profile in Firestore
    docUnsub = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as User;
          const role = (isCoordEmail || data.role === 'coordinator') ? 'coordinator' : (data.role || 'student');
          const resolvedProfile: User = {
            id: fbUser.uid,
            name: data.name || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : '') || (role === 'coordinator' ? 'Innovations Lab Coordinator' : 'Attendee'),
            email: data.email || fbUser.email || '',
            role,
            studentId: data.studentId || (role === 'coordinator' ? 'FAC-8042' : 'VIS-' + fbUser.uid.substring(0, 6).toUpperCase()),
            programme: data.programme || (role === 'coordinator' ? 'School of Computing & Data Science' : 'Innovations Lab'),
            level: data.level || (role === 'coordinator' ? 'Senior Lab Coordinator' : 'Attendee'),
            avatarUrl: data.avatarUrl || fbUser.photoURL || undefined,
            labRoom: data.labRoom,
          };
          callback(resolvedProfile, fbUser);
        } else {
          // Document does not exist yet (e.g. freshly created Auth account before setDoc completes)
          const role = isCoordEmail ? 'coordinator' : 'student';
          const provisionalProfile: User = {
            id: fbUser.uid,
            name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : '') || (role === 'coordinator' ? 'Innovations Lab Coordinator' : 'Attendee'),
            email: fbUser.email || '',
            role,
            studentId: role === 'coordinator' ? 'FAC-8042' : 'VIS-' + fbUser.uid.substring(0, 6).toUpperCase(),
            ...(role === 'coordinator'
              ? { programme: 'School of Computing & Data Science', level: 'Senior Lab Coordinator' }
              : { programme: 'Innovations Lab', level: 'Attendee' }),
            avatarUrl: fbUser.photoURL || undefined,
          };
          // Persist so subsequent loads find the document
          setDoc(userDocRef, provisionalProfile, { merge: true }).catch(() => undefined);
          callback(provisionalProfile, fbUser);
        }
      },
      (err) => {
        console.warn('Error listening to user document from Firestore:', err);
        // Fallback gracefully without setting user to null
        const role = isCoordEmail ? 'coordinator' : 'student';
        const fallback: User = {
          id: fbUser.uid,
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : '') || (role === 'coordinator' ? 'Innovations Lab Coordinator' : 'Attendee'),
          email: fbUser.email || '',
          role,
          studentId: role === 'coordinator' ? 'FAC-8042' : 'VIS-' + fbUser.uid.substring(0, 6).toUpperCase(),
          programme: role === 'coordinator' ? 'School of Computing & Data Science' : 'Innovations Lab',
          level: role === 'coordinator' ? 'Senior Lab Coordinator' : 'Attendee',
        };
        callback(fallback, fbUser);
      }
    );
  });

  return () => {
    if (docUnsub) {
      docUnsub();
      docUnsub = null;
    }
    authUnsub();
  };
};
