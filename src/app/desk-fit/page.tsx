import type { Metadata } from "next";
import { DeskFit } from "@/components/desk-fit";
export const metadata: Metadata = { title:"Find your desk setup",description:"Measure your desk and explore a small illustrative organising kit. No personal information, order or payment collected.",alternates:{canonical:"/desk-fit/"}};
export default function DeskFitPage(){return <div className="section-shell cart-page"><span className="eyebrow">A CALMER DESK STARTS WITH LESS</span><h1>What fits your everyday?</h1><p className="page-intro">A quick way to think about your space before adding more things.</p><DeskFit /></div>;}
