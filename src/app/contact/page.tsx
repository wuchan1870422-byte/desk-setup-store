import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/config/store";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Get in touch", description: "Contact and launch status for the Desk Setup Store demo. No active support inbox or order collection yet.", alternates: { canonical: "/contact/" } };
export default function ContactPage() {
  return <div className="contact-page section-shell"><div className="contact-intro"><span className="eyebrow">A CONVERSATION STARTS HERE</span><h1>A little hello.</h1><p className="page-intro">We’re shaping a calmer everyday workspace.<br />For now, this is a store concept you can explore.</p><div className="contact-status"><span className="status-dot" /> DEMO MODE · NOT YET TRADING</div></div><section className="contact-card"><span className="eyebrow">FUTURE CUSTOMER SUPPORT</span><h2>Let’s keep it clear.</h2><p className="example-email">{store.supportEmail}</p><span className="inline-tag">Example address · not a working inbox</span><p>No messages can be submitted here. A real contact address, seller identity, support hours and response expectations must be verified before the store accepts orders.</p><hr /><h3>Have a look around.</h3><div className="contact-policy-links"><Link href="/shipping-policy/">Draft shipping policy <Icon name="arrow" size={16} /></Link><Link href="/return-policy/">Draft return policy <Icon name="arrow" size={16} /></Link><Link href="/privacy-policy/">Current demo privacy information <Icon name="arrow" size={16} /></Link></div><Link href="/#collection" className="button button-dark">Explore the collection <Icon name="arrow" size={18} /></Link></section></div>;
}
