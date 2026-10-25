type Json = Record<string, unknown>;
const object = (x: unknown): Json => {
  if (!x || typeof x !== "object" || Array.isArray(x)) throw new Error("INVALID_BACKEND_RESPONSE");
  return x as Json;
};
const id = (x: string) => { if (!/^[a-zA-Z0-9_-]{4,100}$/.test(x)) throw new Error("INVALID_ORDER_ID"); return x; };
export type SandboxCommand = "check" | "create" | "status" | "capture" | "reconcile" | "review";

// No direct payment credentials, automatic approval, or live transport. Explicit
// opt-in and mode checks are mandatory even for read-only remote inspection.
export class SandboxAcceptance {
  private origin: string;
  constructor(origin: string, private token: string, network: string | undefined, private send: typeof fetch = fetch) {
    if (network !== "sandbox") throw new Error("EXPLICIT_SANDBOX_NETWORK_REQUIRED");
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || token.length < 32) throw new Error("INVALID_SANDBOX_CONFIGURATION");
    this.origin = url.origin;
  }
  private async request(path: string, method = "GET", body?: unknown, key?: string) {
    const response = await this.send(this.origin + path, {
      method, redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { authorization: `Bearer ${this.token}`, ...(body === undefined ? {} : { "content-type": "application/json" }), ...(key ? { "idempotency-key": key } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`BACKEND_HTTP_${response.status}`);
    return object(await response.json());
  }
  async run(command: SandboxCommand, orderId?: string, requestKey?: string, cursor?: string) {
    const health = await this.request("/health");
    if (health.mode !== "sandbox" || health.livePayments !== false || health.realProcurement !== false) throw new Error("BACKEND_NOT_SANDBOX");
    if (command === "check") return { readiness: await this.request("/sandbox/readiness"), connections: await this.request("/sandbox/connections") };
    if (command === "review") return this.request("/sandbox/review" + (cursor ? `?cursor=${id(cursor)}` : ""));
    if (command === "create") {
      if (!requestKey || !/^[a-zA-Z0-9_-]{16,80}$/.test(requestKey)) throw new Error("STABLE_REQUEST_KEY_REQUIRED");
      const row = await this.request("/sandbox/orders", "POST", { items: [{ productId: "tech-organiser-black-3", quantity: 1 }] }, requestKey);
      if (row.approvalUrl !== undefined) {
        const url = new URL(String(row.approvalUrl));
        if (url.protocol !== "https:" || !["www.sandbox.paypal.com", "sandbox.paypal.com"].includes(url.hostname) || url.pathname !== "/checkoutnow" || url.searchParams.get("token") !== row.paypalId || url.username || url.password || url.port || url.hash) throw new Error("INVALID_APPROVAL_URL");
      }
      return row;
    }
    const path = `/sandbox/orders/${id(orderId || "")}`;
    if (command === "capture") {
      const status = await this.request(`${path}/paypal-status`);
      const payment = object(status.payment);
      if (payment.state !== "APPROVED") throw new Error("SANDBOX_BUYER_APPROVAL_REQUIRED_USE_STATUS_OR_RECONCILE");
      return this.request(`${path}/capture`, "POST");
    }
    if (command === "reconcile") return this.request(`${path}/reconcile`, "POST");
    if (command !== "status") throw new Error("UNKNOWN_COMMAND");
    return { order: await this.request(path), payment: await this.request(`${path}/paypal-status`) };
  }
}

// Allowlist-only output. Raw objects, identifiers, approval tokens, payer data
// and backend URLs remain in a gitignored operator file, never CI summaries.
export function acceptanceSummary(command: SandboxCommand, input: unknown) {
  const value = object(input), order = object(value.order || value), readiness = value.readiness ? object(value.readiness) : {};
  const allowedStates = ["CREATING", "PENDING", "CAPTURING", "PAID", "FULFILLING", "CJ_SANDBOX_PAID", "REVIEW"];
  return {
    schema: "desk-setup-acceptance-v1", evidenceKind: "provider_sandbox_observation", command,
    state: allowedStates.includes(String(order.state)) ? order.state : undefined,
    configurationPresent: typeof readiness.configurationPresent === "boolean" ? readiness.configurationPresent : undefined,
    database: ["available", "unavailable"].includes(String(readiness.database)) ? readiness.database : undefined,
    externalEndToEndAccepted: false, realShipmentAccepted: false,
    nextAction: order.state === "CJ_SANDBOX_PAID" ? "VERIFY_PROVIDER_RECORDS_AND_COMPLETE_MANUAL_ACCEPTANCE" : "SEE_PRIVATE_RESULT_AND_ACCEPTANCE_RUNBOOK",
  };
}
