import { readFile, access, readdir } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";

const pages = ["index.html", "products/cable-keeper/index.html", "products/desk-shelf/index.html", "products/tech-pouch/index.html", "cart/index.html", "shipping-policy/index.html", "return-policy/index.html", "privacy-policy/index.html", "contact/index.html", "404.html"];
let checkedLinks = 0;
for (const page of pages) {
  const html = await readFile(join("out", page), "utf8");
  assert.match(html, /<html[^>]+lang="en-AU"/, `${page}: Australian English`);
  assert.match(html, /name="viewport"/, `${page}: responsive viewport`);
  assert.match(html, /name="description"/, `${page}: SEO description`);
  assert.match(html, /property="og:title"/, `${page}: Open Graph title`);
  assert.match(html, /noindex/, `${page}: demo is not indexed`);
  assert.match(html, /No orders or payments accepted/, `${page}: demo banner`);
  assert.doesNotMatch(html, /<form\b|<input\b|paypal\.com\/sdk\/js/, `${page}: no data collection or payment SDK`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
    const url = decodeURI(match[1]);
    if (!url || url === "/") continue;
    await access(join("out", url.endsWith("/") ? `${url}index.html` : url));
    checkedLinks++;
  }
}
for (const file of ["sitemap.xml", "robots.txt", "images/og-cover.png", "_headers"]) await access(join("out", file));
const sitemap = await readFile("out/sitemap.xml", "utf8");
assert.match(sitemap, /products\/cable-keeper/);
assert.match(sitemap, /https:\/\//);
assert.doesNotMatch(sitemap, /localhost/);
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))).flat();
for (const file of (await walk("out/_next/static")).filter((file) => file.endsWith(".js"))) {
  const js = await readFile(file, "utf8");
  assert.doesNotMatch(js, /paypal\.com\/sdk\/js|api-m\.paypal\.com|sk-proj-[A-Za-z0-9]/, `${file}: no payment integration or private API key`);
}
console.log(`PASS: ${pages.length} exported HTML pages, ${checkedLinks} internal asset/link references, sitemap, robots, OG image, no forms/payment SDK.`);
