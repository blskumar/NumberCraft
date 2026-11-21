'use client';

// The Firebase SDK is loaded with dynamic import() only when an account
// feature is used, so guests never download or contact Firebase.
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';
import { FUNCTIONS_REGION } from '@/lib/backend-config';
import { clampDailyProblemGoal, DAILY_PROBLEM_GOAL } from '@/lib/daily-goal';
import {
  buildSanitizedScorePayload,
  getIsoWeekKey,
  type CloudGameScoreRecord,
  type LeaderboardPeriod,
} from '@/lib/game-scores';
import type { PlayableGameId } from '@/lib/guest-trial';
import type { AgeTier } from '@/lib/types';

export type { User };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/** Error whose message is always safe to show to a child. */
export class AppAuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const IS_DEV = process.env.NODE_ENV !== 'production';

let appPromise: Promise<FirebaseApp> | null = null;
let authPromise: Promise<Auth> | null = null;
let dbPromise: Promise<Firestore> | null = null;

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

// ---- App Check (workstream G) -------------------------------------------
// Enabled only when NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY is set at build
// time; loaded via dynamic import so guests never download it.
// Dev: NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=true (or a registered token string).
const APP_CHECK_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
const APP_CHECK_DEBUG = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;

async function initAppCheck(app: FirebaseApp): Promise<void> {
  if (!APP_CHECK_SITE_KEY) return;
  try {
    if (IS_DEV && APP_CHECK_DEBUG) {
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string })
        .FIREBASE_APPCHECK_DEBUG_TOKEN =
        APP_CHECK_DEBUG === 'true' ? true : APP_CHECK_DEBUG;
    }
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import(
      'firebase/app-check'
    );
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    // Monitoring mode must never break the app; enforcement then rejects requests server-side.
  }
}
// ---- end App Check --------------------------------------------------------

function getFirebaseApp(): Promise<FirebaseApp> {
  appPromise ??= import('firebase/app').then(async ({ getApps, initializeApp }) => {
    if (getApps().length > 0) return getApps()[0];
    const app = initializeApp(firebaseConfig);
    await initAppCheck(app); // must precede Auth/Firestore use so tokens attach
    return app;
  });
  return appPromise;
}

function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= Promise.all([
    getFirebaseApp(),
    import('firebase/auth'),
  ]).then(([app, { getAuth }]) => getAuth(app));
  return authPromise;
}

function getFirebaseDb(): Promise<Firestore> {
  dbPromise ??= Promise.all([
    getFirebaseApp(),
    import('firebase/firestore'),
  ]).then(([app, { getFirestore }]) =>
    getFirestore(app, firebaseConfig.firestoreDatabaseId)
  );
  return dbPromise;
}

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
}

/**
 * Logs only the operation, collection and error code (never email/uid) in
 * development, and throws a generic message that is safe for the UI.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (IS_DEV) {
    console.warn(
      `Firestore ${operationType} failed on ${path?.split('/')[0] ?? 'unknown'}: ${errorCode(error) || 'unknown'}`
    );
  }
  throw new AppAuthError(
    'app/cloud-unavailable',
    'Cloud data is temporarily unavailable. Please try again later.'
  );
}

export function isEmailPasswordProviderDisabledError(error: unknown): boolean {
  return errorCode(error) === 'auth/operation-not-allowed';
}

export function formatFirebaseAuthError(error: unknown): string {
  const code = errorCode(error);
  if (IS_DEV && code) console.warn(`Auth error: ${code}`);
  if (error instanceof AppAuthError) return error.message;
  switch (code) {
    case 'auth/email-already-in-use':
      return "We couldn't create that account. If you already registered, use Sign In or Reset Password.";
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 8 characters with letters and numbers).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Double-check them or reset your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'For your safety, please sign in again and then retry.';
    case 'auth/operation-not-allowed':
      return 'Sign-up is temporarily unavailable. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
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
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  void Promise.all([getFirebaseAuth(), import('firebase/auth')])
    .then(([auth, { onAuthStateChanged }]) => {
      if (!cancelled) unsub = onAuthStateChanged(auth, callback);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    unsub?.();
  };
}

// Default is session-only (safe on shared/school computers); 'remember me'
// opts in to persistence across browser restarts.
async function applyPersistence(auth: Auth, sharedDevice: boolean) {
  const { setPersistence, browserLocalPersistence, browserSessionPersistence } =
    await import('firebase/auth');
  await setPersistence(
    auth,
    sharedDevice ? browserSessionPersistence : browserLocalPersistence
  );
}

function cleanEmailOf(email: string): string {
  return email.trim().toLowerCase().slice(0, 120);
}

async function writeProfileDoc(params: {
  uid: string;
  displayName: string;
  email: string;
  ageTier: AgeTier;
  dailyProblemGoal: number;
}): Promise<void> {
  const [db, fs] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  const ref = fs.doc(db, 'users', params.uid);
  const fields = {
    displayName: params.displayName.trim().slice(0, 28) || 'Scholar',
    email: cleanEmailOf(params.email),
    ageTier: params.ageTier,
    dailyProblemGoal: clampDailyProblemGoal(params.dailyProblemGoal),
    updatedAt: fs.serverTimestamp(),
  };
  const snap = await fs.getDoc(ref);
  if (snap.exists()) {
    await fs.updateDoc(ref, fields);
  } else {
    await fs.setDoc(ref, {
      uid: params.uid,
      ...fields,
      createdAt: fs.serverTimestamp(),
    });
  }
}

export async function registerWithEmail(params: {
  email: string;
  password: string;
  displayName: string;
  ageTier: AgeTier;
  dailyProblemGoal: number;
  sharedDevice: boolean;
}): Promise<User> {
  const auth = await getFirebaseAuth();
  const a = await import('firebase/auth');
  await applyPersistence(auth, params.sharedDevice);

  const email = cleanEmailOf(params.email);
  const displayName = params.displayName.trim().slice(0, 28) || 'Scholar';

  let user: User;
  try {
    user = (await a.createUserWithEmailAndPassword(auth, email, params.password))
      .user;
  } catch (error) {
    // Recover from an earlier half-finished registration (auth user created,
    // profile write failed) by signing in with the same credentials.
    if (errorCode(error) !== 'auth/email-already-in-use') throw error;
    try {
      user = (await a.signInWithEmailAndPassword(auth, email, params.password))
        .user;
    } catch {
      throw error;
    }
  }

  try {
    await a.updateProfile(user, { displayName });
    await writeProfileDoc({
      uid: user.uid,
      displayName,
      email,
      ageTier: params.ageTier,
      dailyProblemGoal: params.dailyProblemGoal,
    });
  } catch (error) {
    if (IS_DEV) console.warn(`Profile setup failed: ${errorCode(error)}`);
    await a.signOut(auth).catch(() => {});
    throw new AppAuthError(
      'app/profile-setup-incomplete',
      'Your account was created but setup did not finish. Please press Create Account again with the same details.'
    );
  }

  if (!user.emailVerified) {
    await a.sendEmailVerification(user).catch(() => {});
  }
  return user;
}

export async function signInWithEmail(params: {
  email: string;
  password: string;
  sharedDevice: boolean;
}): Promise<User> {
  const auth = await getFirebaseAuth();
  const a = await import('firebase/auth');
  await applyPersistence(auth, params.sharedDevice);
  const credential = await a.signInWithEmailAndPassword(
    auth,
    cleanEmailOf(params.email),
    params.password
  );
  return credential.user;
}

export async function sendAccountPasswordReset(email: string): Promise<void> {
  const [auth, a] = await Promise.all([
    getFirebaseAuth(),
    import('firebase/auth'),
  ]);
  await a.sendPasswordResetEmail(auth, cleanEmailOf(email));
}

export async function signOutAccount(): Promise<void> {
  const [auth, a] = await Promise.all([
    getFirebaseAuth(),
    import('firebase/auth'),
  ]);
  await a.signOut(auth);
}

/** Reloads the user and returns whether the email address is verified. */
export async function checkEmailVerified(): Promise<boolean> {
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return false;
  await user.reload().catch(() => {});
  if (user.emailVerified) await user.getIdToken(true).catch(() => {});
  return user.emailVerified;
}

export async function resendVerificationEmail(): Promise<void> {
  const [auth, a] = await Promise.all([
    getFirebaseAuth(),
    import('firebase/auth'),
  ]);
  if (auth.currentUser) await a.sendEmailVerification(auth.currentUser);
}

/**
 * Deletes the account: re-authenticates, then (best effort) the profile
 * document (scores/consents are erased by a Cloud Function), then the Auth user. No data export is offered.
 */
export async function deleteAccount(password: string): Promise<void> {
  const [auth, a, fs, db] = await Promise.all([
    getFirebaseAuth(),
    import('firebase/auth'),
    import('firebase/firestore'),
    getFirebaseDb(),
  ]);
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new AppAuthError('app/no-user', 'You are not signed in.');
  }
  await a.reauthenticateWithCredential(
    user,
    a.EmailAuthProvider.credential(user.email, password)
  );
  // Scores, rounds and consent records are erased server-side by the
  // eraseUserData auth-trigger function (rules deny client deletes).
  try {
    await fs.deleteDoc(fs.doc(db, 'users', user.uid));
  } catch (error) {
    if (IS_DEV) console.warn(`Profile cleanup failed: ${errorCode(error)}`);
  }
  await a.deleteUser(user);
}

export async function fetchUserProfileDoc(
  uid: string
): Promise<RemoteUserProfile | null> {
  const path = `users/${uid}`;
  try {
    const [db, fs] = await Promise.all([
      getFirebaseDb(),
      import('firebase/firestore'),
    ]);
    const snap = await fs.getDoc(fs.doc(db, 'users', uid));
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
  try {
    await writeProfileDoc(params);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${params.uid}`);
  }
}

// Callable functions are in Mumbai (see functions/src/index.ts).
// FUNCTIONS_REGION lives in lib/backend-config.ts (shared with the CSP middleware).

/**
 * Kill switch for cloud score posting (workstream G flag). Default: the
 * server-validated callable path is ON. Build with
 * NEXT_PUBLIC_CLIENT_SCORE_WRITES=off to stop the client posting scores at all.
 * (The legacy direct client write path no longer exists: rules deny it.)
 */
const CLOUD_SCORES_ENABLED = process.env.NEXT_PUBLIC_CLIENT_SCORE_WRITES !== 'off';

async function callFunction<T>(name: string, data: unknown): Promise<T> {
  const [app, fn] = await Promise.all([getFirebaseApp(), import('firebase/functions')]);
  const res = await fn.httpsCallable(fn.getFunctions(app, FUNCTIONS_REGION), name)(data);
  return res.data as T;
}

// ---- Consent callables (backend: functions/src/consent.ts) -----------------
export async function callRequestParentalConsent(parentEmail: string): Promise<void> {
  await callFunction('requestParentalConsent', { parentEmail });
}
export async function callRecordSelfConsent(): Promise<void> {
  await callFunction('recordSelfConsent', {});
}
export async function callWithdrawConsent(): Promise<void> {
  await callFunction('withdrawConsent', {});
}
/** Reads the signed-in user's own consents/{uid} (rules: owner read only). */
export async function readOwnConsentDoc(uid: string): Promise<Record<string, unknown> | null> {
  const [fs, db] = await Promise.all([import('firebase/firestore'), getFirebaseDb()]);
  const snap = await fs.getDoc(fs.doc(db, 'consents', uid));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

/** One open round token per game, created by startRound (server-timed). */
const openRounds = new Map<PlayableGameId, string>();

/**
 * Asks the server to open a round for this game (call when the player
 * enters a game screen; replaced automatically after each submit). Best
 * effort: failures (no consent, unverified email, offline) just mean the
 * score will not be posted. Guests must not call this.
 */
export async function beginCloudRound(gameId: PlayableGameId, tier: AgeTier): Promise<void> {
  if (!CLOUD_SCORES_ENABLED) return;
  try {
    const auth = await getFirebaseAuth();
    if (!auth.currentUser) return;
    const { roundId } = await callFunction<{ roundId: string }>('startRound', { gameId, tier });
    openRounds.set(gameId, roundId);
  } catch (error) {
    openRounds.delete(gameId);
    if (IS_DEV) console.warn(`startRound failed: ${errorCode(error)}`);
  }
}

export interface CloudScoreResult {
  saved: boolean;
  best: number;
  scoreId: string;
}

/**
 * Submits a finished round. The SERVER decides the document id, date, name
 * and whether the score is plausible (functions/src/scores.ts); the client
 * cannot write gameScores (rules deny it). `displayName`/`dateKey` are
 * accepted for call-site compatibility but are not sent.
 */
export async function saveCloudGameScore(params: {
  uid: string;
  displayName?: string;
  gameId: PlayableGameId;
  tier: AgeTier;
  score: number;
  accuracyPercent: number;
  dateKey?: string;
  stats?: Record<string, number | string | boolean | number[]>;
}): Promise<CloudScoreResult> {
  const sanitized = buildSanitizedScorePayload({
    ...params,
    displayName: params.displayName ?? 'Player',
  });
  const roundId = openRounds.get(sanitized.gameId);
  openRounds.delete(sanitized.gameId);
  if (!CLOUD_SCORES_ENABLED) {
    throw new AppAuthError('app/scores-disabled', 'Online scores are switched off.');
  }
  try {
    const auth = await getFirebaseAuth();
    if (!auth.currentUser || auth.currentUser.uid !== sanitized.uid) {
      throw new AppAuthError('app/not-signed-in', 'Sign in to save scores.');
    }
    if (!roundId) {
      throw new AppAuthError('app/no-round', 'Score was not saved (no active round).');
    }
    const result = await callFunction<CloudScoreResult>('submitScore', {
      roundId,
      score: sanitized.score,
      accuracyPercent: sanitized.accuracyPercent,
      stats: params.stats ?? {},
    });
    return result;
  } catch (error) {
    if (error instanceof AppAuthError) throw error;
    if (IS_DEV) console.warn(`submitScore failed: ${errorCode(error)}`);
    throw new AppAuthError('app/score-rejected', 'Score could not be saved right now.');
  } finally {
    // Next replay of this game gets a fresh server-timed round.
    void beginCloudRound(sanitized.gameId, sanitized.tier);
  }
}

/**
 * Subscribes to the signed-in leaderboard for a day or week. The week is a
 * dateKey range query (single-field index only). Guests never touch Firebase.
 */
export function subscribeToPeriodGameScores(params: {
  period: LeaderboardPeriod;
  todayKey: string;
  signedIn: boolean;
  onUpdate: (records: CloudGameScoreRecord[]) => void;
  onError?: (message: string) => void;
}): Unsubscribe {
  if (!params.signedIn) {
    params.onError?.('Sign in with a free account to see the live Top 10.');
    return () => {};
  }
  let unsub: Unsubscribe | null = null;
  let cancelled = false;
  const fail = (message: string) => {
    if (!cancelled) params.onError?.(message);
  };

  void (async () => {
    try {
      const [auth, db, fs] = await Promise.all([
        getFirebaseAuth(),
        getFirebaseDb(),
        import('firebase/firestore'),
      ]);
      await auth.authStateReady();
      if (cancelled) return;
      if (!auth.currentUser) {
        fail('Sign in with a free account to see the live Top 10.');
        return;
      }
      const col = fs.collection(db, 'gameScores');
      let q;
      if (params.period === 'day') {
        q = fs.query(col, fs.where('dateKey', '==', params.todayKey), fs.limit(250));
      } else {
        const [y, m, d] = params.todayKey.split('-').map(Number);
        const day = new Date(Date.UTC(y, m - 1, d));
        const dow = day.getUTCDay() || 7;
        const iso = (offset: number) =>
          new Date(day.getTime() + (offset - dow + 1) * 86400000)
            .toISOString()
            .slice(0, 10);
        q = fs.query(
          col,
          fs.where('dateKey', '>=', iso(0)),
          fs.where('dateKey', '<=', iso(6)),
          fs.limit(250)
        );
      }
      unsub = fs.onSnapshot(
        q,
        (snapshot) => {
          const rows: CloudGameScoreRecord[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const dateKey = String(d.dateKey ?? params.todayKey);
            const createdAtMs =
              typeof d.createdAt?.toMillis === 'function'
                ? d.createdAt.toMillis()
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
              dateKey,
              weekKey: getIsoWeekKey(dateKey),
              visibility: 'public',
              createdAtMs,
            });
          });
          if (!cancelled) params.onUpdate(rows);
        },
        (error) => {
          if (IS_DEV) console.warn(`Leaderboard failed: ${errorCode(error)}`);
          fail('Unable to load scores.');
        }
      );
      if (cancelled) unsub();
    } catch {
      fail('Unable to load scores.');
    }
  })();

  return () => {
    cancelled = true;
    unsub?.();
  };
}
