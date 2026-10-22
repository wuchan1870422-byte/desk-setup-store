"use client";

import Image from "next/image";
import Link from "next/link";
import { products, formatMoney } from "@/data/products";
import { store } from "@/config/store";
import { cartTotals } from "@/lib/cart";
import { useCart } from "./cart-provider";
import { buildQuoteRequest } from "@/lib/checkout-contract";
import { Icon } from "./icons";
import { PayPalPlaceholder } from "./paypal-placeholder";

export function CartView() {
  const { items, ready, storageUnavailable, update, clear } = useCart();
  const totals = cartTotals(items);
  const exportBag = () => { const request = buildQuoteRequest(items); const url = URL.createObjectURL(new Blob([JSON.stringify(request, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "desk-setup-demo-bag.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
  if (!ready) return <div className="cart-loading" role="status">Opening your demo bag…</div>;
  if (!items.length) return <section className="empty-cart"><div className="empty-cart-icon"><Icon name="bag" size={35} /></div><h2>A little room for something useful.</h2><p>Your demo bag is empty. Explore the everyday essentials and see what fits your space.</p><Link href="/#collection" className="button button-dark">Explore the collection <Icon name="arrow" /></Link></section>;
  return <><div className="cart-layout"><section className="cart-items" aria-label="Items in your bag">{items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)!;
    return <article className="cart-item" key={item.productId}><Link href={`/products/${product.slug}/`} className="cart-item-image"><Image src={product.image} alt={`Demo illustration of ${product.name}`} width={200} height={160} /></Link><div className="cart-item-copy"><span className="product-category">{product.category}</span><h2><Link href={`/products/${product.slug}/`}>{product.name}</Link></h2><p>{product.colour}</p><span className="cart-unit-price">{formatMoney(product.priceCents)} each · demo</span><div className="cart-item-controls"><div className="quantity-control"><button aria-label={`Decrease ${product.name} quantity`} disabled={item.quantity <= 1} onClick={() => update(item.productId, item.quantity - 1)}><Icon name="minus" size={14} /></button><span aria-label={`Quantity ${item.quantity}`}>{item.quantity}</span><button aria-label={`Increase ${product.name} quantity`} disabled={item.quantity >= store.maxQuantityPerItem} onClick={() => update(item.productId, item.quantity + 1)}><Icon name="plus" size={14} /></button></div><button className="remove-button" aria-label={`Remove ${product.name}`} onClick={() => update(item.productId, 0)}>Remove</button></div></div><strong className="cart-line-total">{formatMoney(product.priceCents * item.quantity)}</strong></article>;
  })}<div className="cart-below-items"><Link href="/#collection" className="text-link">Continue exploring <Icon name="arrow" size={16} /></Link><button className="remove-button" onClick={clear}>Clear demo bag</button></div><p className="micro-copy">Maximum 10 of each item for this demo. This is not an inventory statement.</p>{storageUnavailable && <p role="status" className="demo-callout">Browser storage is unavailable. Your bag will only last for this page visit.</p>}</section><aside className="order-summary"><span className="eyebrow">JUST EXPLORING</span><h2>Your demo summary</h2><dl><div><dt>Demo subtotal</dt><dd>{formatMoney(totals.subtotalCents)}</dd></div><div><dt>Demo delivery · Australia</dt><dd>{formatMoney(totals.shippingCents)}</dd></div><div className="cart-total"><dt>Illustrative total</dt><dd>{formatMoney(totals.totalCents)} <small>AUD</small></dd></div></dl><p className="micro-copy">Not a quote or an amount payable. Tax, customs treatment and real delivery charges must be confirmed before launch.</p><PayPalPlaceholder /><button className="button fit-export" onClick={exportBag}>Save demo bag</button><p className="micro-copy">Downloads item IDs and quantities only. No order is sent.</p><p className="checkout-note"><Icon name="check" size={16} /> No order, address or payment details collected.</p><Link className="policy-inline" href="/shipping-policy/">Draft shipping policy</Link></aside></div></>;
}
