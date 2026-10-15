"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CART_KEY, sanitiseCart, type CartItem } from "@/lib/cart";
import { track } from "@/lib/analytics";

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  storageUnavailable: boolean;
  add: (productId: string, quantity?: number) => void;
  update: (productId: string, quantity: number) => void;
  clear: () => void;
  notice: string;
};
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const restore = () => {
      try { setItems(sanitiseCart(JSON.parse(localStorage.getItem(CART_KEY) || "[]"))); }
      catch { setItems([]); }
      setReady(true);
    };
    // Load after hydration; also keep multiple tabs in sync.
    const task = window.setTimeout(restore, 0);
    const onStorage = (event: StorageEvent) => { if (event.key === CART_KEY || event.key === null) restore(); };
    window.addEventListener("storage", onStorage);
    return () => { window.clearTimeout(task); window.removeEventListener("storage", onStorage); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); }
    catch { window.setTimeout(() => setStorageUnavailable(true), 0); }
  }, [items, ready]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const add = useCallback((productId: string, quantity = 1) => {
    setItems((current) => sanitiseCart([...current, { productId, quantity }]));
    setNotice("Added to your demo bag");
    track("add_to_cart", { productId, quantity });
  }, []);
  const update = useCallback((productId: string, quantity: number) => {
    setItems((current) => sanitiseCart(current.map((item) => item.productId === productId ? { ...item, quantity } : item)));
    if (quantity <= 0) track("remove_from_cart", { productId });
  }, []);

  return <CartContext.Provider value={{ items, ready, storageUnavailable, add, update, clear: () => setItems([]), notice }}>
    {children}
    <div role="status" aria-live="polite" className={`toast ${notice ? "toast-visible" : ""}`}>{notice}</div>
  </CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be inside CartProvider");
  return value;
}
