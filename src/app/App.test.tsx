import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { mockCatalogService } from "../services/mockCatalogService";

function renderApp(path: string) {
  window.localStorage.clear();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("foundation routes", () => {
  it("renders the Crewww hoodie showroom and discovery tools", async () => {
    renderApp("/");

    expect(
      await screen.findByRole(
        "heading",
        { name: /the block is yours/i },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: /find your crew/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("textbox", { name: /search pieces/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("navigation", { name: /primary navigation/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("navigation", {
        name: /explore crewww collections/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /skip to content/i }),
    ).toHaveAttribute("href", "#main-content");
  });

  it("filters products and opens a clearly labeled static inspection fallback", async () => {
    const user = userEvent.setup();
    renderApp("/");
    const search = await screen.findByRole(
      "textbox",
      { name: /search pieces/i },
      { timeout: 3000 },
    );
    // The skip link stays the first Tab stop on initial load; focus moves to
    // <main> only on later route changes. Typing here is therefore safe.
    await user.type(search, "Cherry");
    const collection = within(
      screen.getByRole("region", { name: /find your crew/i }),
    );
    expect(
      collection.getByRole("heading", { name: "Cherry Blossom Hoodie" }),
    ).toBeInTheDocument();
    // The showroom mounts a lazy 3D scene and several art rails, so filtered
    // result updates can take longer than the 1s default on slow CI machines.
    await waitFor(
      () =>
        expect(
          collection.queryByRole("heading", { name: "Vivre La Vie Hoodie" }),
        ).not.toBeInTheDocument(),
      { timeout: 5000 },
    );
    await user.clear(screen.getByRole("textbox", { name: /search pieces/i }));
    await user.click(
      screen.getByRole("button", { name: /inspect joy of outdoors hoodie/i }),
    );
    expect(
      screen.getByRole("dialog", {
        name: /joy of outdoors hoodie inspection studio/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("group", {
        name: /joy of outdoors hoodie 3d product viewer/i,
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Select Mocha" }));
    await user.click(screen.getByRole("button", { name: /^L$/ }));
    await user.click(screen.getByRole("button", { name: /add to cart/i }));
    await user.click(
      screen.getByRole("button", { name: /back to collection/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /^Shopping cart, 1 items$/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /shopping cart/i }),
    ).toHaveTextContent("Mocha / L / QTY 1");
    expect(window.localStorage.getItem("arcfield-bag")).toContain("product-03");
  }, 20000);

  it("renders the design-system preview", () => {
    renderApp("/design-system");

    expect(
      screen.getByRole("heading", { name: /language/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/color \/ natural tension/i)).toBeInTheDocument();
  });

  it("shows a real not-found state for unmatched routes", () => {
    renderApp("/unplanned-route");
    expect(
      screen.getByRole("heading", { name: /this path/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /return to crewww/i }),
    ).toHaveAttribute("href", "/");
  });

  it("validates the preview form and confirms a valid address", async () => {
    const user = userEvent.setup();
    renderApp("/design-system");

    await user.type(
      screen.getByRole("textbox", { name: /email address/i }),
      "not-an-email",
    );
    await user.click(screen.getByRole("button", { name: /validate field/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid email address.",
    );

    const input = screen.getByRole("textbox", { name: /email address/i });
    await user.clear(input);
    await user.type(input, "field@example.com");
    await user.click(screen.getByRole("button", { name: /validate field/i }));
    expect(
      await screen.findByText(/field state confirmed/i),
    ).toBeInTheDocument();
  });

  it("provides the expanded typed mock catalog", async () => {
    await expect(
      mockCatalogService.listFeaturedProducts(),
    ).resolves.toHaveLength(8);
    await expect(
      mockCatalogService.getProduct("missing-product"),
    ).resolves.toBeNull();
  });
});
