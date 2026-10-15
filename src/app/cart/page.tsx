import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Your demo bag", description: "Try the Desk Setup Store demo bag. AUD illustrative totals only; no orders or payments are accepted.", alternates: { canonical: "/cart/" } };
export default function CartPage() { return <div className="section-shell cart-page"><span className="eyebrow">A PLACE FOR YOUR ESSENTIALS</span><h1>Your bag.</h1><p className="page-intro">A few thoughtful details, all together. This is a demonstration only.</p><CartView /></div>; }
