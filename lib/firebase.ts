'use client';

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';
import { clampDailyProblemGoal, DAILY_PROBLEM_GOAL } from '@/lib/daily-goal';
import {
  buildSanitizedScorePayload,
  getIsoWeekKey,
  type CloudGameScoreRecord,
  type LeaderboardPeriod,
} from '@/lib/game-scores';
import type { PlayableGameId } from '@/lib/guest-trial';
import type { AgeTier } from '@/lib/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let connectionTested = false;

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_AUTH_PROVIDERS_CONSOLE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) {
    cachedApp =
      getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return cachedApp;
}

export function getFirebaseDb(): Firestore {
  if (!cachedDb) {
    const app = getFirebaseApp();
    cachedDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  return cachedDb;
}

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    const app = getFirebaseApp();
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const auth = typeof window !== 'undefined' ? getFirebaseAuth() : null;
  const currentUser = auth?.currentUser ?? null;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates Firestore connectivity once on client boot.
 */
export async function testFirestoreConnection(): Promise<void> {
  if (typeof window === 'undefined' || connectionTested) return;
  connectionTested = true;
  try {
    const db = getFirebaseDb();
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export function isEmailPasswordProviderDisabledError(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  return code === 'auth/operation-not-allowed';
}

export function formatFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Switch to Sign In to access your account.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 8 characters with letters and numbers).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Double-check your credentials or reset your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in your Firebase project. Enable it once in Firebase Console under Authentication → Sign-in method, then try again.';
    default:
      return error instanceof Error
        ? error.message
        : 'Unable to complete authentication. Please try again.';
  }
}

export interface RemoteUserProfile {
  uid: string;
  displayName: string;
  email: string;
  ageTier: AgeTier;
  dailyProblemGoal: number;
}

export function subscribeToAuthState(
  callback: (user: User | null) => void
): Unsubscribe {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export async function registerWithEmail(params: {
  email: string;
  password: string;
  displayName: string;
  ageTier: AgeTier;
  dailyProblemGoal: number;
  sharedDevice: boolean;
}): Promise<User> {
  const auth = getFirebaseAuth();
  await setPersistence(
    auth,
    params.sharedDevice ? browserSessionPersistence : browserLocalPersistence
  );

  const cleanEmail = params.email.trim().toLowerCase().slice(0, 120);
  const cleanName = params.displayName.trim().slice(0, 28) || 'Scholar';
  const cleanGoal = clampDailyProblemGoal(params.dailyProblemGoal);

  const credential = await createUserWithEmailAndPassword(
    auth,
    cleanEmail,
    params.password
  );
  await updateProfile(credential.user, { displayName: cleanName });

  const db = getFirebaseDb();
  const profilePath = `users/${credential.user.uid}`;
  try {
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      displayName: cleanName,
      email: cleanEmail,
      ageTier: params.ageTier,
      dailyProblemGoal: cleanGoal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, profilePath);
  }

  return credential.user;
}

export async function signInWithEmail(params: {
  email: string;
  password: string;
  sharedDevice: boolean;
}): Promise<User> {
  const auth = getFirebaseAuth();
  await setPersistence(
    auth,
    params.sharedDevice ? browserSessionPersistence : browserLocalPersistence
  );
  const cleanEmail = params.email.trim().toLowerCase().slice(0, 120);
  const credential = await signInWithEmailAndPassword(
    auth,
    cleanEmail,
    params.password
  );
  return credential.user;
}

export async function sendAccountPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function signOutAccount(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export async function fetchUserProfileDoc(
  uid: string
): Promise<RemoteUserProfile | null> {
  const db = getFirebaseDb();
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const ageTier: AgeTier =
      data.ageTier === 'explorers' ||
      data.ageTier === 'challengers' ||
      data.ageTier === 'strategists'
        ? data.ageTier
        : 'challengers';
    return {
      uid,
      displayName:
        typeof data.displayName === 'string' && data.displayName.trim()
          ? data.displayName.trim().slice(0, 28)
          : 'Scholar',
      email: typeof data.email === 'string' ? data.email : '',
      ageTier,
      dailyProblemGoal: clampDailyProblemGoal(
        typeof data.dailyProblemGoal === 'number'
          ? data.dailyProblemGoal
          : DAILY_PROBLEM_GOAL
      ),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function upsertUserProfileDoc(params: {
  uid: string;
  displayName: string;
  email: string;
  ageTier: AgeTier;
  dailyProblemGoal: number;
}): Promise<void> {
  const db = getFirebaseDb();
  const path = `users/${params.uid}`;
  const ref = doc(db, 'users', params.uid);
  const cleanName = params.displayName.trim().slice(0, 28) || 'Scholar';
  const cleanEmail = params.email.trim().toLowerCase().slice(0, 120);
  const cleanGoal = clampDailyProblemGoal(params.dailyProblemGoal);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        displayName: cleanName,
        email: cleanEmail,
        ageTier: params.ageTier,
        dailyProblemGoal: cleanGoal,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: params.uid,
        displayName: cleanName,
        email: cleanEmail,
        ageTier: params.ageTier,
        dailyProblemGoal: cleanGoal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Persists a single per-game score document for a signed-in user to Firestore.
 */
export async function saveCloudGameScore(params: {
  uid: string;
  displayName: string;
  gameId: PlayableGameId;
  tier: AgeTier;
  score: number;
  accuracyPercent: number;
  dateKey?: string;
}): Promise<string> {
  const db = getFirebaseDb();
  const sanitized = buildSanitizedScorePayload(params);
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const scoreId = `sc_${Date.now()}_${randomSuffix}`;
  const path = `gameScores/${scoreId}`;

  try {
    await setDoc(doc(db, 'gameScores', scoreId), {
      ...sanitized,
      createdAt: serverTimestamp(),
    });
    return scoreId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Subscribes in real time to public game score documents for a given day or week.
 * Uses only single-field equality filters (`visibility == 'public'` + `dateKey` or `weekKey`)
 * so it works out of the box without requiring custom composite indexes.
 */
export function subscribeToPeriodGameScores(params: {
  period: LeaderboardPeriod;
  todayKey: string;
  onUpdate: (records: CloudGameScoreRecord[]) => void;
  onError?: (message: string) => void;
}): Unsubscribe {
  const db = getFirebaseDb();
  const periodField = params.period === 'day' ? 'dateKey' : 'weekKey';
  const periodValue =
    params.period === 'day' ? params.todayKey : getIsoWeekKey(params.todayKey);
  const path = 'gameScores';

  const q = query(
    collection(db, path),
    where('visibility', '==', 'public'),
    where(periodField, '==', periodValue),
    limit(250)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows: CloudGameScoreRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAtVal = d.createdAt;
        const createdAtMs =
          createdAtVal instanceof Timestamp
            ? createdAtVal.toMillis()
            : Date.now();
        rows.push({
          id: docSnap.id,
          uid: String(d.uid ?? ''),
          displayName: String(d.displayName ?? 'Scholar'),
          gameId: d.gameId as PlayableGameId,
          gameTitle: String(d.gameTitle ?? 'Game'),
          tier:
            d.tier === 'explorers' ||
            d.tier === 'challengers' ||
            d.tier === 'strategists'
              ? d.tier
              : 'challengers',
          score: typeof d.score === 'number' ? d.score : 0,
          accuracyPercent:
            typeof d.accuracyPercent === 'number' ? d.accuracyPercent : 0,
          dateKey: String(d.dateKey ?? params.todayKey),
          weekKey: String(d.weekKey ?? getIsoWeekKey(params.todayKey)),
          visibility: 'public',
          createdAtMs,
        });
      });
      params.onUpdate(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err) {
        if (params.onError) {
          params.onError(
            err instanceof Error ? err.message : 'Unable to load scores.'
          );
        }
      }
    }
  );
}
