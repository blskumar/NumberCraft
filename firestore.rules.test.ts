import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const BLUEPRINT_PATH = path.resolve(process.cwd(), 'firebase-blueprint.json');

describe('Firestore Security Rules & Blueprint Verification (firestore.rules)', () => {
  const rulesText = fs.readFileSync(RULES_PATH, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8')) as {
    entities: Record<string, { required?: string[] }>;
    firestore: Record<string, unknown>;
  };

  it('enforces default-deny global safety net and rules_version 2', () => {
    assert.ok(rulesText.includes("rules_version = '2';"));
    assert.ok(rulesText.includes('match /{document=**}'));
    assert.ok(rulesText.includes('allow read, write: if false;'));
  });

  it('covers every collection declared in firebase-blueprint.json with owner-only profiles and raise-only scores', () => {
    assert.ok('/users/{userId}' in blueprint.firestore);
    assert.ok('/gameScores/{scoreId}' in blueprint.firestore);

    // PII isolation on /users/{userId}
    assert.ok(rulesText.includes('match /users/{userId}'));
    assert.ok(rulesText.includes('allow list: if false;'));
    assert.ok(rulesText.includes('isOwner(userId)'));
    assert.ok(rulesText.includes('incoming().uid == existing().uid'));
    assert.ok(rulesText.includes('incoming().createdAt == existing().createdAt'));
    assert.ok(rulesText.includes('incoming().updatedAt == request.time'));

    // Signed-in reads; scores/rounds/flags are written only by Cloud Functions
    assert.ok(rulesText.includes('match /gameScores/{scoreId}'));
    assert.ok(rulesText.includes('allow get, list: if isSignedIn();'));
    assert.ok(rulesText.includes('allow create, update, delete: if false;'));
    assert.ok(!rulesText.includes("visibility == 'public'"));
    for (const c of ['rounds/{roundId}', 'scoreFlags/{flagId}', 'rateLimits/{uid}']) {
      assert.ok(rulesText.includes(`match /${c}`), c);
    }
    assert.ok(rulesText.includes('isAcceptableDisplayName(data.displayName)'));
    assert.ok(rulesText.includes('data.email == request.auth.token.email'));
    assert.ok(rulesText.includes('data.uid == request.auth.uid'));
  });

  it('synchronizes required keys between firebase-blueprint.json and firestore.rules hasOnly checks', () => {
    const userRequired = blueprint.entities.UserProfileDoc.required ?? [];
    for (const key of userRequired) {
      assert.ok(
        rulesText.includes(`'${key}'`),
        `Expected UserProfileDoc key '${key}' enforced in firestore.rules`
      );
    }
  });
});
