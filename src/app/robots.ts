import type { MetadataRoute } from "next";
import { store } from "@/config/store";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  // Publicly testable, but intentionally not indexed while all products are demos.
  return { rules: { userAgent: "*", disallow: "/" }, sitemap: `${store.origin}/sitemap.xml` };
}
