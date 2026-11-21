import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_VERSION,
  PARENT_REQUEST_TTL_HOURS,
  ageBandFromAge,
  canUseCloudFeatures,
  consentRequestExpiry,
  effectiveConsentStatus,
  hintAllowsCloudScores,
  parseLocalConsentHint,
  requiresParentalConsent,
  validateParentEmail,
  type ConsentRecord,
} from './consent';

const rec = (over: Partial<ConsentRecord> = {}): ConsentRecord => ({
  uid: 'u1',
  ageBand: 'minor',
  status: 'granted',
  version: CONSENT_VERSION,
  purposes: ['account'],
  method: 'parent-email-link',
  grantedAt: 1,
  withdrawnAt: null,
  ...over,
});

describe('consent (lib/consent.ts)', () => {
  it('treats under 18 as minor (DPDP s.2(f))', () => {
    assert.equal(ageBandFromAge(17), 'minor');
    assert.equal(ageBandFromAge(18), 'adult');
    assert.equal(requiresParentalConsent('minor'), true);
    assert.equal(requiresParentalConsent('adult'), false);
  });
  it('validates parent email', () => {
    assert.ok(validateParentEmail('nope', 'kid@x.com'));
    assert.ok(validateParentEmail('Kid@x.com', 'kid@x.com'));
    assert.equal(validateParentEmail('mum@x.com', 'kid@x.com'), null);
  });
  it('expires requests after the TTL', () => {
    assert.equal(consentRequestExpiry(0), PARENT_REQUEST_TTL_HOURS * 3600_000);
  });
  it('blocks cloud features unless current granted consent', () => {
    assert.equal(canUseCloudFeatures(null), false);
    assert.equal(canUseCloudFeatures(rec()), true);
    assert.equal(canUseCloudFeatures(rec({ status: 'withdrawn' })), false);
    assert.equal(canUseCloudFeatures(rec({ version: 'old' })), false);
    assert.equal(
      effectiveConsentStatus(rec({ version: 'old' })),
      'pending-parental-consent'
    );
  });
  it('local hint blocks only explicit non-granted hints for this uid', () => {
    assert.equal(hintAllowsCloudScores(null, 'u1'), true);
    const pending = parseLocalConsentHint(
      JSON.stringify({
        uid: 'u1',
        status: 'pending-parental-consent',
        version: CONSENT_VERSION,
      })
    );
    assert.equal(hintAllowsCloudScores(pending, 'u1'), false);
    assert.equal(hintAllowsCloudScores(pending, 'u2'), true);
    assert.equal(parseLocalConsentHint('{bad'), null);
  });
});
