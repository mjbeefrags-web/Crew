import { useEffect } from "react";

type SeoOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "product" | "article";
  structuredData?: Record<string, unknown>;
  /**
   * Owner key for the document's current metadata claim. Pages that have
   * data-specific metadata use the default "page"; the route fallback uses
   * "route" and defers to "page".
   */
  owner?: string;
  deferTo?: string;
};

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Keeps document metadata aligned with the active route without a routing-specific dependency. */
export function useSeo({
  title,
  description,
  path,
  image,
  type = "website",
  structuredData,
  owner = "page",
  deferTo,
}: SeoOptions) {
  useEffect(() => {
    const root = document.documentElement;
    // A page with resolved, data-specific metadata wins over the route map.
    if (deferTo && root.dataset.seoOwner === deferTo) return undefined;
    root.dataset.seoOwner = owner;

    const fullTitle = title.includes("CREWWW") ? title : `${title} — CREWWW`;
    const url = new URL(
      path ?? window.location.pathname,
      window.location.origin,
    );
    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url.toString());
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    if (image) {
      const absolute = new URL(image, window.location.origin).toString();
      setMeta("property", "og:image", absolute);
      setMeta("name", "twitter:image", absolute);
    }

    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url.toString();

    const id = "crewww-structured-data";
    document.getElementById(id)?.remove();
    if (structuredData) {
      const script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
    return () => {
      document.getElementById(id)?.remove();
      if (root.dataset.seoOwner === owner) delete root.dataset.seoOwner;
    };
  }, [title, description, path, image, type, structuredData, owner, deferTo]);
}
