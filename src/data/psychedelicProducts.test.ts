import { describe, expect, it } from "vitest";

import { psychedelicProducts } from "./psychedelicProducts";

describe("psychedelic commerce records", () => {
  it("uses the canonical catalog slug as the product id", () => {
    const mind02 = psychedelicProducts[1];

    expect(mind02.id).toBe("mind-02-psychedelic-hoodie");
    expect(mind02.slug).toBe(mind02.id);
    expect(
      mind02.variants?.some(
        (variant) => variant.color === "Deep Red" && variant.size === "M",
      ),
    ).toBe(true);
  });
});
