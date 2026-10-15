import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotals, sanitiseCart } from "../src/lib/cart";
import { products } from "../src/data/products";
import { store } from "../src/config/store";

test("invalid persisted data cannot introduce unknown products or invalid quantities", () => {
  assert.deepEqual(sanitiseCart(null), []);
  assert.deepEqual(sanitiseCart({ quantity: 1 }), []);
  assert.deepEqual(sanitiseCart([null, {}, { productId: "unknown", quantity: 1 }, { productId: products[0].id, quantity: -1 }, { productId: products[0].id, quantity: 1.5 }, { productId: products[0].id, quantity: "2" }, { productId: products[0].id, quantity: Infinity }]), []);
});

test("duplicate product rows merge and quantities stay within the demo limit", () => {
  assert.deepEqual(sanitiseCart([{ productId: products[0].id, quantity: 6 }, { productId: products[0].id, quantity: 7 }]), [{ productId: products[0].id, quantity: 10 }]);
});

test("integer-cent totals match a known multi-item basket", () => {
  // Two A$29 holders plus one A$79 shelf = A$137; A$9 demo delivery = A$146.
  assert.deepEqual(cartTotals([{ productId: "demo-cable-keeper", quantity: 2 }, { productId: "demo-desk-shelf", quantity: 1 }]), { subtotalCents: 13700, shippingCents: 900, totalCents: 14600 });
});

test("an empty or fully removed bag has no delivery charge", () => {
  assert.deepEqual(cartTotals([]), { subtotalCents: 0, shippingCents: 0, totalCents: 0 });
  assert.deepEqual(cartTotals([{ productId: products[0].id, quantity: 0 }]), { subtotalCents: 0, shippingCents: 0, totalCents: 0 });
});

test("persisted price tampering is ignored; totals always use the catalogue", () => {
  const tampered = [{ productId: products[0].id, quantity: 1, priceCents: 1 }];
  assert.equal(cartTotals(tampered).subtotalCents, 2900);
});

test("demo mode and catalogue cannot represent live inventory or payments", () => {
  assert.equal(store.demoMode, true);
  assert.equal(store.analytics.enabled, false);
  assert.equal(products.length, 3);
  for (const product of products) {
    assert.equal(product.isDemo, true);
    assert.ok(Number.isSafeInteger(product.priceCents) && product.priceCents > 0);
    assert.match(product.supplier, /fictional/);
  }
});
