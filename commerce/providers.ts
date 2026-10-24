import { decimalCents, money, sandboxCatalogue } from "./catalogue";
import type { Order, PaymentGateway, SupplierGateway } from "./orders";

type Json = Record<string, unknown>;
function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PROVIDER_INVALID_RESPONSE");
  return value as Json;
}
function providerId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{4,100}$/.test(value)) throw new Error("PROVIDER_INVALID_ID");
  return value;
}
type Transport = typeof fetch;
// Runtime fetch functions can require their original receiver. Never store a
// raw global function as an instance method and call it with the client as this.
const defaultTransport: Transport = (input, init) => fetch(input, init);

export class PayPalSandbox implements PaymentGateway {
  // There is deliberately no live PayPal endpoint or environment override.
  private readonly base = "https://api-m.sandbox.paypal.com";
  private token?: { value: string; until: number };
  constructor(private clientId: string, private secret: string, private storefront: string, private send: Transport = defaultTransport) {}

  private async auth() {
    if (this.token && this.token.until > Date.now()) return this.token.value;
    const response = await this.send(`${this.base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${btoa(`${this.clientId}:${this.secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`PAYPAL_AUTH_HTTP_${response.status}`);
    const data = object(await response.json());
    if (typeof data.access_token !== "string" || !data.access_token) throw new Error("PAYPAL_AUTH_FAILED");
    const lifetime = typeof data.expires_in === "number" ? data.expires_in : 60;
    this.token = { value: data.access_token, until: Date.now() + Math.max(1, lifetime - 30) * 1000 };
    return this.token.value;
  }
  private async api(path: string, method = "GET", body?: unknown, key?: string) {
    const headers: Record<string, string> = { Authorization: `Bearer ${await this.auth()}`, "Content-Type": "application/json", Prefer: "return=representation" };
    if (key) headers["PayPal-Request-Id"] = key;
    const response = await this.send(this.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`PAYPAL_REQUEST_HTTP_${response.status}`);
    return object(await response.json());
  }
  async create(order: Order) {
    const origin = new URL(this.storefront);
    if (origin.protocol !== "https:" || origin.username || origin.password) throw new Error("INVALID_STOREFRONT");
    const data = await this.api("/v2/checkout/orders", "POST", {
      intent: "CAPTURE",
      purchase_units: [{ reference_id: order.id, custom_id: order.id, invoice_id: `test-${order.id}`, description: "Desk Setup Store — sandbox test only", amount: { currency_code: "AUD", value: money(order.totalAudCents) } }],
      payment_source: { paypal: { experience_context: { return_url: `${origin.origin}/cart/?sandbox=approved`, cancel_url: `${origin.origin}/cart/?sandbox=cancelled`, shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" } } },
    }, order.id);
    return this.approval(data, providerId(data.id));
  }
  verifyCreated(payload: unknown, order: Order) {
    const data = object(payload);
    if (data.id !== order.paypalId || !["CREATED", "PAYER_ACTION_REQUIRED"].includes(String(data.status)) || data.intent !== "CAPTURE" || !Array.isArray(data.purchase_units) || data.purchase_units.length !== 1) throw new Error("CREATED_ORDER_NOT_VERIFIED");
    const unit = object(data.purchase_units[0]);
    const amount = object(unit.amount);
    if (unit.custom_id !== order.id || unit.reference_id !== order.id || unit.invoice_id !== `test-${order.id}` || amount.currency_code !== "AUD" || decimalCents(amount.value) !== order.totalAudCents) throw new Error("CREATED_ORDER_NOT_VERIFIED");
    return this.approval(data, order.paypalId!);
  }
  private approval(data: Json, paypalId: string) {
    const links = Array.isArray(data.links) ? data.links.map(object) : [];
    const approval = links.find((link) => link.rel === "payer-action" || link.rel === "approve");
    if (typeof approval?.href !== "string") throw new Error("PAYPAL_APPROVAL_MISSING");
    const url = new URL(approval.href);
    if (url.protocol !== "https:" || !["www.sandbox.paypal.com", "sandbox.paypal.com"].includes(url.hostname) || url.username || url.password) throw new Error("PAYPAL_APPROVAL_INVALID");
    if (url.pathname !== "/checkoutnow" || url.searchParams.get("token") !== paypalId || url.port || url.hash) throw new Error("PAYPAL_APPROVAL_INVALID");
    return { id: providerId(data.id), approvalUrl: url.href };
  }
  async capture(order: Order) {
    await this.api(`/v2/checkout/orders/${providerId(order.paypalId)}/capture`, "POST", {}, `capture-${order.id}`);
    // Fetch the full order instead of relying on a potentially abbreviated capture response.
    return this.get(order);
  }
  async get(order: Order) { return this.api(`/v2/checkout/orders/${providerId(order.paypalId)}`); }
  async checkConnection() { await this.auth(); return true; }
  async inspect(order: Order) {
    const data = object(await this.get(order));
    if (data.id !== order.paypalId || data.intent !== "CAPTURE" || !Array.isArray(data.purchase_units) || data.purchase_units.length !== 1) throw new Error("CREATED_ORDER_NOT_VERIFIED");
    const unit = object(data.purchase_units[0]);
    const amount = object(unit.amount);
    if (unit.custom_id !== order.id || unit.reference_id !== order.id || unit.invoice_id !== `test-${order.id}` || amount.currency_code !== "AUD" || decimalCents(amount.value) !== order.totalAudCents) throw new Error("CREATED_ORDER_NOT_VERIFIED");
    const state = String(data.status);
    if (!["CREATED", "SAVED", "PAYER_ACTION_REQUIRED", "APPROVED", "COMPLETED", "VOIDED", "EXPIRED"].includes(state)) throw new Error("PROVIDER_INVALID_RESPONSE");
    const captureId = state === "COMPLETED" ? this.verifyPaid(data, order) : undefined;
    return { paypalId: order.paypalId, state, paymentVerified: Boolean(captureId), captureId };
  }
  verifyPaid(payload: unknown, order: Order) {
    const data = object(payload);
    if (data.id !== order.paypalId || data.status !== "COMPLETED" || !Array.isArray(data.purchase_units) || data.purchase_units.length !== 1) throw new Error("PAYMENT_NOT_VERIFIED");
    const unit = object(data.purchase_units[0]);
    const amount = object(unit.amount);
    if (unit.custom_id !== order.id || unit.reference_id !== order.id || amount.currency_code !== "AUD" || decimalCents(amount.value) !== order.totalAudCents) throw new Error("PAYMENT_NOT_VERIFIED");
    const payments = object(unit.payments);
    if (!Array.isArray(payments.captures) || payments.captures.length !== 1) throw new Error("PAYMENT_NOT_VERIFIED");
    const capture = object(payments.captures[0]);
    const captured = object(capture.amount);
    if (capture.status !== "COMPLETED" || capture.final_capture !== true || captured.currency_code !== "AUD" || decimalCents(captured.value) !== order.totalAudCents) throw new Error("PAYMENT_NOT_VERIFIED");
    return providerId(capture.id);
  }
  async verifyWebhook(headers: Headers, event: unknown, webhookId: string) {
    const fields: Record<string, string> = {};
    for (const [key, header] of Object.entries({ transmission_id: "paypal-transmission-id", transmission_time: "paypal-transmission-time", transmission_sig: "paypal-transmission-sig", cert_url: "paypal-cert-url", auth_algo: "paypal-auth-algo" })) {
      const value = headers.get(header);
      if (!value || value.length > 4096) return false;
      fields[key] = value;
    }
    try {
      const cert = new URL(fields.cert_url);
      if (cert.protocol !== "https:" || !["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"].includes(cert.hostname) || cert.username || cert.password || cert.port) return false;
      const result = await this.api("/v1/notifications/verify-webhook-signature", "POST", { ...fields, webhook_id: webhookId, webhook_event: event });
      return result.verification_status === "SUCCESS";
    } catch { return false; }
  }
}

export class CJSandbox implements SupplierGateway {
  private static cached?: { key: string; token: string; until: number };
  private readonly base = "https://developers.cjdropshipping.com/api2.0/v1";
  constructor(private token: string, private send: Transport = defaultTransport) {}
  static async fromApiKey(key: string, send: Transport = defaultTransport) {
    if (this.cached?.key === key && this.cached.until > Date.now()) return new CJSandbox(this.cached.token, send);
    const response = await send("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: key }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("CJ_AUTH_FAILED");
    const result = object(await response.json());
    const data = object(result.data);
    if (result.code !== 200 || result.result !== true || typeof data.accessToken !== "string" || !data.accessToken) throw new Error("CJ_AUTH_FAILED");
    const expiry = typeof data.accessTokenExpiryDate === "string" ? Date.parse(data.accessTokenExpiryDate) : NaN;
    this.cached = { key, token: data.accessToken, until: Number.isFinite(expiry) ? expiry - 60000 : Date.now() + 300000 };
    return new CJSandbox(data.accessToken, send);
  }
  private async api(path: string, method: string, body?: unknown) {
    const response = await this.send(this.base + path, { method, headers: { "CJ-Access-Token": this.token, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`CJ_REQUEST_HTTP_${response.status}`);
    const json = object(await response.json());
    if (json.code !== 200 || json.result !== true) throw new Error(Number.isSafeInteger(json.code) && Number(json.code) >= 0 && Number(json.code) <= 9999999999 ? `CJ_API_CODE_${json.code}` : "CJ_REQUEST_FAILED");
    return json.data;
  }
  async createSandboxOrder(order: Order) {
    const result = object(await this.api("/shopping/order/createOrderV2", "POST", {
      orderNumber: `DSS-TEST-${order.id}`, isSandbox: 1, payType: 3,
      shippingCountryCode: "AU", shippingCountry: "Australia", shippingProvince: "NSW", shippingCity: "Sydney", shippingZip: "2000",
      shippingCustomerName: "Sandbox Recipient", shippingAddress: "TEST ONLY - DO NOT DELIVER",
      fromCountryCode: "CN", logisticName: "CJPacket Ordinary", shopLogisticsType: 2, orderFlow: 1,
      remark: "Sandbox integration test. No real payment or shipment authorised.",
      products: order.lines.map((line) => ({ sku: sandboxCatalogue[line.productId].cjSku, quantity: line.quantity, storeLineItemId: `${order.id}-${line.productId}` })),
    }));
    return providerId(result.orderId);
  }
  async simulatePayment(orderId: string) {
    const id = providerId(orderId);
    const detail = object(await this.api(`/shopping/order/getOrderDetail?orderId=${id}`, "GET"));
    // CJ uses its production API for both modes: assert the returned flag first.
    if (detail.isSandbox !== 1) throw new Error("CJ_NOT_A_SANDBOX_ORDER");
    if (await this.api("/shopping/sandbox/simulatePay", "POST", { orderId: id }) !== true) throw new Error("CJ_SIMULATION_NOT_CONFIRMED");
  }
}
