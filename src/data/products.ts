export type Product = {
  id: string;
  slug: string;
  name: string;
  category: "Cable management" | "Desk essentials" | "On the go";
  tagline: string;
  description: string;
  priceCents: number;
  image: string;
  colour: string;
  specs: { label: string; value: string }[];
  uses: string[];
  supplier: string;
  delivery: string;
  isDemo: true;
};

// Entire catalogue is fictional. Replace only after verifying samples and suppliers.
export const products: Product[] = [
  {
    id: "demo-cable-keeper",
    slug: "cable-keeper",
    name: "The Cable Keeper",
    category: "Cable management",
    tagline: "A place for every loose end.",
    description: "An illustrative five-slot cable holder for the charging leads that always seem to slip behind your desk. A small detail for a calmer workspace.",
    priceCents: 2900,
    image: "/images/cable-keeper.svg",
    colour: "Sage",
    specs: [
      { label: "Dimensions", value: "110 × 28 × 20 mm (demo)" },
      { label: "Material", value: "Silicone concept — unverified" },
      { label: "Cable slots", value: "5 (illustrative specification)" },
      { label: "Includes", value: "1 cable holder (demo)" },
    ],
    uses: ["Keep charging leads within reach", "Give a bedside table a little order", "Organise a shared study space"],
    supplier: "Demo supplier A — fictional, not selected or verified",
    delivery: "Illustrative only: 7–15 business days after dispatch to Australia. No carrier or route is confirmed.",
    isDemo: true,
  },
  {
    id: "demo-desk-shelf",
    slug: "desk-shelf",
    name: "The Desk Shelf",
    category: "Desk essentials",
    tagline: "Make a little room to think.",
    description: "A warm oak-look shelf concept that creates a second layer on your desk. Tuck away a keyboard or notebook and make room for the work in front of you.",
    priceCents: 7900,
    image: "/images/desk-shelf.svg",
    colour: "Natural oak / charcoal",
    specs: [
      { label: "Dimensions", value: "500 × 200 × 110 mm (demo)" },
      { label: "Material", value: "Oak-look board, metal legs — unverified" },
      { label: "Load rating", value: "Not tested; no load claim is made" },
      { label: "Includes", value: "1 shelf concept (demo)" },
    ],
    uses: ["Create space beneath a display", "Give notebooks a dedicated home", "Build a more intentional desk layout"],
    supplier: "Demo supplier B — fictional, not selected or verified",
    delivery: "Illustrative only: 7–15 business days after dispatch to Australia. Packaging, carrier and dispatch location remain unverified.",
    isDemo: true,
  },
  {
    id: "demo-tech-pouch",
    slug: "tech-pouch",
    name: "The Tech Pouch",
    category: "On the go",
    tagline: "Your everyday kit, together.",
    description: "A compact zip pouch concept for the cables, adapters and small things that travel with you. From your home desk to your favourite café, everything has a place.",
    priceCents: 3900,
    image: "/images/tech-pouch.svg",
    colour: "Sand",
    specs: [
      { label: "Dimensions", value: "210 × 130 × 65 mm (demo)" },
      { label: "Material", value: "Woven fabric concept — unverified" },
      { label: "Closure", value: "Zip (illustrative specification)" },
      { label: "Includes", value: "1 pouch; accessories not included (demo)" },
    ],
    uses: ["Keep a daily charging kit together", "Move between home and a café", "Separate small accessories inside a bag"],
    supplier: "Demo supplier C — fictional, not selected or verified",
    delivery: "Illustrative only: 7–15 business days after dispatch to Australia. No delivery service has been contracted.",
    isDemo: true,
  },
];

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
