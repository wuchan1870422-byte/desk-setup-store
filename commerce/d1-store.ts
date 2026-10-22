import type { Order, OrderStore, State } from "./orders";

// Minimal structural interface; avoids tying the storefront to a Workers SDK.
export interface Database {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
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
  async transition(order: Order, expected: State) {
    const result = await this.db.prepare("UPDATE sandbox_orders SET state = ?, paypal_id = ?, capture_id = ?, payload = ? WHERE id = ? AND state = ?").bind(order.state, order.paypalId || null, order.captureId || null, JSON.stringify(order), order.id, expected).run();
    return result.meta.changes === 1;
  }
}
