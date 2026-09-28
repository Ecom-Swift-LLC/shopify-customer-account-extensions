import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState } from 'preact/hooks';

// Validation and the metafieldsSet payload builder live in
// ../../../lib/delivery-instructions.js so they can be unit tested without a
// Shopify store; adjust the relative import path when you copy this file.
import {
  validateDeliveryInstructions,
  buildMetafieldsSetVariables,
  SET_DELIVERY_INSTRUCTIONS_MUTATION,
  MAX_LENGTH,
} from '../../../lib/delivery-instructions';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [errorMessage, setErrorMessage] = useState(null);

  const order = shopify.order.value;

  if (!order) {
    return (
      <s-box padding="base">
        <s-spinner size="base" accessibilityLabel="Loading order" />
      </s-box>
    );
  }

  async function handleSave() {
    const { valid, value, error } = validateDeliveryInstructions(draft);

    if (!valid) {
      setStatus('error');
      setErrorMessage(error);
      return;
    }

    setStatus('saving');
    setErrorMessage(null);

    try {
      const variables = buildMetafieldsSetVariables(order.id, value);

      const response = await fetch('shopify:customer-account/api/2026-01/graphql.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: SET_DELIVERY_INSTRUCTIONS_MUTATION, variables }),
      });

      const { data, errors } = await response.json();

      if (errors && errors.length > 0) {
        setStatus('error');
        setErrorMessage(errors[0].message);
        return;
      }

      const userErrors = data?.metafieldsSet?.userErrors ?? [];
      if (userErrors.length > 0) {
        setStatus('error');
        setErrorMessage(userErrors[0].message);
        return;
      }

      setStatus('saved');
    } catch (error) {
      setStatus('error');
      setErrorMessage('Could not save your delivery instructions. Please try again.');
    }
  }

  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-form
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <s-stack direction="block" gap="base">
          <s-heading>Delivery instructions</s-heading>
          <s-paragraph color="subdued">
            Add a note for order {order.name} — a gate code, a safe drop spot, anything the
            courier should know.
          </s-paragraph>

          <s-text-area
            label="Delivery instructions"
            name="deliveryInstructions"
            value={draft}
            maxLength={MAX_LENGTH}
            rows={3}
            onChange={(event) => setDraft(event.currentTarget.value)}
          ></s-text-area>

          <s-button variant="primary" type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save instructions'}
          </s-button>

          {status === 'saved' && (
            <s-banner tone="success">Delivery instructions saved.</s-banner>
          )}

          {status === 'error' && errorMessage && (
            <s-banner tone="critical" heading="Couldn't save">
              {errorMessage}
            </s-banner>
          )}
        </s-stack>
      </s-form>
    </s-box>
  );
}
