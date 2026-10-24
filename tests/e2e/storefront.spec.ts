import { test, expect } from "@playwright/test";

const externalRequests = new WeakMap<object, string[]>();
test.beforeEach(async ({ context }) => {
  // Every browser test uses only the local static export. Unexpected external
  // traffic fails the test rather than reaching a payment or supplier service.
  const unexpected: string[] = [];
  externalRequests.set(context, unexpected);
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:3100") return route.continue();
    unexpected.push(url.origin);
    return route.abort();
  });
});
test.afterEach(async ({ context }) => { expect(externalRequests.get(context)).toEqual([]); });

test("responsive navigation, collection filters, footer routes and demo boundary", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Explore freely. No orders or payments accepted.")).toBeVisible();
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  }
  for (const category of ["Cable management", "Desk essentials", "On the go"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await expect(page.locator(".product-card")).toHaveCount(1);
  }
  await page.getByRole("button", { name: "All essentials" }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
  const links = await page.locator("footer a").evaluateAll(elements => elements.map(e => (e as HTMLAnchorElement).pathname));
  for (const path of new Set(links)) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(await page.locator("form,input[type=email],input[type=tel],iframe,script[src*=paypal]").count()).toBe(0);
    expect(await page.locator("body").evaluate(e => e.scrollWidth <= window.innerWidth + 1)).toBe(true);
  }
});

test("all products, quantities, refresh, download, removal and empty bag", async ({ page }) => {
  await page.goto("/");
  for (const name of ["The Cable Keeper", "The Desk Shelf", "The Tech Pouch"]) await page.getByRole("button", { name: `Add ${name} to demo bag` }).click();
  await page.goto("/cart/");
  await expect(page.locator(".cart-item")).toHaveCount(3);
  await page.getByRole("button", { name: "Increase The Cable Keeper quantity" }).click();
  await page.reload();
  await expect(page.getByLabel("Quantity 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /PayPal/ })).toBeDisabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save demo bag" }).click();
  expect((await download).suggestedFilename()).toBe("desk-setup-demo-bag.json");
  await page.getByRole("button", { name: "Decrease The Cable Keeper quantity" }).click();
  await expect(page.getByRole("button", { name: "Decrease The Cable Keeper quantity" })).toBeDisabled();
  await page.getByRole("button", { name: "Remove The Desk Shelf" }).click();
  await expect(page.locator(".cart-item")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear demo bag" }).click();
  await expect(page.getByText("Your demo bag is empty.", { exact: false })).toBeVisible();
});

test("corrupt and blocked storage degrade safely; direct route and missing page render", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("desk-setup-demo-cart-v1", "{broken"));
  await page.goto("/cart/");
  await expect(page.locator(".empty-cart")).toBeVisible();
  await page.goto("/products/tech-pouch/");
  await page.getByRole("button", { name: "Increase quantity", exact: true }).click();
  await page.getByRole("button", { name: "Add to demo bag", exact: true }).click();
  await expect(page.getByRole("link", { name: "Shopping bag, 2 items" })).toBeVisible();
  const missing = await page.goto("/does-not-exist/");
  expect(missing?.status()).toBe(404);
  await expect(page.locator("main")).toBeVisible();
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Unavailable", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Unavailable", "SecurityError"); };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Add The Tech Pouch to demo bag" }).click();
  // Navigate with the app (no full reload) to retain the in-memory bag.
  await page.getByRole("link", { name: "Shopping bag, 1 items" }).click();
  await expect(page.getByText("Browser storage is unavailable.", { exact: false })).toBeVisible();
  await expect(page.locator(".cart-item")).toHaveCount(1);
});

test("two tabs synchronise and keyboard skip link reaches main", async ({ page, context }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const second = await context.newPage();
  await second.goto("/cart/");
  await expect(second.locator(".empty-cart")).toBeVisible();
  await page.getByRole("button", { name: "Add The Tech Pouch to demo bag" }).click();
  await expect(second.locator(".cart-item")).toHaveCount(1);
  await second.getByRole("button", { name: "Clear demo bag" }).click();
  await expect(page.getByRole("link", { name: "Shopping bag, 0 items" })).toBeVisible();
});
