'use strict';

/**
 * Pure logic for the `reorder-from-order` extension.
 *
 * The Customer Account UI Extensions Cart Lines API (`shopify.lines`) gives
 * read-only access to the line items of the order shown on the Order status
 * page. Each entry looks like:
 *
 *   {
 *     id: 'gid://shopify/CartLine/...',
 *     quantity: 2,
 *     merchandise: {
 *       type: 'variant',
 *       id: 'gid://shopify/ProductVariant/123',
 *       title: 'Small / Red',
 *       requiresShipping: true,
 *       ...
 *     },
 *   }
 *
 * `merchandise.id` is exactly the `ProductVariant` GID the Storefront API's
 * `cartCreate` mutation expects as `CartLineInput.merchandiseId`. This module
 * turns the read-only order lines into a fresh cart input, with no Shopify
 * API calls of its own so it can be unit tested without a store.
 *
 * Reference: https://shopify.dev/docs/api/customer-account-ui-extensions/2026-01/target-apis/order-apis/cart-lines-api
 *            https://shopify.dev/docs/api/storefront/current/mutations/cartCreate
 */

/** Storefront `cartCreate` rejects an input with more than this many lines. */
const MAX_CART_LINES = 250;

/**
 * The exact GraphQL document sent to the Storefront API. Kept as a constant
 * so the extension and the tests reference one source of truth.
 */
const CART_CREATE_MUTATION = `
  mutation ReorderCartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Turn the order's read-only cart lines into Storefront `CartLineInput[]`.
 *
 * - Lines with no `merchandise.id` (shouldn't happen per the API contract,
 *   but the field is nested and worth guarding) are dropped rather than
 *   sent as a broken line.
 * - Lines with a quantity of zero or less are dropped.
 * - Two lines that resolve to the same variant (possible if the buyer's
 *   original order had the same variant split across cart-line groupings,
 *   e.g. a bundle parent/child) are merged into one line with the summed
 *   quantity, since `cartCreate` does not merge duplicate merchandiseIds
 *   itself — it would create two separate lines instead.
 *
 * @param {Array<{quantity?: number, merchandise?: {id?: string}}>} lines
 * @returns {Array<{merchandiseId: string, quantity: number}>}
 */
function toCartLineInputs(lines) {
  if (!Array.isArray(lines)) {
    return [];
  }

  const quantityByVariantId = new Map();

  for (const line of lines) {
    const variantId = line && line.merchandise && line.merchandise.id;
    const quantity = line && Number.isFinite(line.quantity) ? line.quantity : 0;

    if (!variantId || quantity <= 0) {
      continue;
    }

    quantityByVariantId.set(
      variantId,
      (quantityByVariantId.get(variantId) || 0) + quantity,
    );
  }

  return Array.from(quantityByVariantId, ([merchandiseId, quantity]) => ({
    merchandiseId,
    quantity,
  }));
}

/**
 * Build the full `cartCreate` variables object, capping the line count at
 * `MAX_CART_LINES` (Storefront API's own limit) rather than sending a
 * request that is guaranteed to fail.
 *
 * @param {Array<{quantity?: number, merchandise?: {id?: string}}>} lines
 * @returns {{input: {lines: Array<{merchandiseId: string, quantity: number}>}}}
 */
function buildCartCreateVariables(lines) {
  const cartLines = toCartLineInputs(lines).slice(0, MAX_CART_LINES);
  return { input: { lines: cartLines } };
}

module.exports = {
  MAX_CART_LINES,
  CART_CREATE_MUTATION,
  toCartLineInputs,
  buildCartCreateVariables,
};
