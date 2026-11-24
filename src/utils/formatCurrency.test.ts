import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatCurrency";

describe("formatCurrency", () => {
  it("formats the amount with the requested currency", () => {
    expect(formatCurrency(180, "USD")).toBe("$180");
  });
});
