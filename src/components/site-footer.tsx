import Link from "next/link";
import { Icon } from "./icons";

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-top"><div><Link href="/" className="footer-brand">desk setup<span>STORE</span></Link><p>A little order for your everyday.</p><span className="footer-location">An Australia-focused store concept · AUD</span></div><div className="footer-links"><div><span className="eyebrow">Explore</span><Link href="/#collection">The collection</Link><Link href="/#our-approach">Our approach</Link><Link href="/cart/">Your bag</Link></div><div><span className="eyebrow">Good to know</span><Link href="/shipping-policy/">Shipping policy</Link><Link href="/return-policy/">Return policy</Link><Link href="/privacy-policy/">Privacy policy</Link><Link href="/contact/">Contact</Link></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Desk Setup Store · Demo concept</span><span className="footer-demo"><Icon name="check" size={15} /> No live checkout. No payments collected.</span></div></footer>;
}
