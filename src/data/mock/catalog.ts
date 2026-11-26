import type { Product, ProductCollection } from "../../domain/product";

const hoodieColors = {
  black: { name: "Black", value: "#171719" },
  rose: { name: "Rose", value: "#d7a4ae" },
  forest: { name: "Forest", value: "#254c43" },
  mocha: { name: "Mocha", value: "#795247" },
  chalk: { name: "Chalk", value: "#e8e1d8" },
};

const makeProduct = (
  product: Omit<
    Product,
    | "currency"
    | "available"
    | "specifications"
    | "colors"
    | "collection"
    | "description"
  > &
    Partial<
      Pick<
        Product,
        "available" | "specifications" | "colors" | "collection" | "description"
      >
    >,
): Product => ({
  currency: "USD",
  available: true,
  collection: "CREWWW / GRAPHIC HOODIES",
  description:
    "A heavyweight pullover hoodie with a relaxed streetwear fit and a graphic-led finish.",
  colors: [hoodieColors.black, hoodieColors.chalk],
  specifications: {
    material: "Cotton fleece (demo product specification)",
    fit: "Relaxed pullover shape (confirm final fit with production sample)",
    care: "Care guidance to be confirmed with the product owner.",
    details:
      "Ribbed cuffs and hem with front pouch pocket. Product details shown are provisional.",
  },
  ...product,
});

// Prices and written specifications remain provisional mock commerce data; the reference garments live in docs/material.
export const featuredProducts: readonly Product[] = [
  makeProduct({
    id: "product-01",
    slug: "vivre-la-vie-hoodie",
    name: "Vivre La Vie Hoodie",
    category: "hoodies",
    price: 74,
    audience: "unisex",
    color: "Black",
    sizes: ["S", "M", "L", "XL", "XXL"],
    imageUrl: "/images/crewww/hoodie-01.webp",
    isNew: true,
    bestSeller: false,
    colors: [hoodieColors.black],
    collection: "CREWWW / GRAPHIC HOODIES",
    description:
      "Back graphic featuring the Vivre La Vie artwork, from the supplied Crewww reference set.",
  }),
  makeProduct({
    id: "product-02",
    slug: "passion-racing-hoodie",
    name: "Passion Racing Hoodie",
    category: "hoodies",
    price: 82,
    audience: "unisex",
    color: "Black",
    sizes: ["S", "M", "L", "XL", "XXL"],
    imageUrl: "/images/crewww/hoodie-02.webp",
    isNew: true,
    bestSeller: false,
    colors: [hoodieColors.black],
    collection: "CREWWW / GRAPHIC HOODIES",
    description:
      "Automotive graphic hoodie shown in the supplied product photography.",
  }),
  makeProduct({
    id: "product-03",
    slug: "joy-of-outdoors-hoodie",
    name: "Joy of Outdoors Hoodie",
    category: "hoodies",
    price: 78,
    audience: "unisex",
    color: "Mocha",
    sizes: ["S", "M", "L", "XL", "XXL"],
    imageUrl: "/images/crewww/hoodie-03.webp",
    isNew: false,
    bestSeller: true,
    colors: [hoodieColors.mocha, hoodieColors.black],
    collection: "CREWWW / OUTSIDE HOURS",
    description: "Mocha fleece with a large outdoors inspired back graphic.",
  }),
  makeProduct({
    id: "product-04",
    slug: "crane-garden-hoodie",
    name: "Crane Garden Hoodie",
    category: "hoodies",
    price: 86,
    audience: "unisex",
    color: "Black",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: "/images/crewww/hoodie-04.webp",
    isNew: true,
    bestSeller: false,
    colors: [hoodieColors.black],
    collection: "CREWWW / GRAPHIC HOODIES",
    description:
      "Black fleece with a crane and garden illustration across the back.",
  }),
  makeProduct({
    id: "product-05",
    slug: "cherry-blossom-hoodie",
    name: "Cherry Blossom Hoodie",
    category: "hoodies",
    price: 76,
    audience: "unisex",
    color: "Rose",
    sizes: ["S", "M", "L", "XL", "XXL"],
    imageUrl: "/images/crewww/hoodie-05.webp",
    isNew: false,
    bestSeller: true,
    colors: [hoodieColors.rose],
    collection: "CREWWW / GRAPHIC HOODIES",
    description: "Pink fleece with a cherry blossom and branch illustration.",
  }),
  makeProduct({
    id: "product-06",
    slug: "new-york-hoodie",
    name: "New York Hoodie",
    category: "hoodies",
    price: 72,
    audience: "unisex",
    color: "Rose",
    sizes: ["S", "M", "L", "XL", "XXL"],
    imageUrl: "/images/crewww/hoodie-06.webp",
    isNew: false,
    bestSeller: false,
    colors: [hoodieColors.rose],
    collection: "CREWWW / CITY NOTES",
    description: "Pink fleece with a New York city graphic at the chest.",
  }),
  makeProduct({
    id: "product-07",
    slug: "tokyo-graphic-hoodie",
    name: "Tokyo Graphic Hoodie",
    category: "hoodies",
    price: 84,
    audience: "unisex",
    color: "Rose",
    sizes: ["S", "M", "L", "XL"],
    imageUrl: "/images/crewww/hoodie-07.webp",
    isNew: true,
    bestSeller: false,
    colors: [hoodieColors.rose],
    collection: "CREWWW / CITY NOTES",
    description:
      "Graphic pink hoodie from the supplied Tokyo design reference.",
  }),
  makeProduct({
    id: "product-08",
    slug: "crew-script-hoodie",
    name: "Crew Script Hoodie",
    category: "hoodies",
    price: 68,
    audience: "unisex",
    color: "Forest",
    sizes: ["S", "M", "L", "XL", "XXL"],
    imageUrl: "/images/crewww/hoodie-08.webp",
    isNew: false,
    bestSeller: true,
    colors: [hoodieColors.forest],
    collection: "CREWWW / ESSENTIALS",
    description:
      "Forest green pullover with a bold script treatment across the back.",
  }),
];

export const featuredCollections: readonly ProductCollection[] = [
  {
    id: "collection-01",
    slug: "graphic-hoodies",
    title: "Graphic hoodies",
    description: "A graphic-led fleece edit.",
    productIds: ["product-01", "product-02", "product-04"],
  },
  {
    id: "collection-02",
    slug: "outside-hours",
    title: "Outside hours",
    description: "Layers for plans that run late.",
    productIds: ["product-03", "product-08"],
  },
];
