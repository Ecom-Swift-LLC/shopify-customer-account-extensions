'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  consentLabel,
  saleOfDataLabel,
  summarizeConsentState,
  buildConsentChangePayload,
  CONSENT_CATEGORIES,
} = require('../lib/consent');

test('consentLabel maps true/false/undefined', () => {
  assert.equal(consentLabel(true), 'Granted');
  assert.equal(consentLabel(false), 'Denied');
  assert.equal(consentLabel(undefined), 'No decision');
  assert.equal(consentLabel(null), 'No decision');
});

test('saleOfDataLabel uses opt-out language, not grant/deny', () => {
  assert.equal(saleOfDataLabel(true), 'Opted out');
  assert.equal(saleOfDataLabel(false), 'Not opted out');
  assert.equal(saleOfDataLabel(undefined), 'No decision');
});

test('summarizeConsentState returns all four categories in a fixed order', () => {
  const summary = summarizeConsentState({ analytics: true, marketing: false });
  assert.deepEqual(
    summary.map((entry) => entry.key),
    ['analytics', 'marketing', 'preferences', 'saleOfData'],
  );
  assert.equal(summary[0].display, 'Granted');
  assert.equal(summary[1].display, 'Denied');
  assert.equal(summary[2].display, 'No decision');
});

test('summarizeConsentState handles a missing visitorConsent object', () => {
  const summary = summarizeConsentState(undefined);
  assert.equal(summary.length, 4);
  assert.ok(summary.every((entry) => entry.display === 'No decision'));
});

test('buildConsentChangePayload applies the buyer\'s new selections', () => {
  const payload = buildConsentChangePayload(
    { analytics: false, marketing: false, preferences: false, saleOfData: false },
    { analytics: true, marketing: true },
  );
  assert.deepEqual(payload, {
    type: 'changeVisitorConsent',
    analytics: true,
    marketing: true,
    preferences: false,
    saleOfData: false,
  });
});

test('buildConsentChangePayload carries forward categories missing from selections', () => {
  const payload = buildConsentChangePayload(
    { analytics: true, marketing: true, preferences: true, saleOfData: true },
    { marketing: false },
  );
  assert.deepEqual(payload, {
    type: 'changeVisitorConsent',
    analytics: true,
    marketing: false,
    preferences: true,
    saleOfData: true,
  });
});

test('buildConsentChangePayload defaults everything to false with no prior state', () => {
  const payload = buildConsentChangePayload(undefined, {});
  assert.deepEqual(payload, {
    type: 'changeVisitorConsent',
    analytics: false,
    marketing: false,
    preferences: false,
    saleOfData: false,
  });
});

test('CONSENT_CATEGORIES lists the three grant/deny categories (saleOfData is opt-out, tracked separately)', () => {
  assert.deepEqual(CONSENT_CATEGORIES, ['analytics', 'marketing', 'preferences']);
});
