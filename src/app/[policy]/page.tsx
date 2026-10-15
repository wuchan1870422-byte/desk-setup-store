import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { policies } from "@/data/policies";

export const dynamicParams = false;
export function generateStaticParams() { return policies.map((policy) => ({ policy: policy.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ policy: string }> }): Promise<Metadata> {
  const { policy: slug } = await params;
  const policy = policies.find((entry) => entry.slug === slug);
  return policy ? { title: `${policy.title} (draft)`, description: `${policy.intro} Demo policy outline; this store is not accepting orders.`, alternates: { canonical: `/${slug}/` } } : {};
}
export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy: slug } = await params;
  const policy = policies.find((entry) => entry.slug === slug);
  if (!policy) notFound();
  return <article className="policy-page section-shell"><Link href="/" className="breadcrumbs">Home / Good to know</Link><span className="eyebrow">GOOD TO KNOW · DRAFT POLICY</span><h1>{policy.title}.</h1><p className="page-intro">{policy.intro}</p><div className="policy-banner"><strong>Demo mode · not accepting orders</strong><p>This policy is a draft and must be finalised before trading. All commercial terms are unconfirmed.</p></div><p className="policy-date">Draft updated: 15 October 2026</p><div className="policy-sections">{policy.sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</div><Link href="/contact/" className="text-link">Contact & store status →</Link></article>;
}
