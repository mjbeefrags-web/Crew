import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "./apiClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest error details", () => {
  it("surfaces the first FastAPI validation message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        detail: [
          {
            loc: ["body", "product_id"],
            msg: "Input should be a valid UUID",
            type: "uuid_parsing",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/api/v1/cart/items", {
        method: "POST",
        body: JSON.stringify({ product_id: "bad-id" }),
      }),
    ).rejects.toMatchObject({
      status: 422,
      message: "Input should be a valid UUID",
    });
  });

  it("uses the structured API message when available", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        detail: {
          code: "variant_unavailable",
          message: "That size and color are not available.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/api/v1/cart/items")).rejects.toMatchObject({
      status: 404,
      code: "variant_unavailable",
      message: "That size and color are not available.",
    });
  });
});
