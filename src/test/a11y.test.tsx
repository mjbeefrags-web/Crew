import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProductCard } from "../components/ProductCard";
import { DesignSystemPage } from "../pages/DesignSystemPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { useDialogFocus } from "../lib/useDialogFocus";
import { useCommerceStore } from "../state/commerceStore";
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

  it("not-found route has no detectable axe violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it("design system forms have no detectable axe violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>,
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

describe("product quick add", () => {
  it("adds a product to the cart with one press of the + button", () => {
    useCommerceStore.getState().resetForTests();
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add Accessible Hoodie to cart" }),
    );
    expect(useCommerceStore.getState().cartLines).toEqual([
      { productId: "a11y-hoodie", size: "M", color: "Black", quantity: 1 },
    ]);
  });
});

describe("modal focus management", () => {
  function DialogFixture({ onClose }: { onClose: () => void }) {
    const [open, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const openerRef = useRef<HTMLButtonElement>(null);
    useDialogFocus(
      open,
      () => {
        onClose();
        setOpen(false);
      },
      dialogRef,
      openerRef,
    );
    return (
      <div>
        <button ref={openerRef} type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
        {open && (
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Test">
            <button type="button">First</button>
            <button type="button">Second</button>
          </div>
        )}
      </div>
    );
  }

  it("traps Tab, closes on Escape and restores focus to the opener", () => {
    const onClose = vi.fn();
    render(<DialogFixture onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Open dialog" });
    opener.focus();
    fireEvent.click(opener);

    const first = screen.getByRole("button", { name: "First" });
    expect(document.activeElement).toBe(first);

    // jsdom does not implement native Tab traversal; verify the trap's
    // boundary behaviour instead (last → first, first → last on Shift+Tab).
    const second = screen.getByRole("button", { name: "Second" });
    second.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);
  });
});
