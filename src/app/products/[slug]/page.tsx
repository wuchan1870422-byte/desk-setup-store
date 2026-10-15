import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products, getProduct, formatMoney } from "@/data/products";
import { AddToBag } from "@/components/add-to-bag";
import { Icon } from "@/components/icons";

export const dynamicParams = false;
export function generateStaticParams() { return products.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.tagline} Explore this illustrative ${product.category.toLowerCase()} concept. AUD ${product.priceCents / 100} demo price. No orders accepted.`,
    alternates: { canonical: `/products/${product.slug}/` },
    openGraph: { title: `${product.name} — Demo | Desk Setup Store`, description: `${product.tagline} Illustrative product only; no live checkout.`, url: `/products/${product.slug}/`, images: [{ url: "/images/og-cover.png", width: 1200, height: 630, alt: "Desk Setup Store demo collection" }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <div className="section-shell product-page"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#collection">The collection</Link><span>/</span><span aria-current="page">{product.name}</span></nav><section className="product-detail"><div className="detail-image"><Image src={product.image} alt={`Illustrative ${product.name}, ${product.colour}; concept only`} width={700} height={560} priority /><span className="image-demo-label">DEMO ILLUSTRATION · NOT A PRODUCT PHOTO</span></div><div className="detail-copy"><span className="eyebrow">{product.category}</span><h1>{product.name}</h1><p className="detail-tagline">{product.tagline}</p><div className="detail-price">{formatMoney(product.priceCents)}<span>AUD · illustrative price</span></div><p className="detail-description">{product.description}</p><div className="colour-choice"><span className={`colour-swatch ${product.slug}`} /><span>{product.colour} <small>— demo option</small></span></div><AddToBag productId={product.id} /><div className="demo-callout"><Icon name="sun" size={20} /><p><strong>A concept you can explore.</strong> Price, dimensions, materials, supplier and delivery are demo data. No stock, safety, load or certification claims are made.</p></div></div></section><div className="product-information"><section><span className="eyebrow">THE DETAILS</span><h2>A closer look.</h2><dl className="spec-list">{product.specs.map((spec) => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl></section><section><span className="eyebrow">IN YOUR EVERYDAY</span><h2>Find its place.</h2><ul className="use-list">{product.uses.map((use) => <li key={use}><Icon name="check" size={17} />{use}</li>)}</ul><details className="info-disclosure" open><summary>Australia delivery · demo estimate</summary><p>{product.delivery}</p><p>Illustrative handling: 2–4 business days. Demo delivery charge: A$9.00 per bag. Duties, GST treatment, exclusions and final delivery pricing have not been determined. <Link href="/shipping-policy/">Read the draft shipping policy.</Link></p></details><details className="info-disclosure"><summary>Returns & supplier transparency</summary><p>{product.supplier}. No goods can be ordered from this site.</p><p>Return terms and a return address must be confirmed before launch. <Link href="/return-policy/">Read the draft return policy.</Link></p></details></section></div><div className="back-collection"><Link href="/#collection" className="text-link">Back to the collection <Icon name="arrow" size={18} /></Link></div></div>;
}
