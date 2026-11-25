import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../domain/product";

const product: Product = {
  id: "a11y-hoodie",
  slug: "a11y-hoodie",
  name: "Accessible Hoodie",
  category: "hoodies",
  price: 120,
  currency: "USD",
  audience: "unisex",
  color: "Black",
  sizes: ["S", "M", "L"],
  imageUrl: "/images/test.jpg",
  isNew: true,
  collection: "CREWWW / TEST",
  description: "A hoodie used to guard accessibility regressions.",
  available: true,
  bestSeller: false,
  colors: [{ name: "Black", value: "#111111" }],
  specifications: {
    material: "Cotton",
    fit: "Relaxed",
    care: "Cold wash",
    details: "Test fixture",
  },
  variants: [
    {
      id: "variant-1",
      sku: "a11y-hoodie-black-m",
      size: "M",
      color: "Black",
      colorValue: "#111111",
      price: 120,
      stockQuantity: 4,
    },
  ],
};

describe("accessibility gates", () => {
  it("product card has no detectable axe violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
