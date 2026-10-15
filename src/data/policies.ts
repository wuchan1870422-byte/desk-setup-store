export type Policy = { slug: string; title: string; intro: string; sections: { title: string; paragraphs: string[] }[] };

export const policies: Policy[] = [
  {
    slug: "shipping-policy", title: "Shipping policy", intro: "A clear view of delivery — before anything leaves the desk.",
    sections: [
      { title: "This store is a demonstration", paragraphs: ["We do not accept orders, dispatch goods or collect customer shipping addresses. The information below is a draft for a future Australia-focused cross-border store and is not a delivery commitment."] },
      { title: "Destination & dispatch", paragraphs: ["Australia is the intended destination market. Suppliers, dispatch country, carriers, supported postcodes, PO boxes and remote-area exclusions have not been selected or verified. No Australian warehouse or local-stock claim is made."] },
      { title: "Illustrative timing", paragraphs: ["Demo handling time: 2–4 business days. Demo transit time: 7–15 business days after dispatch. These fictional estimates are not validated service levels and must be replaced with tested route information before orders are enabled. No delivery date is promised."] },
      { title: "Illustrative charges & taxes", paragraphs: ["The demo bag displays a fictional A$9.00 delivery charge per bag. All displayed product prices are illustrative and shown in AUD. Actual postage, GST, customs duties, import responsibility and any remote-area charges must be determined and clearly disclosed before launch. The illustrative total is not a payable quote."] },
      { title: "Tracking, delays & missing parcels", paragraphs: ["No tracking service is active. Before trading, the store must publish its dispatch notifications, tracking process, delay support, lost-parcel procedure and cancellation options. A real support channel must be available."] },
    ],
  },
  {
    slug: "return-policy", title: "Return policy", intro: "Straightforward support starts with clear expectations.",
    sections: [
      { title: "Draft only — no purchases can be made", paragraphs: ["There are no orders or purchases to return in this MVP. This page is an inactive policy outline. Do not send goods or personal information to the example contact details."] },
      { title: "Consumer rights", paragraphs: ["Before launch, the operator must confirm applicable Australian Consumer Law obligations, including consumer guarantees and remedies for faulty or misdescribed goods. A voluntary store policy must not exclude or restrict rights that cannot lawfully be excluded. This draft does not establish a limit on those rights."] },
      { title: "Change-of-mind returns", paragraphs: ["A voluntary change-of-mind window has not been set. Eligibility, condition requirements, exclusions, proof of purchase, return approval and postage costs must be finalised and disclosed before accepting orders. No free-return or 30-day-return promise is made."] },
      { title: "Faulty, damaged or incorrect goods", paragraphs: ["The live process must explain how to request help, how the issue is assessed, applicable repair, replacement or refund remedies, and who arranges return shipping. A store-imposed reporting deadline must not override mandatory consumer rights."] },
      { title: "Return address & refund processing", paragraphs: ["A verified return address, accountable seller identity and operating support inbox are required before launch. No return address or refund processing timeline has been confirmed. Do not ship anything using this draft."] },
    ],
  },
  {
    slug: "privacy-policy", title: "Privacy policy", intro: "A small demo, with a deliberately small data footprint.",
    sections: [
      { title: "What this demo does", paragraphs: ["This MVP has no account registration, checkout, newsletter signup, contact form or order database. It does not ask for a name, email address, delivery address or payment details. No credit-card data is collected or stored by the application."] },
      { title: "Your bag stays in your browser", paragraphs: ["The application uses localStorage under the key desk-setup-demo-cart-v1 to remember product IDs and quantities on this origin. The app does not send that cart to a server. The data remains until you clear the bag or clear site data in your browser. You can browse without persistent storage; the bag then lasts only for the current page visit."] },
      { title: "Analytics & external services", paragraphs: ["Application analytics are disabled. The analytics module contains an inactive adapter interface and sends no events. No PayPal SDK, advertising pixel, external font or third-party product image is loaded by the application. Hosting infrastructure operates separately from application analytics."] },
      { title: "Hosting requests", paragraphs: ["The hosting provider may process request information such as IP addresses, user-agent data and access logs to deliver and protect the site. Provider-specific logging, location, retention and any cross-border processing must be checked and documented before launch. This site does not promise that hosting infrastructure collects no technical data."] },
      { title: "Before this becomes a live store", paragraphs: ["The operator must publish a verified business identity and privacy contact, confirm applicable privacy obligations, document payment and fulfilment processors, data uses, retention, access and correction procedures, complaint handling and any relevant overseas disclosures. The example email on the Contact page is not monitored."] },
    ],
  },
];
