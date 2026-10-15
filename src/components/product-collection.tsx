"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { products, formatMoney } from "@/data/products";
import { useCart } from "./cart-provider";
import { Icon } from "./icons";

const categories = ["All essentials", "Cable management", "Desk essentials", "On the go"] as const;

export function ProductCollection() {
  const [category, setCategory] = useState<string>(categories[0]);
  const { add, ready } = useCart();
  const visible = products.filter((product) => category === categories[0] || product.category === category);
  return <section id="collection" className="collection-section section-shell"><div className="section-heading"><div><span className="eyebrow">THE EVERYDAY EDIT</span><h2>Small things. Big difference.</h2></div><p>Thoughtful places for the things<br className="desktop-break" /> you use every day.</p></div><div className="collection-toolbar"><div className="category-tabs" role="group" aria-label="Filter products">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><span className="collection-count" aria-live="polite">{visible.length} demo {visible.length === 1 ? "essential" : "essentials"}</span></div><div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><div className="product-image-wrap"><Link href={`/products/${product.slug}/`} className="product-image-link" aria-label={`View ${product.name}`}><Image src={product.image} alt={`Demo illustration of ${product.name} in ${product.colour}`} width={700} height={560} className="product-image" /></Link><span className="image-demo-label">DEMO ILLUSTRATION</span><button className="quick-add" aria-label={`Add ${product.name} to demo bag`} disabled={!ready} onClick={() => add(product.id)}><Icon name="plus" size={19} /></button></div><div className="product-card-info"><div><span className="product-category">{product.category}</span><h3><Link href={`/products/${product.slug}/`}>{product.name}</Link></h3><p>{product.tagline}</p></div><div className="product-price">{formatMoney(product.priceCents)}<span>AUD · demo</span></div></div></article>)}</div><p className="catalogue-disclaimer">A collection in the making. All prices, product specifications, suppliers and delivery estimates are illustrative.</p></section>;
}
