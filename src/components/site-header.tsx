"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./cart-provider";
import { Icon } from "./icons";
import { track } from "@/lib/analytics";

export function SiteHeader() {
  const { items, ready } = useCart();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { track("page_view", { path: pathname }); }, [pathname]);
  const close = () => setOpen(false);
  return <>
    <div className="demo-banner"><span className="status-dot" /> DEMO STORE <span className="banner-divider">/</span> Explore freely. No orders or payments accepted.</div>
    <header className="site-header">
      <Link href="/" className="wordmark" aria-label="Desk Setup Store home" onClick={close}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>desk setup<span className="wordmark-small">STORE</span></span></Link>
      <nav className="desktop-nav" aria-label="Main navigation"><Link href="/#collection">Shop the collection</Link><Link href="/#our-approach">Our approach</Link><Link href="/contact/">Get in touch</Link></nav>
      <div className="header-actions"><span className="currency-label">AU / AUD</span><Link href="/cart/" className="bag-link" aria-label={`Shopping bag, ${ready ? items.reduce((sum, item) => sum + item.quantity, 0) : 0} items`} onClick={close}><Icon name="bag" /><span>Bag <span className="bag-count">{ready ? items.reduce((sum, item) => sum + item.quantity, 0) : 0}</span></span></Link><button type="button" className="mobile-menu icon-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button></div>
    </header>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-nav"><Link href="/#collection" onClick={close}>Shop the collection</Link><Link href="/#our-approach" onClick={close}>Our approach</Link><Link href="/contact/" onClick={close}>Get in touch</Link></nav>}
  </>;
}
