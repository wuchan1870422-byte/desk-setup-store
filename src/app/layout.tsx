import type { Metadata, Viewport } from "next";
import { store } from "@/config/store";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(store.origin),
  title: { default: "Desk Setup Store — A little order for your everyday", template: "%s | Desk Setup Store" },
  description: "Explore an illustrative collection of desk organisers, cable management and tech storage for Australian workspaces. Demo store — no orders or payments accepted.",
  openGraph: { type: "website", locale: "en_AU", siteName: store.name, title: "Desk Setup Store — A little order for your everyday", description: "Desk essentials for a clearer day. An Australia-focused demo collection, with no live checkout.", images: [{ url: "/images/og-cover.png", width: 1200, height: 630, alt: "Desk Setup Store — demo desk essentials collection" }] },
  twitter: { card: "summary_large_image", images: ["/images/og-cover.png"] },
  robots: { index: false, follow: true },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f6f2" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body><a className="skip-link" href="#main-content">Skip to content</a><CartProvider><SiteHeader /><main id="main-content" className="min-h-[50vh]">{children}</main><SiteFooter /></CartProvider></body></html>;
}
