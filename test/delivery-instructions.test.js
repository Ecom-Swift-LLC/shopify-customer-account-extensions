'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateDeliveryInstructions,
  buildMetafieldsSetVariables,
  NAMESPACE,
  KEY,
  METAFIELD_TYPE,
  MAX_LENGTH,
  SET_DELIVERY_INSTRUCTIONS_MUTATION,
} = require('../lib/delivery-instructions');

test('validateDeliveryInstructions accepts a normal note', () => {
  const result = validateDeliveryInstructions('Leave with the doorman, apt 4B');
  assert.equal(result.valid, true);
  assert.equal(result.value, 'Leave with the doorman, apt 4B');
  assert.equal(result.error, undefined);
});

test('validateDeliveryInstructions trims surrounding whitespace', () => {
  const result = validateDeliveryInstructions('   ring the bell twice   ');
  assert.equal(result.valid, true);
  assert.equal(result.value, 'ring the bell twice');
});

test('validateDeliveryInstructions rejects empty input', () => {
  assert.equal(validateDeliveryInstructions('').valid, false);
  assert.equal(validateDeliveryInstructions('   ').valid, false);
});

test('validateDeliveryInstructions rejects non-string input', () => {
  assert.equal(validateDeliveryInstructions(undefined).valid, false);
  assert.equal(validateDeliveryInstructions(null).valid, false);
});

test('validateDeliveryInstructions accepts text exactly at MAX_LENGTH', () => {
  const text = 'a'.repeat(MAX_LENGTH);
  const result = validateDeliveryInstructions(text);
  assert.equal(result.valid, true);
  assert.equal(result.value.length, MAX_LENGTH);
});

test('validateDeliveryInstructions rejects text one character over MAX_LENGTH', () => {
  const text = 'a'.repeat(MAX_LENGTH + 1);
  const result = validateDeliveryInstructions(text);
  assert.equal(result.valid, false);
  assert.match(result.error, new RegExp(`under ${MAX_LENGTH} characters`));
});

test('buildMetafieldsSetVariables builds one MetafieldsSetInput for the order', () => {
  const variables = buildMetafieldsSetVariables('gid://shopify/Order/123', 'Ring twice');
  assert.deepEqual(variables, {
    metafields: [
      {
        ownerId: 'gid://shopify/Order/123',
        namespace: NAMESPACE,
        key: KEY,
        type: METAFIELD_TYPE,
        value: 'Ring twice',
      },
    ],
  });
});

test('buildMetafieldsSetVariables throws without an order id', () => {
  assert.throws(() => buildMetafieldsSetVariables(undefined, 'Ring twice'), TypeError);
  assert.throws(() => buildMetafieldsSetVariables('', 'Ring twice'), TypeError);
});

test('SET_DELIVERY_INSTRUCTIONS_MUTATION targets metafieldsSet with the right fields', () => {
  assert.match(SET_DELIVERY_INSTRUCTIONS_MUTATION, /mutation SetDeliveryInstructions/);
  assert.match(SET_DELIVERY_INSTRUCTIONS_MUTATION, /metafieldsSet\(metafields: \$metafields\)/);
  assert.match(SET_DELIVERY_INSTRUCTIONS_MUTATION, /userErrors/);
});
