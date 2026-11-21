// Client side of parental consent. The backend (spec: docs/legal/04) sends the
// parent email, verifies the token and writes consents/{uid}. The client may
// only create a consent REQUEST and read its own consent record.
import firebaseConfig from '@/firebase-applet-config.json';
import {
  CONSENT_VERSION,
  consentRequestExpiry,
  writeLocalConsentHint,
  type ConsentRecord,
} from '@/lib/consent';

async function db() {
  const [{ getApps, initializeApp }, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
  ]);
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return { fs, db: fs.getFirestore(app, firebaseConfig.firestoreDatabaseId) };
}

/** Creates consentRequests/{uid}; a Cloud Function emails the parent. */
export async function requestParentalConsent(params: {
  uid: string;
  parentEmail: string;
}): Promise<void> {
  const now = Date.now();
  const { fs, db: d } = await db();
  await fs.setDoc(fs.doc(d, 'consentRequests', params.uid), {
    uid: params.uid,
    parentEmail: params.parentEmail.trim().toLowerCase(),
    version: CONSENT_VERSION,
    createdAt: fs.serverTimestamp(),
    expiresAt: fs.Timestamp.fromMillis(consentRequestExpiry(now)),
  });
  writeLocalConsentHint({
    uid: params.uid,
    status: 'pending-parental-consent',
    version: CONSENT_VERSION,
  });
}

/** Reads consents/{uid} and refreshes the local UI hint. */
export async function refreshConsentStatus(
  uid: string
): Promise<ConsentRecord | null> {
  const { fs, db: d } = await db();
  const snap = await fs.getDoc(fs.doc(d, 'consents', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as ConsentRecord;
  writeLocalConsentHint({ uid, status: data.status, version: data.version });
  return data;
}
