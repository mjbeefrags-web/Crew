import type { Product } from "../../domain/product";
import type { ProductQuery } from "../../domain/service";

export type CatalogRoute = {
  path: string;
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  query: ProductQuery;
  demoNote?: string;
  filters?: readonly (
    "size" | "color" | "collection" | "fit" | "wash" | "price" | "availability"
  )[];
};

const previewNote =
  "Preview collection · imagery, sizing and pricing are sample data while the store is being built.";

export const catalogRoutes: readonly CatalogRoute[] = [
  {
    path: "/shop",
    title: "The full edit",
    eyebrow: "SHOP / ALL PIECES",
    description:
      "An evolving collection of layers, graphics and everyday objects.",
    image: "/images/editorial/new-arrivals.webp",
    query: {},
    filters: ["size", "color", "collection", "price", "availability"],
    demoNote: previewNote,
  },
  {
    path: "/new-arrivals",
    title: "Just landed",
    eyebrow: "LATEST / NEW ARRIVALS",
    description: "New pieces and first looks from the current Crewww preview.",
    image: "/images/editorial/new-arrivals.webp",
    query: { newOnly: true },
    filters: ["size", "color", "collection", "price"],
    demoNote: previewNote,
  },
  {
    path: "/best-sellers",
    title: "Crew favorites",
    eyebrow: "POPULAR / BEST SELLERS",
    description: "A deterministic sample ranking for the frontend preview.",
    image: "/images/editorial/drop-story.webp",
    query: { bestSeller: true, sort: "popular" },
    filters: ["size", "color", "collection", "price"],
    demoNote: previewNote,
  },
  {
    path: "/kids",
    title: "Mini crew",
    eyebrow: "SHOP / KIDS",
    description:
      "A kidswear concept edit. Age bands and sizing shown are demonstration data.",
    image: "/images/editorial/kids-story.webp",
    query: { audience: "kids" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/denim",
    title: "Denim, your way",
    eyebrow: "SHOP / DENIM",
    description:
      "Explore candidate fits and washes; the fit names and measurements are not approved product specifications.",
    image: "/images/editorial/denim-story.webp",
    query: { category: "denim" },
    filters: ["size", "color", "fit", "wash", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes",
    title: "Clothes",
    eyebrow: "SHOP / CLOTHES",
    description: "Layers and everyday forms across tops and bottoms.",
    image: "/images/editorial/lookbook-02.webp",
    query: {
      categories: [
        "tops",
        "t-shirts",
        "hoodies",
        "sweatshirts",
        "shirts",
        "jackets",
        "trousers",
        "shorts",
      ],
    },
    filters: ["size", "color", "collection", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/tops",
    title: "Tops",
    eyebrow: "SHOP / CLOTHES / TOPS",
    description: "The upper half of your everyday rotation.",
    image: "/images/editorial/lookbook-02.webp",
    query: {
      categories: [
        "tops",
        "t-shirts",
        "hoodies",
        "sweatshirts",
        "shirts",
        "jackets",
      ],
    },
    filters: ["size", "color", "collection", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/t-shirts",
    title: "T-shirts",
    eyebrow: "SHOP / CLOTHES / TOPS / T-SHIRTS",
    description: "A foundational layer, presented as sample inventory.",
    image: "/images/editorial/new-arrivals.webp",
    query: { category: "t-shirts" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/hoodies",
    title: "Graphic hoodies",
    eyebrow: "SHOP / CLOTHES / TOPS / HOODIES",
    description:
      "Owner-provided Crewww hoodie references. Price and availability remain provisional.",
    image: "/images/crewww/hoodie-01.webp",
    query: { category: "hoodies" },
    filters: ["size", "color", "collection", "price", "availability"],
  },
  {
    path: "/clothes/sweatshirts",
    title: "Sweatshirts",
    eyebrow: "SHOP / CLOTHES / TOPS / SWEATSHIRTS",
    description: "A sweatshirt category preview with sample-only records.",
    image: "/images/editorial/drop-story.webp",
    query: { category: "sweatshirts" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/shirts",
    title: "Shirts",
    eyebrow: "SHOP / CLOTHES / TOPS / SHIRTS",
    description: "An overshirt study for the frontend preview.",
    image: "/images/editorial/lookbook-02.webp",
    query: { category: "shirts" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/jackets",
    title: "Jackets",
    eyebrow: "SHOP / CLOTHES / TOPS / JACKETS",
    description: "Outer layers shown as sample-only catalog data.",
    image: "/images/editorial/lookbook-03.webp",
    query: { category: "jackets" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/bottoms",
    title: "Bottoms",
    eyebrow: "SHOP / CLOTHES / BOTTOMS",
    description: "Trousers, shorts and denim fit discovery.",
    image: "/images/editorial/candidate-denim.webp",
    query: { categories: ["denim", "trousers", "shorts"] },
    filters: ["size", "color", "fit", "wash", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/trousers",
    title: "Trousers",
    eyebrow: "SHOP / CLOTHES / BOTTOMS / TROUSERS",
    description: "Everyday bottoms in a development assortment.",
    image: "/images/editorial/lookbook-01.webp",
    query: { category: "trousers" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/clothes/shorts",
    title: "Shorts",
    eyebrow: "SHOP / CLOTHES / BOTTOMS / SHORTS",
    description: "A warm-weather category preview.",
    image: "/images/editorial/lookbook-02.webp",
    query: { category: "shorts" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/accessories",
    title: "Objects for the everyday",
    eyebrow: "SHOP / ACCESSORIES",
    description:
      "Accessory placeholders demonstrate the category journey; no confirmed Crewww objects were supplied.",
    image: "/images/editorial/accessories.webp",
    query: { category: "accessories" },
    filters: ["color", "price"],
    demoNote: previewNote,
  },
  {
    path: "/shoes",
    title: "The finishing step",
    eyebrow: "SHOP / SHOES",
    description:
      "Footwear placeholders demonstrate the category journey; no confirmed Crewww footwear was supplied.",
    image: "/images/editorial/shoes.webp",
    query: { category: "shoes" },
    filters: ["size", "color", "price"],
    demoNote: previewNote,
  },
];

export const fits = [
  {
    slug: "straight",
    title: "Straight",
    description:
      "A consistent line from the seat through the leg. Fit and measurements in this preview are provisional.",
    image: "/images/editorial/denim-story.webp",
  },
  {
    slug: "slim",
    title: "Slim",
    description:
      "A closer line through the leg. Fit and measurements in this preview are provisional.",
    image: "/images/editorial/candidate-denim.webp",
  },
  {
    slug: "relaxed",
    title: "Relaxed",
    description:
      "More room through the seat and thigh. Fit and measurements in this preview are provisional.",
    image: "/images/editorial/lookbook-01.webp",
  },
  {
    slug: "wide-leg",
    title: "Wide-leg",
    description:
      "An open leg shape from hip to hem. Fit and measurements in this preview are provisional.",
    image: "/images/editorial/lookbook-03.webp",
  },
  {
    slug: "baggy",
    title: "Baggy",
    description:
      "A generous silhouette with extra ease. Fit and measurements in this preview are provisional.",
    image: "/images/editorial/lookbook-02.webp",
  },
] as const;

export function pathToProductCategory(
  path: string,
): Product["category"] | undefined {
  const entry = catalogRoutes.find((route) => route.path === path);
  return entry?.query.category;
}
