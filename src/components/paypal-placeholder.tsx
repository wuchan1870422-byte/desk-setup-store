import { store } from "@/config/store";

export function PayPalPlaceholder() {
  // Official PayPal Buttons belong in this slot only after a backend can create,
  // validate and capture Orders. Never trust the local cart as a payable amount.
  if (!store.demoMode) throw new Error("Live checkout is not implemented. Keep demoMode enabled.");
  return <section className="paypal-slot" aria-label="PayPal integration placeholder"><span className="eyebrow">FUTURE PAYMENT INTEGRATION</span><div id="paypal-button-container" data-mode="demo"><button className="paypal-disabled" disabled>PayPal checkout unavailable</button></div><p>This is an integration placeholder, not an official payment button. No PayPal SDK is loaded and no payment can be made.</p></section>;
}
