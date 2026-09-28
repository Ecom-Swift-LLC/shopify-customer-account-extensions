import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState } from 'preact/hooks';

// This file is the reference implementation described in the repo README.
// The reorder math lives in ../../../lib/cart-lines.js so it can be unit
// tested without a Shopify store; adjust the relative import path below to
// wherever you copy that file inside your own app.
import {
  buildCartCreateVariables,
  CART_CREATE_MUTATION,
} from '../../../lib/cart-lines';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const lines = shopify.lines.value;
  const order = shopify.order.value;

  if (!order || !lines) {
    return (
      <s-box padding="base">
        <s-spinner size="base" accessibilityLabel="Loading order" />
      </s-box>
    );
  }

  const cartLineCount = lines.length;

  async function handleReorder() {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const variables = buildCartCreateVariables(lines);

      if (variables.input.lines.length === 0) {
        setStatus('error');
        setErrorMessage('This order has no items left to add back to a cart.');
        return;
      }

      const response = await fetch('shopify://storefront/api/2026-01/graphql.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: CART_CREATE_MUTATION, variables }),
      });

      const { data, errors } = await response.json();

      if (errors && errors.length > 0) {
        setStatus('error');
        setErrorMessage(errors[0].message);
        return;
      }

      const userErrors = data?.cartCreate?.userErrors ?? [];
      if (userErrors.length > 0) {
        setStatus('error');
        setErrorMessage(userErrors[0].message);
        return;
      }

      const url = data?.cartCreate?.cart?.checkoutUrl;
      if (!url) {
        setStatus('error');
        setErrorMessage('Could not start a new cart for this order.');
        return;
      }

      setCheckoutUrl(url);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage('Something went wrong creating your cart. Please try again.');
    }
  }

  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-heading>Buy it again</s-heading>
        <s-paragraph color="subdued">
          Start a new cart with the {cartLineCount}{' '}
          {cartLineCount === 1 ? 'item' : 'items'} from order {order.name}.
        </s-paragraph>

        {status === 'success' && checkoutUrl ? (
          <s-banner tone="success" heading="Cart ready">
            <s-link href={checkoutUrl} target="_blank" tone="auto">
              Continue to checkout
            </s-link>
          </s-banner>
        ) : (
          <s-button
            variant="primary"
            onClick={handleReorder}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Building your cart…' : 'Add all items to a new cart'}
          </s-button>
        )}

        {status === 'error' && errorMessage && (
          <s-banner tone="critical" heading="Couldn't build a new cart">
            {errorMessage}
          </s-banner>
        )}
      </s-stack>
    </s-box>
  );
}
