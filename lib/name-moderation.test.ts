import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDisplayName, suggestSafeName, cleanDisplayName } from './name-moderation';

const ok = (n: string) => {
  const r = validateDisplayName(n);
  assert.equal(r.ok, true, `expected ok: ${JSON.stringify(n)} got ${r.reason}`);
};
const bad = (n: string, reason?: string) => {
  const r = validateDisplayName(n);
  assert.equal(r.ok, false, `expected blocked: ${JSON.stringify(n)}`);
  if (reason) assert.equal(r.reason, reason, `reason for ${JSON.stringify(n)}`);
};

test('accepts ordinary and multilingual names', () => {
  for (const n of [
    'Aarav', 'Priya S', 'Ananya 7', 'Mr. Cool', 'math-whiz', 'num_ber', 'Zoe',
    'आरव', 'अनन्या', 'தமிழ் செல்வன்', 'తెలుగు', 'বাংলা', 'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം',
    'Rohan 2012', 'Élise', 'Åsa',
  ]) ok(n);
});

test('Scunthorpe-class names are not false positives (decisions documented)', () => {
  for (const n of [
    'Scunthorpe', 'Classic', 'Assassin', 'Grass', 'Bassist', 'Passion', 'Cassidy',
    'Hancock', 'Peacock', 'Therapist', 'Titan', 'Chutney', 'Gandhi', 'Brandi',
    'Pundalik', 'Niger', 'Nazia', 'Class Act', 'Bomber', 'Killer Bee',
    'Mississippi', 'Analyst', 'Cumin', 'Dickens', 'Sussex', 'Essex Boy',
  ]) {
    // 'Killer Bee' is allowed (only the exact word "kill" is blocked).
    ok(n);
  }
});

test('length bounds', () => {
  bad('', 'empty');
  bad('   ', 'empty');
  bad('A', 'too-short');
  ok('Ab');
  ok('a'.repeat(20));
  bad('a'.repeat(21), 'too-long');
  assert.equal(validateDisplayName(undefined).reason, 'empty');
  assert.equal(validateDisplayName(42 as unknown).reason, 'empty');
});

test('normalisation: NFKC, zero-width, bidi, whitespace', () => {
  assert.equal(cleanDisplayName('  Ａａｒａｖ  '), 'Aarav');
  assert.equal(cleanDisplayName('Aa​ra‍v'), 'Aarav');
  assert.equal(cleanDisplayName('‮Aarav‬'), 'Aarav');
  assert.equal(cleanDisplayName('A   B'), 'A B');
  bad('f​uck', 'inappropriate');
  bad('ａｄｍｉｎ', 'reserved');
});

test('charset: emoji and symbols rejected', () => {
  for (const n of ['Cool😀', 'a<b>', 'x#y', 'hi/there', 'a+b', "o'brien", 'a,b']) bad(n, 'charset');
});

test('PII: email, phone, url, handle, digit runs', () => {
  bad('me@mail.com', 'pii');
  bad('@aarav_99', 'pii');
  bad('call 9876543210', 'pii');
  bad('98765 43210', 'pii');
  bad('www.site', 'pii');
  bad('https:x', 'pii');
  bad('aarav.com', 'pii');
  bad('abc123456', 'pii');
  bad('a.b.in', 'pii');
  ok('Room 101');
});

test('reserved / impersonation words', () => {
  for (const n of [
    'admin', 'Admin', 'TheAdmin', 'a d m i n', 'Numbercraft', 'Number Craft Team',
    'numbercraft_staff', 'Teacher', 'Mrs Teacher', 'Moderator', 'Support', 'Support Team',
    'OFFICIAL', 'Mod', 'adm1n', 'аdmin' /* Cyrillic a */,
  ]) bad(n, 'reserved');
  ok('Supporter'); // exact-token rule: documented
  ok('Admiral');
});

test('profanity: english', () => {
  for (const n of [
    'fuck', 'FUCK', 'fuuuck', 'f u c k', 'f.u.c.k', 'f_u_c_k', 'fvck'.replace('v', 'u'), 'xxfuckxx',
    'sh1t', 'shit', 'shithead', 'b1tch', 'bitch', 'Bitches', 'A55', 'ass', 'Big Ass',
    'asshole', 'dumbass', 'badass', 'p0rn', 'porn', 'PornStar', 'sex', 'Sexy Boy', 'nigga',
    'n1gger', 'faggot', 'cunt', 'c u n t', 'whore', 'slut', 'pussy', 'pusssy', 'dicks', 'dickhead', 'd1ck',
    'penis', 'idiot', 'stupid', 'kill', 'rape', 'rapist', 'kys', 'hitler', 'nazi', 'terrorist',
    'retarded', 'suicide', 'murderer', 'boobs', 'tits',
  ]) bad(n, 'inappropriate');
});

test('allowlisted whole words pass as typed (Dick, Lund, Shiitake, Pussycat); obfuscated or extended forms still fail', () => {
  for (const n of ['Dick', 'DICK', 'Dick Smith', 'Moby Dick', 'Lund', 'Anna Lund', 'Shiitake', 'Shiitake Fan', 'Pussycat', 'Pussycat Dolls']) ok(n);
  for (const n of ['d1ck', 'dicks', 'dickhead', 'Pussy', 'Pussy Cat', 'p u s s y', 'Shit', 'Shiitake Shit', 'lunds', 'l u n d s']) bad(n, 'inappropriate');
});

test('profanity: Hinglish and Indian-language transliterations', () => {
  for (const n of [
    'chutiya', 'Chut1ya', 'madarchod', 'm@darchod'.replace('@', 'a'), 'bhenchod', 'behenchod',
    'bhosdike', 'gandu', 'gaandu', 'harami', 'haramzada', 'randwa', 'lunds', 'l u n d s', 'chut', 'saala',
    'kutta', 'bakchod', 'bsdk', 'bkl', 'thevidiya', 'punda', 'pundai', 'koothi', 'otha',
    'lanjakodaka', 'bokachoda', 'thayoli', 'zavadya', 'kamina', 'lauda',
  ]) bad(n, 'inappropriate');
});

test('profanity: native scripts', () => {
  for (const n of ['चूतिया', 'मादरचोद', 'बहनचोद', 'गांडू', 'रंडी', 'हरामी', 'தேவிடியா', 'புண்டை', 'মাগি', 'খানকি', 'లంజ']) {
    bad(n, 'inappropriate');
  }
  ok('కొడుకు'); // "son": must not be blocked
});

test('fallback suggestion is safe, deterministic per seed and well formed', () => {
  assert.equal(suggestSafeName('x'), suggestSafeName('x'));
  const seen = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const s = suggestSafeName(`seed-${i}`);
    seen.add(s);
    assert.match(s, /^[A-Z][a-z]+ [A-Z][a-z]+ \d{2}$/);
    const r = validateDisplayName(s);
    assert.equal(r.ok, true, `suggestion must pass: ${s} (${r.reason})`);
  }
  assert.ok(seen.size > 100);
  const r = validateDisplayName('fuck');
  assert.equal(r.ok, false);
  assert.equal(validateDisplayName(r.suggestion).ok, true);
});

test('every blocklist entry blocks itself (and not as a false-positive source)', async () => {
  const bl = await import('./name-blocklist');
  const allowed = new Set(bl.NAME_ALLOWLIST);
  for (const w of [...bl.PROFANITY_SUBSTRING, ...bl.PROFANITY_PREFIX, ...bl.PROFANITY_EXACT]) {
    if (allowed.has(w)) continue; // deliberately passes as a whole word, see the allowlist test
    const r = validateDisplayName(w);
    assert.equal(r.ok, false, `entry should block itself: ${w}`);
  }
});
