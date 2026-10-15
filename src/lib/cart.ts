import { products } from "@/data/products";
import { store } from "@/config/store";

export type CartItem = { productId: string; quantity: number };
export const CART_KEY = "desk-setup-demo-cart-v1";

export function sanitiseCart(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return [];
  const quantities = new Map<string, number>();
  for (const value of input) {
    if (!value || typeof value !== "object") continue;
    const { productId, quantity } = value as Partial<CartItem>;
    if (!products.some((product) => product.id === productId)) continue;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity <= 0) continue;
    quantities.set(productId!, Math.min(store.maxQuantityPerItem, (quantities.get(productId!) || 0) + quantity));
  }
  return Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }));
}

export function cartTotals(items: CartItem[]) {
  const clean = sanitiseCart(items);
  const subtotalCents = clean.reduce((sum, item) => sum + products.find((product) => product.id === item.productId)!.priceCents * item.quantity, 0);
  const shippingCents = clean.length ? store.shippingCents : 0;
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}
