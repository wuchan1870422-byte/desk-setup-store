import { D1Orders, type Issue } from "./d1-store";
import type { Order } from "./orders";

const reasons = ["PAYPAL_CREATE_UNCERTAIN", "PAYPAL_CAPTURE_UNCERTAIN", "PAYMENT_NOT_VERIFIED", "CJ_RESULT_UNCERTAIN_NO_AUTO_RETRY"];
function handoff(order: Order, issues: Issue[], stale: boolean) {
  const reason = issues.length ? "PAYMENT_EXCEPTION_HOLD" : stale ? "STALE_TRANSITION_NO_AUTO_RETRY" : order.state === "REVIEW" ? reasons.includes(order.reviewReason || "") ? order.reviewReason : "REVIEW_REQUIRED" : order.state;
  const action = issues.length ? "CHECK_PAYPAL_AND_SUPPLIER_MANUALLY_DO_NOT_RESUBMIT" : reason === "PAYPAL_CAPTURE_UNCERTAIN" || order.state === "PAID" ? "FRESH_PAYMENT_READ_THEN_OWNER_RECONCILE" : order.state === "CJ_SANDBOX_PAID" ? "RECORD_SANDBOX_RESULT_NO_REAL_SHIPMENT" : order.state === "PENDING" ? "AWAIT_SANDBOX_BUYER_APPROVAL_OR_INSPECT_CANCELLATION" : "INSPECT_PROVIDER_RECORDS_NO_BLIND_RETRY";
  return { orderId: order.id, state: order.state, createdAt: order.createdAt, paypalId: order.paypalId, captureId: order.captureId, cjOrderId: order.cjOrderId, reason, nextAction: action, paymentHeld: issues.length > 0, shipment: "not_created", issues };
}
export async function orderReview(db: D1Orders, after = "", limit = 50, staleMinutes = 30, now = new Date()) {
  if (!Number.isInteger(staleMinutes) || staleMinutes < 1 || staleMinutes > 10080 || !Number.isFinite(now.getTime())) throw new Error("INVALID_PAGINATION");
  const page = await db.page(after, limit);
  return {
    mode: "sandbox", livePayments: false, realProcurement: false,
    rows: page.orders.map(order => handoff(order, page.issues.filter(e => e.order_id === order.id), ["CREATING", "CAPTURING", "FULFILLING"].includes(order.state) && (!Number.isFinite(Date.parse(order.updatedAt || order.createdAt)) || now.getTime() - Date.parse(order.updatedAt || order.createdAt) >= staleMinutes * 60000))),
    nextCursor: page.nextCursor,
    note: "Read-only. Acknowledgement does not release a hold or retry an order. Already in-flight supplier calls require manual investigation.",
  };
}
