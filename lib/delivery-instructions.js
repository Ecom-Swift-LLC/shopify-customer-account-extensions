'use strict';

/**
 * Pure logic for the `delivery-instructions` extension.
 *
 * The extension lets a customer attach a free-text delivery note to an
 * already-placed order, persisted with the Customer Account API's
 * `metafieldsSet` mutation:
 *
 *   mutation SetDeliveryInstructions($metafields: [MetafieldsSetInput!]!) {
 *     metafieldsSet(metafields: $metafields) {
 *       metafields { key value }
 *       userErrors { field message }
 *     }
 *   }
 *
 * `ownerId` is the order's GID (`shopify.order.value.id`, from the Order
 * API). Reference:
 * https://shopify.dev/docs/apps/build/customer-accounts/metafields
 * https://shopify.dev/docs/apps/build/customer-accounts/metafields-in-customer-accounts
 */

const NAMESPACE = 'custom';
const KEY = 'delivery_instructions';
const METAFIELD_TYPE = 'multi_line_text_field';
const MAX_LENGTH = 300;

const SET_DELIVERY_INSTRUCTIONS_MUTATION = `
  mutation SetDeliveryInstructions($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Validate the customer's free-text input before it is ever sent to the
 * API. Kept separate from the network call so both the UI and the tests can
 * apply the same rule.
 *
 * @param {string} rawText
 * @returns {{valid: boolean, value: string, error?: string}}
 */
function validateDeliveryInstructions(rawText) {
  const value = typeof rawText === 'string' ? rawText.trim() : '';

  if (value.length === 0) {
    return { valid: false, value, error: 'Enter delivery instructions before saving.' };
  }

  if (value.length > MAX_LENGTH) {
    return {
      valid: false,
      value,
      error: `Keep delivery instructions under ${MAX_LENGTH} characters (currently ${value.length}).`,
    };
  }

  return { valid: true, value };
}

/**
 * Build the `MetafieldsSetInput[]` variables for saving one order's
 * delivery instructions.
 *
 * @param {string} orderId - `gid://shopify/Order/<id>`, from `shopify.order.value.id`.
 * @param {string} text - Already-validated instructions text.
 * @returns {{metafields: Array<{ownerId: string, namespace: string, key: string, type: string, value: string}>}}
 */
function buildMetafieldsSetVariables(orderId, text) {
  if (!orderId || typeof orderId !== 'string') {
    throw new TypeError('buildMetafieldsSetVariables requires the order GID as orderId.');
  }

  return {
    metafields: [
      {
        ownerId: orderId,
        namespace: NAMESPACE,
        key: KEY,
        type: METAFIELD_TYPE,
        value: text,
      },
    ],
  };
}

module.exports = {
  NAMESPACE,
  KEY,
  METAFIELD_TYPE,
  MAX_LENGTH,
  SET_DELIVERY_INSTRUCTIONS_MUTATION,
  validateDeliveryInstructions,
  buildMetafieldsSetVariables,
};
