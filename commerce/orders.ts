import { priceLines, validateLines, type Line } from "./catalogue";

export type State = "CREATING" | "PENDING" | "CAPTURING" | "PAID" | "FULFILLING" | "CJ_SANDBOX_PAID" | "REVIEW";
export type Order = {
  id: string; requestKey: string; lines: Line[]; totalAudCents: number; state: State;
  paypalId?: string; approvalUrl?: string; captureId?: string; cjOrderId?: string;
  reviewReason?: string; createdAt: string;
};
export interface OrderStore {
  insert(order: Order): Promise<boolean>;
  byId(id: string): Promise<Order | null>;
  byKey(key: string): Promise<Order | null>;
  byPayPal(id: string): Promise<Order | null>;
  transition(order: Order, expected: State): Promise<boolean>;
}
export interface PaymentGateway {
  create(order: Order): Promise<{ id: string; approvalUrl: string }>;
  capture(order: Order): Promise<unknown>;
  get(order: Order): Promise<unknown>;
  verifyPaid(payload: unknown, order: Order): string;
}
export interface SupplierGateway {
  createSandboxOrder(order: Order): Promise<string>;
  simulatePayment(orderId: string): Promise<void>;
}

export class SandboxOrders {
  constructor(private db: OrderStore, private paypal: PaymentGateway, private cj: SupplierGateway) {}

  async create(key: string, input: unknown) {
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key)) throw new Error("INVALID_REQUEST_KEY");
    const lines = validateLines(input);
    const row: Order = { id: crypto.randomUUID(), requestKey: key, lines, totalAudCents: priceLines(lines), state: "CREATING", createdAt: new Date().toISOString() };
    if (!await this.db.insert(row)) {
      const previous = await this.db.byKey(key);
      if (!previous || JSON.stringify(previous.lines) !== JSON.stringify(lines)) throw new Error("IDEMPOTENCY_CONFLICT");
      return previous;
    }
    try {
      const provider = await this.paypal.create(row);
      const next: Order = { ...row, paypalId: provider.id, approvalUrl: provider.approvalUrl, state: "PENDING" };
      if (!await this.db.transition(next, "CREATING")) throw new Error("ORDER_CONFLICT");
      return next;
    } catch {
      await this.db.transition({ ...row, state: "REVIEW", reviewReason: "PAYPAL_CREATE_UNCERTAIN" }, "CREATING");
      throw new Error("PAYPAL_CREATE_UNCERTAIN");
    }
  }

  async capture(id: string) {
    const row = await this.db.byId(id);
    if (!row) throw new Error("ORDER_NOT_FOUND");
    if (row.state !== "PENDING") return row;
    const claimed: Order = { ...row, state: "CAPTURING" };
    if (!await this.db.transition(claimed, "PENDING")) return (await this.db.byId(id))!;
    try { return await this.settle(claimed, await this.paypal.capture(claimed)); }
    catch {
      await this.db.transition({ ...claimed, state: "REVIEW", reviewReason: "PAYPAL_CAPTURE_UNCERTAIN" }, "CAPTURING");
      throw new Error("PAYPAL_CAPTURE_UNCERTAIN");
    }
  }

  // Called only after the Worker verifies a real PayPal sandbox webhook signature.
  async reconcile(paypalId: string) {
    const row = await this.db.byPayPal(paypalId);
    const recoverable = row?.state === "REVIEW" && row.reviewReason === "PAYPAL_CAPTURE_UNCERTAIN";
    if (!row || (!recoverable && !["PENDING", "CAPTURING", "PAID"].includes(row.state))) return row;
    return this.settle(row, await this.paypal.get(row));
  }

  // A fresh PayPal read can resume sandbox work, never repeat a capture or an
  // uncertain supplier request. This operation is restricted to the owner.
  async recover(id: string) {
    const row = await this.db.byId(id);
    if (!row) throw new Error("ORDER_NOT_FOUND");
    if (!row.paypalId) return row;
    return this.reconcile(row.paypalId);
  }

  private async settle(row: Order, payload: unknown) {
    let captureId: string;
    try { captureId = this.paypal.verifyPaid(payload, row); }
    catch {
      await this.db.transition({ ...row, state: "REVIEW", reviewReason: "PAYMENT_NOT_VERIFIED" }, row.state);
      throw new Error("PAYMENT_NOT_VERIFIED");
    }
    if (row.captureId && row.captureId !== captureId) throw new Error("CAPTURE_REFERENCE_MISMATCH");
    const paid: Order = { ...row, state: "PAID", captureId, reviewReason: undefined };
    if (row.state !== "PAID" && !await this.db.transition(paid, row.state)) return (await this.db.byId(row.id))!;
    const claimed: Order = { ...paid, state: "FULFILLING" };
    if (!await this.db.transition(claimed, "PAID")) return (await this.db.byId(row.id))!;
    try {
      const cjOrderId = await this.cj.createSandboxOrder(claimed);
      const linked: Order = { ...claimed, cjOrderId };
      // Persist the CJ reference before simulating payment, for manual reconciliation.
      if (!await this.db.transition(linked, "FULFILLING")) throw new Error("ORDER_CONFLICT");
      await this.cj.simulatePayment(cjOrderId);
      const complete: Order = { ...linked, state: "CJ_SANDBOX_PAID" };
      if (!await this.db.transition(complete, "FULFILLING")) throw new Error("ORDER_CONFLICT");
      return complete;
    } catch {
      const current = (await this.db.byId(row.id))!;
      await this.db.transition({ ...current, state: "REVIEW", reviewReason: "CJ_RESULT_UNCERTAIN_NO_AUTO_RETRY" }, "FULFILLING");
      return (await this.db.byId(row.id))!;
    }
  }
}
