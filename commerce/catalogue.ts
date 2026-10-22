// Separate from the illustrative storefront. Nothing here enables a live sale.
export const sandboxCatalogue = {
  "tech-organiser-black-3": {
    name: "Three-layer tech organiser — SANDBOX ONLY",
    cjSku: "CJJT107047201AZ",
    priceAudCents: 3990, // Test price, not an approved retail price.
    maxQuantity: 3,
  },
} as const;

export type Line = { productId: keyof typeof sandboxCatalogue; quantity: number };
export function validateLines(input: unknown): Line[] {
  if (!Array.isArray(input) || !input.length || input.length > 3) throw new Error("INVALID_ITEMS");
  const quantities = new Map<keyof typeof sandboxCatalogue, number>();
  for (const value of input) {
    if (!value || typeof value !== "object") throw new Error("INVALID_ITEMS");
    const { productId, quantity } = value as Record<string, unknown>;
    if (typeof productId !== "string" || !Object.hasOwn(sandboxCatalogue, productId)) throw new Error("UNKNOWN_PRODUCT");
    const id = productId as keyof typeof sandboxCatalogue;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error("INVALID_QUANTITY");
    const total = (quantities.get(id) || 0) + quantity;
    if (total > sandboxCatalogue[id].maxQuantity) throw new Error("QUANTITY_LIMIT");
    quantities.set(id, total);
  }
  return [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([productId, quantity]) => ({ productId, quantity }));
}
export function priceLines(lines: Line[]) { return lines.reduce((sum, line) => sum + sandboxCatalogue[line.productId].priceAudCents * line.quantity, 0); }
export function decimalCents(input: unknown): number {
  if (typeof input !== "string" || !/^\d{1,8}\.\d{2}$/.test(input)) throw new Error("INVALID_MONEY");
  const [whole, fraction] = input.split(".");
  return Number(whole) * 100 + Number(fraction);
}
export function money(cents: number) { return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`; }
