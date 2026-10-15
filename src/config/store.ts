export const store = {
  name: "Desk Setup Store",
  // Safety invariant: this MVP never creates orders or loads a payment SDK.
  demoMode: true as const,
  currency: "AUD" as const,
  origin: process.env.NEXT_PUBLIC_SITE_URL || "https://desk-setup-store.j-w2007.chatgpt.site",
  maxQuantityPerItem: 10, // Demo interaction limit; never a stock claim.
  shippingCents: 900,
  shippingLabel: "Illustrative Australia delivery",
  supportEmail: "hello@desksetup.example", // Reserved example domain, not a monitored inbox.
  analytics: { enabled: false },
};
