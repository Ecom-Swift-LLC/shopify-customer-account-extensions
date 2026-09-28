'use strict';

/**
 * Pure logic for the `privacy-consent-manager` extension.
 *
 * Built on the documented Customer Privacy API pattern for customer account
 * extensions: read the buyer's current tracking-consent choices from
 * `shopify.customerPrivacy.value.visitorConsent`, and save changes with
 * `shopify.applyTrackingConsentChange({type: 'changeVisitorConsent', ...})`.
 *
 * Reference:
 * https://shopify.dev/docs/api/customer-account-ui-extensions/2026-01/target-apis/account-apis/customer-privacy-api
 */

/** Each tracking-consent category the Customer Privacy API tracks. */
const CONSENT_CATEGORIES = ['analytics', 'marketing', 'preferences'];

/**
 * `true` -> granted, `false` -> denied, anything else (including
 * `undefined`, meaning the buyer hasn't decided yet) -> no decision.
 *
 * @param {boolean|undefined} value
 * @returns {'Granted'|'Denied'|'No decision'}
 */
function consentLabel(value) {
  if (value === true) return 'Granted';
  if (value === false) return 'Denied';
  return 'No decision';
}

/**
 * Sale-of-data uses opt-out language rather than grant/deny, so it gets its
 * own label function rather than overloading `consentLabel`.
 *
 * @param {boolean|undefined} value
 * @returns {'Opted out'|'Not opted out'|'No decision'}
 */
function saleOfDataLabel(value) {
  if (value === true) return 'Opted out';
  if (value === false) return 'Not opted out';
  return 'No decision';
}

/**
 * Turn the raw `visitorConsent` object into a display-ready list, so the
 * extension's render function has no branching logic of its own.
 *
 * @param {{analytics?: boolean, marketing?: boolean, preferences?: boolean, saleOfData?: boolean}} [visitorConsent]
 * @returns {Array<{key: string, label: string, display: string}>}
 */
function summarizeConsentState(visitorConsent) {
  const consent = visitorConsent || {};

  return [
    { key: 'analytics', label: 'Analytics', display: consentLabel(consent.analytics) },
    { key: 'marketing', label: 'Marketing', display: consentLabel(consent.marketing) },
    { key: 'preferences', label: 'Preferences', display: consentLabel(consent.preferences) },
    { key: 'saleOfData', label: 'Sale of data', display: saleOfDataLabel(consent.saleOfData) },
  ];
}

/**
 * Build the payload for `shopify.applyTrackingConsentChange`. Any category
 * left out of `selections` keeps its previous value by falling back to the
 * current `visitorConsent` state rather than silently becoming `false` --
 * `applyTrackingConsentChange` sends a full replacement, not a patch, so a
 * category this UI doesn't show a toggle for must still be carried forward.
 *
 * @param {{analytics?: boolean, marketing?: boolean, preferences?: boolean, saleOfData?: boolean}} [visitorConsent] - Current state, used as the fallback.
 * @param {{analytics?: boolean, marketing?: boolean, preferences?: boolean, saleOfData?: boolean}} selections - The buyer's new choices for this save.
 * @returns {{type: 'changeVisitorConsent', analytics: boolean, marketing: boolean, preferences: boolean, saleOfData: boolean}}
 */
function buildConsentChangePayload(visitorConsent, selections) {
  const current = visitorConsent || {};
  const next = selections || {};

  const resolve = (key) => {
    const value = key in next ? next[key] : current[key];
    return value === true;
  };

  return {
    type: 'changeVisitorConsent',
    analytics: resolve('analytics'),
    marketing: resolve('marketing'),
    preferences: resolve('preferences'),
    saleOfData: resolve('saleOfData'),
  };
}

module.exports = {
  CONSENT_CATEGORIES,
  consentLabel,
  saleOfDataLabel,
  summarizeConsentState,
  buildConsentChangePayload,
};
