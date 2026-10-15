import { store } from "@/config/store";

type AnalyticsEvent = "page_view" | "view_product" | "add_to_cart" | "remove_from_cart";
type AnalyticsPayload = { path?: string; productId?: string; quantity?: number };
type Adapter = (event: AnalyticsEvent, payload: AnalyticsPayload) => void;
let adapter: Adapter | undefined;

// No adapter or network request is active. Register only after a privacy review.
export function registerAnalyticsAdapter(next: Adapter) { adapter = next; }
export function track(event: AnalyticsEvent, payload: AnalyticsPayload = {}) {
  if (!store.analytics.enabled || !adapter) return;
  adapter(event, payload);
}
