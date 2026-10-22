import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { policies } from "@/data/policies";
import { store } from "@/config/store";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/contact/", "/desk-fit/", ...products.map((p) => `/products/${p.slug}/`), ...policies.map((p) => `/${p.slug}/`)].map((path) => ({ url: `${store.origin}${path}`, changeFrequency: "monthly", priority: path === "/" ? 1 : 0.6 }));
}
