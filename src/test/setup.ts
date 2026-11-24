import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrolling; guard lazy code paths and effects that
// would otherwise abort page renders or throw during tests.
if (typeof window !== "undefined") {
  window.scrollTo?.(0, 0);
  if (
    !window.scrollTo ||
    window.scrollTo.toString().includes("Not implemented")
  ) {
    Object.defineProperty(window, "scrollTo", {
      value: () => undefined,
      configurable: true,
    });
  }
  const defineElementScroll = (name: "scrollIntoView" | "scroll") => {
    const proto =
      typeof HTMLElement !== "undefined"
        ? HTMLElement.prototype
        : (Element.prototype as unknown);
    const current = (proto as unknown as Record<string, unknown>)[name];
    if (!current || String(current).includes("Not implemented")) {
      Object.defineProperty(proto, name, {
        value: () => undefined,
        configurable: true,
      });
    }
  };
  defineElementScroll("scrollIntoView");
}
