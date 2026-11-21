// Firestore rules tests against the emulator (no live project).
// Run from a dir that has @firebase/rules-unit-testing + firebase installed:
//   firebase emulators:exec --only firestore "node --test firestore.rules.emu.test.mjs"
// (see functions/README.md). FIRESTORE_EMULATOR_HOST is set by emulators:exec.
import { test, before, after } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';

const [HOST, PORT] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8095').split(':');
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-nc-rules', firestore: { rules: fs.readFileSync(process.env.RULES_PATH ?? 'firestore.rules', 'utf8'), host: HOST, port: Number(PORT) } });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const u of ['u1', 'u2']) await setDoc(doc(db, 'users', u), { uid: u, displayName: 'Ann' + (u === 'u2' ? '2' : ''), email: u + '@b.co', ageTier: 'explorers', dailyProblemGoal: 10, createdAt: new Date(), updatedAt: new Date() });
    await setDoc(doc(db, 'gameScores', 'u1_addition-attack_2026-01-01'), { uid: 'u1', displayName: 'Ann', gameId: 'addition-attack', score: 100 });
    await setDoc(doc(db, 'rounds', 'u1_r1'), { uid: 'u1', gameId: 'addition-attack', status: 'open' });
    await setDoc(doc(db, 'scoreFlags', 'f1'), { uid: 'u1', reason: 'x' });
    await setDoc(doc(db, 'rateLimits', 'u1'), { n: 1 });
  });
});
after(async () => { await env?.cleanup(); });

const ctx = (uid, o = {}) => env.authenticatedContext(uid, { email: uid + '@b.co', email_verified: true, ...o }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const prof = (uid, o = {}) => ({ uid, displayName: 'Ann', email: uid + '@b.co', ageTier: 'explorers', dailyProblemGoal: 10, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...o });
const SC = 'gameScores';
const scoreDoc = (o = {}) => ({ uid: 'u1', displayName: 'Ann', gameId: 'addition-attack', gameTitle: 'Addition Attack', tier: 'explorers', score: 100, accuracyPercent: 90, dateKey: new Date().toISOString().slice(0, 10), createdAt: serverTimestamp(), ...o });

// ---- gameScores: reads for signed-in only, NO client writes ----
test('gameScores: signed-in get/list ok, anonymous denied', async () => {
  await assertSucceeds(getDocs(collection(ctx('u2'), SC)));
  await assertSucceeds(getDoc(doc(ctx('u2'), SC, 'u1_addition-attack_2026-01-01')));
  await assertFails(getDocs(collection(anon(), SC)));
  await assertFails(getDoc(doc(anon(), SC, 'u1_addition-attack_2026-01-01')));
});
test('gameScores: valid-looking client create denied (owner, verified)', async () => {
  const d = scoreDoc();
  await assertFails(setDoc(doc(ctx('u1'), SC, `u1_${d.gameId}_${d.dateKey}`), d));
});
test('gameScores: forged 100000 / random id / other uid create denied', async () => {
  await assertFails(setDoc(doc(ctx('u1'), SC, 'spam1'), scoreDoc({ score: 100000 })));
  await assertFails(setDoc(doc(ctx('u1'), SC, 'u2_x_y'), scoreDoc({ uid: 'u2' })));
});
test('gameScores: update (raise) and delete denied even for owner', async () => {
  await assertFails(updateDoc(doc(ctx('u1'), SC, 'u1_addition-attack_2026-01-01'), { score: 99999 }));
  await assertFails(deleteDoc(doc(ctx('u1'), SC, 'u1_addition-attack_2026-01-01')));
  await assertFails(deleteDoc(doc(ctx('u2'), SC, 'u1_addition-attack_2026-01-01')));
});

// ---- server-only collections ----
for (const [c, d] of [['rounds', 'u1_r1'], ['scoreFlags', 'f1'], ['rateLimits', 'u1']]) {
  test(`${c}: no client read/write/delete (even owner, verified)`, async () => {
    const db = ctx('u1');
    await assertFails(getDoc(doc(db, c, d)));
    await assertFails(getDocs(collection(db, c)));
    await assertFails(setDoc(doc(db, c, d), { uid: 'u1', status: 'closed' }));
    await assertFails(setDoc(doc(db, c, 'new'), { uid: 'u1' }));
    await assertFails(updateDoc(doc(db, c, d), { status: 'closed' }));
    await assertFails(deleteDoc(doc(db, c, d)));
    await assertFails(getDoc(doc(anon(), c, d)));
  });
}

// ---- users ----
test('users: profile email must match token', async () => {
  await env.withSecurityRulesDisabled(async (c) => deleteDoc(doc(c.firestore(), 'users', 'u2')));
  await assertFails(setDoc(doc(ctx('u2'), 'users', 'u2'), prof('u2', { email: 'victim@x.org' })));
  await assertSucceeds(setDoc(doc(ctx('u2'), 'users', 'u2'), prof('u2', { displayName: 'Ann2' })));
  await assertFails(updateDoc(doc(ctx('u2'), 'users', 'u2'), { email: 'victim@x.org', updatedAt: serverTimestamp() }));
});
test('users: displayName rules-level check (size 2-20, charset)', async () => {
  const u = doc(ctx('u2'), 'users', 'u2');
  const upd = (displayName) => updateDoc(u, { displayName, updatedAt: serverTimestamp() });
  for (const ok of ['Ab', 'आरव', 'தமிழ் செல்வன்', 'Cool_name-1.x', 'a'.repeat(20)]) await assertSucceeds(upd(ok));
  for (const bad of ['', 'A', 'a'.repeat(21), '<script>', 'me@x.com', 'a$b', ' lead', 'trail ', 'emoji\u{1F600}', '_start', 'x/y', 'line\nbreak']) await assertFails(upd(bad));
});
test('users: cross-read, list, extra field denied; own delete ok', async () => {
  await assertFails(getDoc(doc(ctx('u2'), 'users', 'u1')));
  await assertFails(getDocs(collection(ctx('u1'), 'users')));
  await assertFails(updateDoc(doc(ctx('u2'), 'users', 'u2'), { role: 'admin', updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(doc(ctx('u2'), 'users', 'u2')));
});
test('users: other-uid create and unauthenticated denied', async () => {
  await assertFails(setDoc(doc(ctx('u1'), 'users', 'u3'), prof('u3')));
  await assertFails(setDoc(doc(anon(), 'users', 'u9'), prof('u9')));
});
