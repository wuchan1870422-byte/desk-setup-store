import commerce, { type Environment } from '../worker';

const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Desk Setup Store — Sandbox integration</title><style>body{margin:0;background:#f4f1e9;color:#183b32;font:17px/1.6 system-ui,sans-serif}main{max-width:660px;margin:10vh auto;padding:24px}small{letter-spacing:.12em;text-transform:uppercase}h1{font-size:clamp(2rem,7vw,3.4rem);line-height:1.12}section{border:1px solid #d5dbd1;border-radius:16px;padding:22px;background:#fffcf6}a{color:inherit}li{margin:.5em 0}code{overflow-wrap:anywhere}</style><main><small>Desk Setup Store · owner sandbox</small><h1>Test the order flow.<br>Keep real money off.</h1><section><strong>Integration is awaiting secure credential setup.</strong><ul><li>PayPal sandbox only.</li><li>CJ sandbox orders and simulated payment only.</li><li>Dedicated durable order database.</li><li>No customer data or real shipments.</li></ul><p>Order management requires server authentication. The storefront cart remains in demo mode.</p><a href="/health">View service readiness</a></section><p><a href="https://desk-setup-store.j-w2007.chatgpt.site">Open the demo storefront →</a></p></main></html>`;
const hostedSandbox = {
  async fetch(request: Request, env: Environment) {
    const configured = env.COMMERCE_MODE === 'sandbox' && env.ORDERS && env.PAYPAL_SANDBOX_CLIENT_ID && env.PAYPAL_SANDBOX_SECRET && (env.CJ_API_KEY || env.CJ_ACCESS_TOKEN) && (env.SANDBOX_ADMIN_TOKEN?.length || 0) >= 32;
    const content = configured ? page.replace('Integration is awaiting secure credential setup.', 'Server credentials are configured. End-to-end testing is in progress.') : page;
    if (new URL(request.url).pathname === '/' && request.method === 'GET') return new Response(content, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
    return commerce.fetch(request, env);
  },
};
export default hostedSandbox;
