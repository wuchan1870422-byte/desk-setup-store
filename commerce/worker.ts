import { D1Orders, type Database } from "./d1-store";
import { SandboxOrders } from "./orders";
import { CJSandbox, PayPalSandbox } from "./providers";

export interface Environment {
  COMMERCE_MODE?: string;
  SANDBOX_ADMIN_TOKEN?: string;
  PAYPAL_SANDBOX_CLIENT_ID?: string;
  PAYPAL_SANDBOX_SECRET?: string;
  PAYPAL_SANDBOX_WEBHOOK_ID?: string;
  CJ_ACCESS_TOKEN?: string;
  CJ_API_KEY?: string;
  STOREFRONT_ORIGIN?: string;
  ORDERS?: Database;
}
function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
function authorised(req: Request, token?: string) {
  if (!token || token.length < 32) return false;
  const actual = req.headers.get("authorization") || "";
  const expected = `Bearer ${token}`;
  if (actual.length !== expected.length) return false;
  let different = 0;
  for (let i = 0; i < expected.length; i++) different |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return different === 0;
}
async function body(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.startsWith("application/json")) throw new Error("INVALID_JSON");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("INVALID_JSON");
  return parsed;
}

const worker = {
  async fetch(req: Request, env: Environment): Promise<Response> {
    const path = new URL(req.url).pathname;
    if (path === "/health" && req.method === "GET") return json({ service: "desk-setup-sandbox-orders", mode: env.COMMERCE_MODE === "sandbox" ? "sandbox" : "disabled", livePayments: false, realProcurement: false, ready: Boolean(env.ORDERS && env.PAYPAL_SANDBOX_CLIENT_ID && env.PAYPAL_SANDBOX_SECRET && (env.CJ_ACCESS_TOKEN || env.CJ_API_KEY) && (env.SANDBOX_ADMIN_TOKEN?.length || 0) >= 32) });
    // No environment setting can activate live purchases in this implementation.
    if (env.COMMERCE_MODE !== "sandbox") return json({ error: "SANDBOX_DISABLED" }, 503);
    const webhook = path === "/webhooks/paypal" && req.method === "POST";
    if (!webhook && !authorised(req, env.SANDBOX_ADMIN_TOKEN)) return json({ error: "UNAUTHORISED" }, 401);
    if (!env.ORDERS || !env.PAYPAL_SANDBOX_CLIENT_ID || !env.PAYPAL_SANDBOX_SECRET || !(env.CJ_ACCESS_TOKEN || env.CJ_API_KEY) || !env.STOREFRONT_ORIGIN) return json({ error: "SANDBOX_CONFIGURATION_INCOMPLETE" }, 503);
    const db = new D1Orders(env.ORDERS);
    const paypal = new PayPalSandbox(env.PAYPAL_SANDBOX_CLIENT_ID, env.PAYPAL_SANDBOX_SECRET, env.STOREFRONT_ORIGIN);
    let supplierClient: Promise<CJSandbox> | undefined;
    const supplier = () => supplierClient ||= env.CJ_ACCESS_TOKEN ? Promise.resolve(new CJSandbox(env.CJ_ACCESS_TOKEN)) : CJSandbox.fromApiKey(env.CJ_API_KEY!);
    const service = new SandboxOrders(db, paypal, { createSandboxOrder: async (order) => (await supplier()).createSandboxOrder(order), simulatePayment: async (id) => (await supplier()).simulatePayment(id) });
    try {
      if (webhook) {
        if (!env.PAYPAL_SANDBOX_WEBHOOK_ID) return json({ error: "WEBHOOK_NOT_CONFIGURED" }, 503);
        const event = await body(req);
        if (!await paypal.verifyWebhook(req.headers, event, env.PAYPAL_SANDBOX_WEBHOOK_ID)) return json({ error: "INVALID_SIGNATURE" }, 400);
        // Refunds/reversals require a later live-order workflow. Never trigger a new order.
        if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") return json({ received: true, ignored: true });
        const resource = event.resource as { supplementary_data?: { related_ids?: { order_id?: unknown } } } | undefined;
        const id = resource?.supplementary_data?.related_ids?.order_id;
        if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{4,100}$/.test(id)) return json({ error: "INVALID_PROVIDER_ID" }, 400);
        await service.reconcile(id);
        return json({ received: true });
      }
      if (path === "/sandbox/orders" && req.method === "POST") {
        const input = await body(req);
        // Customer PII has no role in this owner-only sandbox.
        if (Object.keys(input).some((key) => key !== "items")) return json({ error: "ONLY_TEST_ITEMS_ACCEPTED" }, 400);
        return json(await service.create(req.headers.get("idempotency-key") || "", input.items));
      }
      const capture = path.match(/^\/sandbox\/orders\/([a-zA-Z0-9-]{4,100})\/capture$/);
      if (capture && req.method === "POST") return json(await service.capture(capture[1]));
      const recover = path.match(/^\/sandbox\/orders\/([a-zA-Z0-9-]{4,100})\/reconcile$/);
      if (recover && req.method === "POST") return json(await service.recover(recover[1]));
      const link = path.match(/^\/sandbox\/orders\/([a-zA-Z0-9-]{4,100})\/link-paypal$/);
      if (link && req.method === "POST") {
        const input = await body(req);
        if (Object.keys(input).length !== 1 || typeof input.paypalId !== "string" || !/^[a-zA-Z0-9_-]{4,100}$/.test(input.paypalId)) return json({ error: "INVALID_PROVIDER_ID" }, 400);
        return json(await service.linkPayPal(link[1], input.paypalId));
      }
      const inspect = path.match(/^\/sandbox\/orders\/([a-zA-Z0-9-]{4,100})\/paypal-status$/);
      if (inspect && req.method === "GET") {
        const order = await db.byId(inspect[1]);
        if (!order) return json({ error: "ORDER_NOT_FOUND" }, 404);
        if (!order.paypalId) return json({ error: "PAYPAL_REFERENCE_MISSING" }, 409);
        // A read must not capture money, change local order state, or call CJ.
        return json({ orderId: order.id, localState: order.state, payment: await paypal.inspect(order) });
      }
      const status = path.match(/^\/sandbox\/orders\/([a-zA-Z0-9-]{4,100})$/);
      if (status && req.method === "GET") {
        const order = await db.byId(status[1]);
        return order ? json(order) : json({ error: "ORDER_NOT_FOUND" }, 404);
      }
      return json({ error: "NOT_FOUND" }, 404);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "INTERNAL_ERROR";
      if (["INVALID_ITEMS", "UNKNOWN_PRODUCT", "INVALID_QUANTITY", "QUANTITY_LIMIT", "INVALID_REQUEST_KEY", "INVALID_JSON", "BODY_TOO_LARGE", "IDEMPOTENCY_CONFLICT"].includes(reason)) return json({ error: reason }, reason === "IDEMPOTENCY_CONFLICT" ? 409 : 400);
      if (reason === "ORDER_NOT_FOUND") return json({ error: reason }, 404);
      // Never echo provider responses, secrets or internal exception messages.
      const safeReasons = ["CREATED_ORDER_NOT_VERIFIED", "PAYPAL_APPROVAL_MISSING", "PAYPAL_APPROVAL_INVALID", "PROVIDER_INVALID_RESPONSE", "PROVIDER_INVALID_ID", "PAYPAL_AUTH_FAILED"];
      const diagnostic = safeReasons.includes(reason) || /^PAYPAL_(AUTH|REQUEST)_HTTP_[1-5][0-9]{2}$/.test(reason) ? reason : error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "PROVIDER_TIMEOUT" : reason.includes("Illegal invocation") ? "RUNTIME_FETCH_BINDING_ERROR" : error instanceof TypeError ? "RUNTIME_TYPE_ERROR" : "UNCLASSIFIED";
      return json({ error: "SANDBOX_ORDER_REQUIRES_REVIEW", reason: diagnostic }, 502);
    }
  },
};
export default worker;
