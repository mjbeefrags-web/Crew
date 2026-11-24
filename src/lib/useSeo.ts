import { useEffect } from 'react';

type SeoOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  structuredData?: Record<string, unknown>;
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Keeps document metadata aligned with the active route without a routing-specific dependency. */
export function useSeo({ title, description, path, image, structuredData }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes('CREWWW') ? title : `${title} — CREWWW`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    if (image) setMeta('property', 'og:image', new URL(image, window.location.origin).toString());

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = new URL(path ?? window.location.pathname, window.location.origin).toString();

    const id = 'crewww-structured-data';
    document.getElementById(id)?.remove();
    if (structuredData) {
      const script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, [title, description, path, image, structuredData]);
}
