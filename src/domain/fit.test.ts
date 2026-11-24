import { describe, expect, it } from "vitest";
import { recommendSize } from "./fit";

const STANDARD = ["XS", "S", "M", "L", "XL", "XXL"];

describe("recommendSize", () => {
  it("recommends a true-fit size from a chest measurement", () => {
    expect(recommendSize(STANDARD, 98, "true")?.size).toBe("M");
    expect(recommendSize(STANDARD, 110, "true")?.size).toBe("XL");
  });

  it("sizes up for roomy layering and down for a closer fit", () => {
    expect(recommendSize(STANDARD, 98, "roomy")?.size).toBe("L");
    expect(recommendSize(STANDARD, 98, "snug")?.size).toBe("M");
    expect(recommendSize(STANDARD, 100, "snug")?.size).toBe("M");
  });

  it("clamps out-of-range measurements instead of inventing a size", () => {
    expect(recommendSize(STANDARD, 40, "true")?.size).toBe("XS");
    expect(recommendSize(STANDARD, 200, "true")?.size).toBe("XXL");
  });

  it("handles single-size and unknown-label catalogues", () => {
    expect(recommendSize(["ONE SIZE"], 120, "roomy")?.size).toBe("ONE SIZE");
    expect(recommendSize(["Tiny", "Small", "Big"], 120, "true")?.size).toBe(
      "Big",
    );
    expect(recommendSize([], 100, "true")).toBeNull();
  });

  it("marks guidance provisional until a fit label exists", () => {
    expect(recommendSize(STANDARD, 98, "true")?.confidence).toBe("provisional");
    expect(recommendSize(STANDARD, 98, "true", "Relaxed")?.confidence).toBe(
      "guided",
    );
    expect(recommendSize(STANDARD, 98, "true", "Relaxed")?.rationale).toContain(
      "Relaxed",
    );
  });
});
