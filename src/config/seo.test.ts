import { describe, expect, it } from "vitest";
import { routeSeo } from "./seo";

describe("routeSeo", () => {
  it("gives the showroom and the psychedelic drop distinct metadata", () => {
    expect(routeSeo("/").title).toMatch(/Graphic fleece/);
    expect(routeSeo("/drops/psychedelic-minds").title).toMatch(/Psychedelic/);
  });

  it("preserves query strings in the canonical path", () => {
    expect(routeSeo("/clothes/hoodies", "?size=M").path).toBe(
      "/clothes/hoodies?size=M",
    );
  });

  it("uses catalogue titles and images for catalogue routes", () => {
    const seo = routeSeo("/shop");
    expect(seo.title).toBe("The full edit");
    expect(seo.image).toMatch(/\.webp$/);
  });

  it("falls back to a readable title for unknown routes", () => {
    expect(routeSeo("/some-new-page").title).toBe("Some New Page");
  });
});
