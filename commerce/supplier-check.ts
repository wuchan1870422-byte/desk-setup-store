import { priceLines, type Line } from "./catalogue";
import type { Database } from "./d1-store";
import type { Order, SupplierGateway } from "./orders";

// Provider contract checks are separate from customer/payment orders. They use
// only the adapter's fixed sandbox recipient and cannot certify a PayPal sale.
export type SupplierCheckState = "CREATING" | "SIMULATING" | "SIMULATED_PAID" | "REVIEW";
export type SupplierCheck = {
  id: string; requestKey: string; state: SupplierCheckState; createdAt: string;
  kind: "CJ_SANDBOX_CONTRACT_CHECK"; cjOrderId?: string; reviewReason?: string;
  livePayments: false; realProcurement: false;
};
export interface SupplierCheckGateway extends SupplierGateway {
  inspectSandboxOrder(id: string): Promise<{ isSandbox: boolean; state: string }>;
}

export class D1SupplierChecks {
  constructor(private db: Database) {}
  async insert(row: SupplierCheck) {
    const result = await this.db.prepare("INSERT INTO sandbox_supplier_checks (id, request_key, state, payload) VALUES (?, ?, ?, ?) ON CONFLICT(request_key) DO NOTHING")
      .bind(row.id, row.requestKey, row.state, JSON.stringify(row)).run();
    return result.meta.changes === 1;
  }
  private async read(column: "id" | "request_key", value: string) {
    const row = await this.db.prepare(`SELECT payload FROM sandbox_supplier_checks WHERE ${column} = ?`).bind(value).first<{ payload: string }>();
    return row ? JSON.parse(row.payload) as SupplierCheck : null;
  }
  byId(id: string) { return this.read("id", id); }
  byKey(key: string) { return this.read("request_key", key); }
  async transition(row: SupplierCheck, expected: SupplierCheckState) {
    const result = await this.db.prepare("UPDATE sandbox_supplier_checks SET state = ?, payload = ? WHERE id = ? AND state = ?")
      .bind(row.state, JSON.stringify(row), row.id, expected).run();
    return result.meta.changes === 1;
  }
}

function diagnostic(error: unknown) {
  const reason = error instanceof Error ? error.message : "";
  return /^CJ_(REQUEST_HTTP_[1-5][0-9]{2}|API_CODE_[0-9]{1,10}|NOT_A_SANDBOX_ORDER|ORDER_NOT_UNPAID|SIMULATION_NOT_CONFIRMED|AUTH_FAILED|REQUEST_FAILED)$/.test(reason)
    ? reason : "CJ_RESULT_UNCERTAIN_NO_AUTO_RETRY";
}

export class SandboxSupplierChecks {
  constructor(private db: D1SupplierChecks, private cj: SupplierCheckGateway) {}
  async resume(id: string) {
    const row = await this.db.byId(id);
    if (!row) throw new Error("CHECK_NOT_FOUND");
    // Explicit owner recovery is limited to a definite rejected simulation.
    // Never resubmit a supplier order or retry unknown/timeout outcomes.
    if (row.state !== "REVIEW" || row.reviewReason !== "CJ_API_CODE_812" || !row.cjOrderId) return row;
    const current = await this.cj.inspectSandboxOrder(row.cjOrderId);
    if (!current.isSandbox) throw new Error("CJ_NOT_A_SANDBOX_ORDER");
    if (["UNSHIPPED", "PENDING", "PROCESSING"].includes(current.state)) {
      await this.db.transition({ ...row, state: "SIMULATED_PAID", reviewReason: undefined }, "REVIEW");
      return (await this.db.byId(id))!;
    }
    if (!["CREATED", "UNPAID"].includes(current.state)) return row;
    const claimed: SupplierCheck = { ...row, state: "SIMULATING", reviewReason: undefined };
    if (!await this.db.transition(claimed, "REVIEW")) return (await this.db.byId(id))!;
    try {
      await this.cj.simulatePayment(row.cjOrderId);
      await this.db.transition({ ...claimed, state: "SIMULATED_PAID" }, "SIMULATING");
    } catch (error) {
      await this.db.transition({ ...claimed, state: "REVIEW", reviewReason: diagnostic(error) }, "SIMULATING");
    }
    return (await this.db.byId(id))!;
  }
  async create(key: string) {
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key)) throw new Error("INVALID_REQUEST_KEY");
    let row: SupplierCheck = {
      id: crypto.randomUUID(), requestKey: key, state: "CREATING", createdAt: new Date().toISOString(),
      kind: "CJ_SANDBOX_CONTRACT_CHECK", livePayments: false, realProcurement: false,
    };
    // A repeated key is read-only, including uncertain/crashed attempts.
    if (!await this.db.insert(row)) return (await this.db.byKey(key))!;
    const lines: Line[] = [{ productId: "tech-organiser-black-3", quantity: 1 }];
    const fixture: Order = { id: row.id, requestKey: key, state: "CREATING", lines, totalAudCents: priceLines(lines), createdAt: row.createdAt };
    try {
      const cjOrderId = await this.cj.createSandboxOrder(fixture);
      const linked: SupplierCheck = { ...row, cjOrderId, state: "SIMULATING" };
      if (!await this.db.transition(linked, "CREATING")) throw new Error("CHECK_CONFLICT");
      row = linked;
      // The adapter verifies isSandbox=1 before its simulation-only endpoint.
      await this.cj.simulatePayment(cjOrderId);
      const complete: SupplierCheck = { ...row, state: "SIMULATED_PAID" };
      if (!await this.db.transition(complete, "SIMULATING")) throw new Error("CHECK_CONFLICT");
      return complete;
    } catch (error) {
      await this.db.transition({ ...row, state: "REVIEW", reviewReason: diagnostic(error) }, row.state);
      return (await this.db.byId(row.id))!;
    }
  }
}
