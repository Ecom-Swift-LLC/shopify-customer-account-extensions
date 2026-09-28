'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toCartLineInputs,
  buildCartCreateVariables,
  MAX_CART_LINES,
  CART_CREATE_MUTATION,
} = require('../lib/cart-lines');

test('toCartLineInputs maps merchandise.id and quantity to a CartLineInput', () => {
  const lines = [
    { quantity: 2, merchandise: { id: 'gid://shopify/ProductVariant/1' } },
  ];
  assert.deepEqual(toCartLineInputs(lines), [
    { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 2 },
  ]);
});

test('toCartLineInputs merges duplicate variant ids by summing quantity', () => {
  const lines = [
    { quantity: 1, merchandise: { id: 'gid://shopify/ProductVariant/1' } },
    { quantity: 3, merchandise: { id: 'gid://shopify/ProductVariant/1' } },
    { quantity: 2, merchandise: { id: 'gid://shopify/ProductVariant/2' } },
  ];
  assert.deepEqual(toCartLineInputs(lines), [
    { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 4 },
    { merchandiseId: 'gid://shopify/ProductVariant/2', quantity: 2 },
  ]);
});

test('toCartLineInputs drops lines with quantity zero or less', () => {
  const lines = [
    { quantity: 0, merchandise: { id: 'gid://shopify/ProductVariant/1' } },
    { quantity: -1, merchandise: { id: 'gid://shopify/ProductVariant/2' } },
    { quantity: 1, merchandise: { id: 'gid://shopify/ProductVariant/3' } },
  ];
  assert.deepEqual(toCartLineInputs(lines), [
    { merchandiseId: 'gid://shopify/ProductVariant/3', quantity: 1 },
  ]);
});

test('toCartLineInputs drops lines with no merchandise id', () => {
  const lines = [
    { quantity: 1, merchandise: {} },
    { quantity: 1, merchandise: null },
    { quantity: 1 },
    { quantity: 1, merchandise: { id: 'gid://shopify/ProductVariant/9' } },
  ];
  assert.deepEqual(toCartLineInputs(lines), [
    { merchandiseId: 'gid://shopify/ProductVariant/9', quantity: 1 },
  ]);
});

test('toCartLineInputs returns an empty array for non-array input', () => {
  assert.deepEqual(toCartLineInputs(undefined), []);
  assert.deepEqual(toCartLineInputs(null), []);
  assert.deepEqual(toCartLineInputs('not an array'), []);
});

test('toCartLineInputs returns an empty array for an empty order', () => {
  assert.deepEqual(toCartLineInputs([]), []);
});

test('buildCartCreateVariables wraps the lines in the CartInput shape', () => {
  const lines = [{ quantity: 1, merchandise: { id: 'gid://shopify/ProductVariant/1' } }];
  assert.deepEqual(buildCartCreateVariables(lines), {
    input: { lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }] },
  });
});

test('buildCartCreateVariables caps the line count at MAX_CART_LINES', () => {
  const lines = Array.from({ length: MAX_CART_LINES + 25 }, (_, i) => ({
    quantity: 1,
    merchandise: { id: `gid://shopify/ProductVariant/${i}` },
  }));
  const variables = buildCartCreateVariables(lines);
  assert.equal(variables.input.lines.length, MAX_CART_LINES);
});

test('buildCartCreateVariables handles an order with no reorderable lines', () => {
  assert.deepEqual(buildCartCreateVariables([]), { input: { lines: [] } });
});

test('CART_CREATE_MUTATION requests the fields the extension reads', () => {
  assert.match(CART_CREATE_MUTATION, /mutation ReorderCartCreate\(\$input: CartInput!\)/);
  assert.match(CART_CREATE_MUTATION, /checkoutUrl/);
  assert.match(CART_CREATE_MUTATION, /userErrors/);
});
