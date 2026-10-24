import type { Order, OrderStore, State } from "./orders";

// Minimal structural interface; avoids tying the storefront to a Workers SDK.
export interface Database {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<{ meta: { changes?: number } }>;
    };
  };
}
export class D1Orders implements OrderStore {
  constructor(private db: Database) {}
  async insert(order: Order) {
    const result = await this.db.prepare("INSERT INTO sandbox_orders (id, request_key, state, payload) VALUES (?, ?, ?, ?) ON CONFLICT(request_key) DO NOTHING").bind(order.id, order.requestKey, order.state, JSON.stringify(order)).run();
    return result.meta.changes === 1;
  }
  private async read(column: "id" | "request_key" | "paypal_id", value: string) {
    const row = await this.db.prepare(`SELECT payload FROM sandbox_orders WHERE ${column} = ?`).bind(value).first<{ payload: string }>();
    return row ? JSON.parse(row.payload) as Order : null;
  }
  byId(id: string) { return this.read("id", id); }
  byKey(key: string) { return this.read("request_key", key); }
  byPayPal(id: string) { return this.read("paypal_id", id); }
  async byCapture(id: string) {
    const row = await this.db.prepare("SELECT payload FROM sandbox_orders WHERE capture_id = ?").bind(id).first<{ payload: string }>();
    return row ? JSON.parse(row.payload) as Order : null;
  }
  async hasHold(id: string) {
    const row = await this.db.prepare("SELECT COUNT(*) AS count FROM sandbox_order_events WHERE order_id = ?").bind(id).first<{ count: number }>();
    return Boolean(row?.count);
  }
  async issue(orderId: string, eventKey: string, kind: IssueKind) {
    const result = await this.db.prepare("INSERT INTO sandbox_order_events (event_key, order_id, kind, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(event_key) DO UPDATE SET kind = excluded.kind WHERE sandbox_order_events.order_id = excluded.order_id AND sandbox_order_events.kind = 'PAYMENT_EXCEPTION_UNCONFIRMED' AND excluded.kind <> 'PAYMENT_EXCEPTION_UNCONFIRMED'").bind(eventKey, orderId, kind, new Date().toISOString()).run();
    return result.meta.changes === 1;
  }
  async acknowledge(eventKey: string) {
    const result = await this.db.prepare("UPDATE sandbox_order_events SET status = 'acknowledged', acknowledged_at = ? WHERE event_key = ? AND status = 'open'").bind(new Date().toISOString(), eventKey).run();
    return result.meta.changes === 1;
  }
  async page(after = "", limit = 50) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (after && !/^[a-zA-Z0-9-]{4,100}$/.test(after))) throw new Error("INVALID_PAGINATION");
    const rows = await this.db.prepare("SELECT payload FROM sandbox_orders WHERE id > ? ORDER BY id LIMIT ?").bind(after, limit + 1).all<{ payload: string }>();
    const orders = rows.results.slice(0, limit).map(row => JSON.parse(row.payload) as Order);
    const issues = await this.db.prepare("SELECT event_key, order_id, kind, created_at, status FROM sandbox_order_events WHERE order_id IN (SELECT id FROM sandbox_orders WHERE id > ? ORDER BY id LIMIT ?)").bind(after, limit).all<Issue>();
    return { orders, issues: issues.results, nextCursor: rows.results.length > limit ? orders.at(-1)!.id : null };
  }
  async transition(order: Order, expected: State) {
    order = { ...order, updatedAt: new Date().toISOString() };
    // Payment-exception holds remain effective after acknowledgement. The guard
    // shares the atomic state claim; reading a ledger first alone would race.
    const result = await this.db.prepare("UPDATE sandbox_orders SET state = ?, paypal_id = ?, capture_id = ?, payload = ? WHERE id = ? AND state = ? AND (? NOT IN ('CAPTURING','PAID','FULFILLING') OR NOT EXISTS (SELECT 1 FROM sandbox_order_events WHERE order_id = ?))").bind(order.state, order.paypalId || null, order.captureId || null, JSON.stringify(order), order.id, expected, order.state, order.id).run();
    return result.meta.changes === 1;
  }
}

export type IssueKind = "PAYMENT_REFUNDED" | "PAYMENT_REVERSED" | "PAYMENT_DECLINED" | "PAYMENT_EXCEPTION_UNCONFIRMED";
export type Issue = { event_key: string; order_id: string; kind: IssueKind; created_at: string; status: "open" | "acknowledged" };
