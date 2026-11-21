import { test, before, after } from 'node:test';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-nc-fixb', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8091 } });
  await env.withSecurityRulesDisabled(async (c) => {
    for (const u of ['u1', 'u2']) await setDoc(doc(c.firestore(), 'users', u), { uid: u, displayName: 'Ann' + (u === 'u2' ? '2' : ''), email: u + '@b.co', ageTier: 'explorers', dailyProblemGoal: 10, createdAt: new Date(), updatedAt: new Date() });
  });
});
after(async () => { await env?.cleanup(); });
const dk = (off = 0) => new Date(Date.now() + off * 864e5).toISOString().slice(0, 10);
const ctx = (uid, o = {}) => env.authenticatedContext(uid, { email: uid + '@b.co', email_verified: true, ...o }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const id = (uid, g = 'addition-attack', d = dk()) => `${uid}_${g}_${d}`;
const T = { 'addition-attack': 'Addition Attack', 'subtraction-sprint': 'Subtraction Sprint', 'multiplication-mastery': 'Multiplication Mastery', 'equation-foundry': 'Equation Foundry', 'odds-urns': 'Odds & Urns', 'factor-grid': 'Factor Grid', 'daily-challenge': 'Daily Math Challenge' };
const score = (uid, o = {}) => ({ uid, displayName: uid === 'u2' ? 'Ann2' : 'Ann', gameId: 'addition-attack', gameTitle: T[o.gameId ?? 'addition-attack'], tier: 'explorers', score: 100, accuracyPercent: 90, dateKey: dk(), createdAt: serverTimestamp(), ...o });
const prof = (uid, o = {}) => ({ uid, displayName: 'Ann', email: uid + '@b.co', ageTier: 'explorers', dailyProblemGoal: 10, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...o });

test('valid score create', async () => { await assertSucceeds(setDoc(doc(ctx('u1'), 'gameScores', id('u1')), score('u1'))); });
test('raise own score ok', async () => { await assertSucceeds(setDoc(doc(ctx('u1'), 'gameScores', id('u1')), score('u1', { score: 150 }))); });
test('lower/equal score denied', async () => {
  await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1')), score('u1', { score: 150 })));
  await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1')), score('u1', { score: 10 })));
});
test('update other fields denied', async () => { await assertFails(updateDoc(doc(ctx('u1'), 'gameScores', id('u1')), { tier: 'strategists', score: 999 })); });
test('unauth create/read denied', async () => {
  await assertFails(setDoc(doc(anon(), 'gameScores', id('u1', 'factor-grid')), score('u1', { gameId: 'factor-grid' })));
  await assertFails(getDocs(collection(anon(), 'gameScores')));
  await assertFails(getDoc(doc(anon(), 'gameScores', id('u1'))));
});
test('signed-in list/get ok', async () => {
  await assertSucceeds(getDocs(collection(ctx('u2'), 'gameScores')));
  await assertSucceeds(getDoc(doc(ctx('u2'), 'gameScores', id('u1'))));
});
test('random doc id denied', async () => { await assertFails(setDoc(doc(ctx('u1'), 'gameScores', 'sc_123_abc'), score('u1', { gameId: 'odds-urns' }))); });
test('id for other game/date denied', async () => { await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'odds-urns')), score('u1', { gameId: 'factor-grid' }))); });
test('uid spoof denied', async () => { await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u2')), score('u2'))); });
test('unverified email denied', async () => { await assertFails(setDoc(doc(ctx('u2', { email_verified: false }), 'gameScores', id('u2', 'factor-grid')), score('u2', { gameId: 'factor-grid' }))); });
test('displayName != profile denied', async () => { await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'equation-foundry')), score('u1', { gameId: 'equation-foundry', displayName: 'Someone Else' }))); });
test('ghost/old fields denied', async () => {
  await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'subtraction-sprint')), score('u1', { gameId: 'subtraction-sprint', isAdmin: true })));
  await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'subtraction-sprint')), score('u1', { gameId: 'subtraction-sprint', weekKey: '2026-W47' })));
});
test('score bounds denied', async () => {
  await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'daily-challenge')), score('u1', { gameId: 'daily-challenge', score: 100001 })));
  await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'daily-challenge')), score('u1', { gameId: 'daily-challenge', score: -1 })));
});
test('far past/future dateKey denied; +-1 day ok', async () => {
  for (const d of ['2099-12-31', '2020-01-01', '9999-99-99', dk(-3), dk(3)])
    await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'multiplication-mastery', d)), score('u1', { gameId: 'multiplication-mastery', dateKey: d })));
  for (const d of [dk(-1), dk(1)])
    await assertSucceeds(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'multiplication-mastery', d)), score('u1', { gameId: 'multiplication-mastery', dateKey: d })));
});
test('forged createdAt denied', async () => { await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'odds-urns')), score('u1', { gameId: 'odds-urns', createdAt: new Date('2020-01-01') }))); });
test('cross-user delete denied, own delete ok', async () => {
  await assertFails(deleteDoc(doc(ctx('u2'), 'gameScores', id('u1'))));
  await assertSucceeds(deleteDoc(doc(ctx('u1'), 'gameScores', id('u1'))));
});
test('profile email must match token', async () => {
  await env.withSecurityRulesDisabled(async (c) => deleteDoc(doc(c.firestore(), 'users', 'u2')));
  await assertFails(setDoc(doc(ctx('u2'), 'users', 'u2'), prof('u2', { email: 'victim@x.org' })));
  await assertSucceeds(setDoc(doc(ctx('u2'), 'users', 'u2'), prof('u2', { displayName: 'Ann2' })));
  await assertFails(updateDoc(doc(ctx('u2'), 'users', 'u2'), { email: 'victim@x.org', updatedAt: serverTimestamp() }));
});
test('users: cross-read, list, extra field denied; own delete ok', async () => {
  await assertFails(getDoc(doc(ctx('u2'), 'users', 'u1')));
  await assertFails(getDocs(collection(ctx('u1'), 'users')));
  await assertFails(updateDoc(doc(ctx('u2'), 'users', 'u2'), { role: 'admin', updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(doc(ctx('u2'), 'users', 'u2')));
});
test('gameTitle must match gameId', async () => {
  await assertFails(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'factor-grid')), score('u1', { gameId: 'factor-grid', gameTitle: 'Totally Other Game' })));
  await assertSucceeds(setDoc(doc(ctx('u1'), 'gameScores', id('u1', 'odds-urns')), score('u1', { gameId: 'odds-urns', gameTitle: 'Odds & Urns' })));
});
test('one doc per user/game/day: spam 100000 as new id denied', async () => {
  for (let i = 0; i < 3; i++) await assertFails(setDoc(doc(ctx('u1'), 'gameScores', 'spam' + i), score('u1', { score: 100000 })));
});
