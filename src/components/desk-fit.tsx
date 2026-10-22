"use client";
import { useState } from "react";
import Link from "next/link";
import { recommendKit } from "@/lib/fit";
import { products, formatMoney } from "@/data/products";
import { AddToBag } from "./add-to-bag";

export function DeskFit() {
  const [width, setWidth] = useState("600");
  const [cables, setCables] = useState("3");
  const [portable, setPortable] = useState(false);
  let result: ReturnType<typeof recommendKit> | undefined;
  let error = "";
  try { result = recommendKit({ clearWidthMm: Number(width), cableCount: Number(cables), portable }); }
  catch (caught) { error = caught instanceof Error ? caught.message : "Check your measurements."; }
  return <div className="fit-layout"><section className="fit-controls"><span className="eyebrow">01 / YOUR SPACE</span><h2>Measure first.</h2><p>Use the clear space on your desk, after your computer and essentials are in place.</p><label htmlFor="fit-width">Clear desk width (mm)</label><input id="fit-width" type="number" min="100" max="5000" value={width} onChange={(event) => setWidth(event.target.value)} /><label htmlFor="fit-cables">Cables you use every day</label><input id="fit-cables" type="number" min="0" max="100" step="1" value={cables} onChange={(event) => setCables(event.target.value)} /><label className="fit-check"><input type="checkbox" checked={portable} onChange={(event) => setPortable(event.target.checked)} /> I move between desks or cafés.</label><p className="micro-copy">Your answers stay on this page. No account or contact details needed.</p></section><section className="fit-results" aria-live="polite"><span className="eyebrow">02 / A POSSIBLE STARTING POINT</span><h2>A little order, sized to you.</h2>{error ? <p role="alert">{error}</p> : <>{result?.slugs.map((slug) => {
    const product = products.find((p) => p.slug === slug)!;
    return <article className="fit-result" key={slug}><div><Link href={`/products/${slug}/`}><h3>{product.name}</h3></Link><p>{product.tagline}</p><strong>{formatMoney(product.priceCents)} · demo</strong></div><AddToBag productId={product.id} /></article>;
  })}<ul>{result?.notes.map((note) => <li key={note}>{note}</li>)}</ul></>}<div className="demo-callout">Concept recommendations only. Product dimensions, materials and stock have not been verified. No purchase or delivery promise is made.</div></section></div>;
}
