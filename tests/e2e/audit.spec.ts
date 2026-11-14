import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const paths = ["/", "/products/cable-keeper/", "/products/desk-shelf/", "/products/tech-pouch/", "/cart/", "/desk-fit/", "/contact/", "/shipping-policy/", "/return-policy/", "/privacy-policy/", "/missing/", "/products/missing/"];
const externalRequests = new WeakMap<object, string[]>();

test.beforeEach(async ({ context }) => {
  const unexpected: string[] = [];
  externalRequests.set(context, unexpected);
  await context.route("**/*", route => {
    const origin = new URL(route.request().url()).origin;
    if (origin === "http://127.0.0.1:3100") return route.continue();
    unexpected.push(origin);
    return route.abort("blockedbyclient");
  });
});
test.afterEach(async ({ context }) => { expect(externalRequests.get(context)).toEqual([]); });

test("every route and error page passes WCAG A/AA scan with no overflow or browser errors", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(path.includes("missing") ? 404 : 200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    if (results.violations.length) await testInfo.attach(`axe-${path.replaceAll("/", "_")}`, { body: JSON.stringify(results.violations, null, 2), contentType: "application/json" });
    expect.soft(results.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), path).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("mobile menu supports Escape, focus restoration and viewport changes", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open menu" });
  if (!await menu.isVisible()) return;
  await menu.click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link").first().focus();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  await menu.click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("blank fit answers do not silently become zero and errors are associated with inputs", async ({ page }) => {
  await page.goto("/desk-fit/");
  const cables = page.getByLabel("Cables you use every day");
  const alert = page.locator(".fit-results [role=alert]");
  await cables.fill("");
  await expect(alert).toBeVisible();
  await expect(cables).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Clear desk width (mm)")).toHaveAttribute("aria-invalid", "false");
  await cables.fill("0");
  await expect(alert).toHaveCount(0);
  await page.getByLabel("Clear desk width (mm)").fill("99");
  await expect(alert).toBeVisible();
  await expect(page.getByRole("button", { name: /Add to demo bag/ })).toHaveCount(0);
});

test("populated bag totals, maximum quantity, download contents and accessibility", async ({ page }, testInfo) => {
  await page.goto("/products/cable-keeper/");
  for (let n = 1; n < 10; n++) {
    const increase = page.getByRole("button", { name: "Increase quantity", exact: true });
    if (testInfo.project.use.hasTouch) await increase.tap();
    else await increase.click();
  }
  await expect(page.getByRole("button", { name: "Increase quantity", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Add to demo bag", exact: true }).click();
  await page.getByRole("link", { name: "Shopping bag, 10 items" }).click();
  await expect(page.getByLabel("Quantity 10", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Increase The Cable Keeper quantity" })).toBeDisabled();
  await expect(page.locator(".cart-total dd")).toContainText("$299.00");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save demo bag" }).click();
  const stream = await (await downloaded).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual({ schema: "desk-setup-quote-v1", currency: "AUD", mode: "demo", items: [{ productId: "demo-cable-keeper", quantity: 10 }], paymentRequested: false });
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  if ([390, 1440].includes(page.viewportSize()!.width)) await page.screenshot({ path: testInfo.outputPath("cart.png"), fullPage: true });
});

test("forged approval or cancellation URLs never turn a demo bag into a paid order", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add The Tech Pouch to demo bag" }).click();
  for (const result of ["approved", "cancelled"]) {
    await page.goto(`/cart/?sandbox=${result}&token=FORGED-NOT-A-PAYMENT`);
    await expect(page.locator(".cart-item")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "PayPal checkout unavailable" })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Your demo summary" })).toBeVisible();
    expect(await page.locator("form,iframe,script[src*=paypal]").count()).toBe(0);
  }
});
