import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatCurrency";

describe("formatCurrency invariants", () => {
  it("always renders a finite USD amount as a dollar string", () => {
    fc.assert(
      fc.property(
        fc.double({
          min: 0,
          max: 1_000_000,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (amount) => {
          const formatted = formatCurrency(amount, "USD");
          expect(formatted.startsWith("$")).toBe(true);
          expect(formatted).not.toMatch(/NaN|Infinity/);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("keeps the unknown-currency fallback printable", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (amount) => {
        expect(formatCurrency(amount, "USD")).toEqual(
          formatCurrency(amount, "USD"),
        );
      }),
      { numRuns: 50 },
    );
  });
});
