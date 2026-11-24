import type { Product } from "../domain/product";
import { dropColorways } from "./drops";
import { psychedelicFrontViews, psychedelicPieces } from "./psychedelic";

/**
 * Canonical commerce records for the five supplied Psychedelic Minds designs.
 * They stay separate from the first-run editorial catalogue so the homepage
 * edit keeps its approved count, but they are shareable product pages and the
 * psychedelic room adds the garment the visitor actually selected.
 */
const sizes = ["S", "M", "L", "XL", "XXL"] as const;

export const psychedelicProducts: readonly Product[] = psychedelicPieces.map(
  (piece, index) => ({
    id: `psychedelic-${String(index + 1).padStart(2, "0")}`,
    slug: `${piece.id}-psychedelic-hoodie`,
    name: `${piece.name} Hoodie`,
    category: "hoodies",
    price: 88,
    currency: "USD",
    audience: "unisex",
    color: dropColorways[index % dropColorways.length].name,
    sizes,
    imageUrl: piece.photo ?? piece.artwork,
    isNew: true,
    collection: "CREWWW / PSYCHEDELIC MINDS",
    description: `${piece.line} Full-colour DTG artwork from the supplied concept plate, shown with ${piece.photoApproved ? "approved product photography" : "a concept garment study"}.`,
    available: true,
    bestSeller: false,
    colors: dropColorways,
    galleryUrls: [
      piece.photo ?? piece.artwork,
      piece.artwork,
      ...piece.angles,
      ...psychedelicFrontViews,
    ],
    isPreviewData: true,
    specifications: {
      material:
        "Heavyweight cotton fleece (final specification to be confirmed).",
      fit: "Relaxed pullover fit (confirm final measurements with production sample).",
      care: "Care instructions to be confirmed with the final garment.",
      details: `Full-colour DTG back print · ${piece.world.glyph} ${piece.world.name} · chest mark · ribbed cuffs and hem.`,
    },
    variants: dropColorways.flatMap((color, colorIndex) =>
      sizes.map((size, sizeIndex) => ({
        id: `psy-${index + 1}-${colorIndex + 1}-${sizeIndex + 1}`,
        sku: `CREW-PM${index + 1}-${color.name.replace(/\s+/g, "").toUpperCase()}-${size}`,
        size,
        color: color.name,
        colorValue: color.value,
        price: 88,
        stockQuantity:
          index === 4 && colorIndex === 0 && sizeIndex === 0
            ? 0
            : 6 + ((index * 4 + colorIndex * 3 + sizeIndex * 2) % 14),
      })),
    ),
  }),
);

export const getPsychedelicProduct = (index: number): Product =>
  psychedelicProducts[index % psychedelicProducts.length];
