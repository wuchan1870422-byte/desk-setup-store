"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";
import { Icon } from "./icons";
import { store } from "@/config/store";

export function AddToBag({ productId }: { productId: string }) {
  const [quantity, setQuantity] = useState(1);
  const { add, ready } = useCart();
  return <div><div className="purchase-controls"><div className="quantity-control"><button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((n) => n - 1)}><Icon name="minus" size={16} /></button><span aria-live="polite">{quantity}</span><button aria-label="Increase quantity" disabled={quantity >= store.maxQuantityPerItem} onClick={() => setQuantity((n) => n + 1)}><Icon name="plus" size={16} /></button></div><button className="button button-dark" disabled={!ready} onClick={() => add(productId, quantity)}>Add to demo bag <Icon name="bag" size={18} /></button></div><p className="micro-copy">Explore the demo. This does not reserve a product or place an order.</p></div>;
}
