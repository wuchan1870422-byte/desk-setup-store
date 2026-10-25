import type { Environment } from "./worker";

export function configurationStatus(env: Environment) {
  let validOrigin = false;
  try { const url = new URL(env.STOREFRONT_ORIGIN || ""); validOrigin = url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash; } catch { /* missing/invalid */ }
  const checks = {
    sandboxMode: env.COMMERCE_MODE === "sandbox", databaseBinding: Boolean(env.ORDERS),
    paypalCredentials: Boolean(env.PAYPAL_SANDBOX_CLIENT_ID && env.PAYPAL_SANDBOX_SECRET),
    supplierCredential: Boolean(env.CJ_API_KEY || env.CJ_ACCESS_TOKEN),
    adminToken: (env.SANDBOX_ADMIN_TOKEN?.length || 0) >= 32,
    storefrontOrigin: validOrigin, webhookConfigured: Boolean(env.PAYPAL_SANDBOX_WEBHOOK_ID),
  };
  return { configurationPresent: Object.values(checks).every(Boolean), checks };
}

export async function runtimeReadiness(env: Environment) {
  const configuration = configurationStatus(env);
  let database: "available" | "unavailable" = "unavailable";
  try {
    const row = await env.ORDERS?.prepare("SELECT COUNT(*) AS count FROM sandbox_orders").bind().first<{ count: number }>();
    const events = await env.ORDERS?.prepare("SELECT COUNT(*) AS count FROM sandbox_order_events").bind().first<{ count: number }>();
    const supplierChecks = await env.ORDERS?.prepare("SELECT COUNT(*) AS count FROM sandbox_supplier_checks").bind().first<{ count: number }>();
    if (typeof supplierChecks?.count === "number" && typeof row?.count === "number" && typeof events?.count === "number") database = "available";
  } catch { /* no SQL, binding details or provider response is returned */ }
  return { ...configuration, database, authentication: "not_checked", endToEnd: "not_verified", livePayments: false, realProcurement: false } as const;
}
