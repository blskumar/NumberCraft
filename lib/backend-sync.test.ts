// The Next client and the Cloud Functions package are built separately, so
// shared constants are mirrored. These tests fail if the two copies drift.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { FUNCTIONS_REGION } from './backend-config';
import { CONSENT_VERSION } from './consent';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('CONSENT_VERSION matches functions/src/common.ts', () => {
  const m = /CONSENT_VERSION\s*=\s*'([^']+)'/.exec(read('../functions/src/common.ts'));
  assert.ok(m, 'constant not found in functions/src/common.ts');
  assert.equal(m[1], CONSENT_VERSION);
});

test('FUNCTIONS_REGION matches functions/src/index.ts', () => {
  const m = /const REGION\s*=\s*'([^']+)'/.exec(read('../functions/src/index.ts'));
  assert.ok(m, 'REGION not found in functions/src/index.ts');
  assert.equal(m[1], FUNCTIONS_REGION);
});
