import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState } from 'preact/hooks';

// The label/summary/payload logic lives in ../../../lib/consent.js so it can
// be unit tested without a Shopify store; adjust the relative import path
// when you copy this file into your own app.
import {
  summarizeConsentState,
  buildConsentChangePayload,
} from '../../../lib/consent';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [pendingChange, setPendingChange] = useState({});

  const { visitorConsent } = shopify.customerPrivacy.value;
  const summary = summarizeConsentState(visitorConsent);

  function toggle(key) {
    setPendingChange((current) => ({
      ...current,
      [key]: !(key in current ? current[key] : visitorConsent?.[key] === true),
    }));
    setStatus('idle');
  }

  function isChecked(key) {
    return key in pendingChange ? pendingChange[key] : visitorConsent?.[key] === true;
  }

  async function handleSave() {
    setStatus('saving');

    try {
      const payload = buildConsentChangePayload(visitorConsent, pendingChange);
      const result = await shopify.applyTrackingConsentChange(payload);

      if (result?.type === 'success') {
        setStatus('saved');
        setPendingChange({});
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  }

  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-heading>Privacy preferences</s-heading>
        <s-paragraph color="subdued">
          Choose what we're allowed to track about your visits.
        </s-paragraph>

        <s-stack direction="block" gap="small-200">
          {summary
            .filter((entry) => entry.key !== 'saleOfData')
            .map((entry) => (
              <s-checkbox
                key={entry.key}
                label={`${entry.label} (currently: ${entry.display})`}
                name={entry.key}
                checked={isChecked(entry.key)}
                onChange={() => toggle(entry.key)}
              ></s-checkbox>
            ))}
        </s-stack>

        <s-button variant="primary" onClick={handleSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save preferences'}
        </s-button>

        {status === 'saved' && <s-banner tone="success">Preferences saved.</s-banner>}
        {status === 'error' && (
          <s-banner tone="critical">Couldn't save your preferences. Please try again.</s-banner>
        )}
      </s-stack>
    </s-box>
  );
}
