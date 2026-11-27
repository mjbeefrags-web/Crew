import { catalogRoutes } from "../data/mock/storefront";

export type SeoRoute = {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "product" | "article";
};

const DEFAULT_IMAGE = "/images/editorial/hero-campaign.webp";

const routes: Record<string, SeoRoute> = {
  "/": {
    title: "Graphic fleece for your own frequency",
    description:
      "Crewww is a graphic-fleece storefront built around worlds, drops and the pieces you wear between them.",
    image: DEFAULT_IMAGE,
  },
  "/drops": {
    title: "Current drops",
    description:
      "Every active Crewww drop, world and limited run in one place.",
    image: "/images/editorial/drop-story.webp",
  },
  "/drops/psychedelic-minds": {
    title: "Psychedelic Minds",
    description:
      "Step inside the Psychedelic Minds drop: four worlds, one frequency and a wardrobe built to move through them.",
    image: "/images/editorial/drop-story.webp",
  },
  "/lookbook": {
    title: "Lookbook",
    description:
      "Stories, styling notes and the world behind each Crewww piece.",
    image: DEFAULT_IMAGE,
  },
  "/denim/fits": {
    title: "Denim fits",
    description: "Find the fit that moves the way you do.",
  },
  "/find-stores": {
    title: "Find stores",
    description: "Where to find Crewww pieces in the real world.",
  },
  "/about": {
    title: "About Crewww",
    description: "Move your own way. Find your people.",
  },
  "/contact": {
    title: "Contact",
    description: "Talk to the Crewww team.",
  },
  "/support": {
    title: "Support",
    description: "Answers, help and ways to reach us.",
  },
  "/faq": {
    title: "FAQ",
    description:
      "Frequently asked questions about orders, sizing and delivery.",
  },
  "/shipping": {
    title: "Shipping",
    description: "How Crewww orders travel from the block to your door.",
  },
  "/returns": {
    title: "Returns",
    description: "The Crewww returns and exchanges policy.",
  },
  "/policies/privacy": {
    title: "Privacy policy",
    description: "How Crewww handles your information.",
  },
  "/policies/terms": {
    title: "Terms of use",
    description: "The terms that govern use of this storefront.",
  },
  "/cart": { title: "Shopping cart", description: "Your Crewww cart." },
  "/checkout": {
    title: "Checkout",
    description: "Complete your Crewww order.",
  },
  "/wishlist": {
    title: "Wishlist",
    description: "Pieces you saved for later.",
  },
  "/search": { title: "Search", description: "Search the Crewww edit." },
  "/login": {
    title: "Sign in",
    description: "Sign in to your Crewww account.",
  },
  "/register": {
    title: "Create an account",
    description: "Join Crewww to save pieces and track orders.",
  },
  "/forgot-password": {
    title: "Reset your password",
    description: "Recover access to your Crewww account.",
  },
  "/account": {
    title: "Your account",
    description: "Orders, addresses and profile.",
  },
  "/design-system": {
    title: "Design system",
    description: "The type, colour and components behind Crewww.",
  },
};

const catalogByPath = new Map(
  catalogRoutes.map((route) => [
    route.path,
    {
      title: route.title,
      description: route.description,
      image: route.image,
    } satisfies SeoRoute,
  ]),
);

function titleFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return "Crewww";
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Route-level metadata. Product and catalogue pages write their own, richer
 * metadata once their data resolves; useSeo's owner guard lets those pages win.
 */
export function routeSeo(
  pathname: string,
  search = "",
): SeoRoute & { path: string } {
  const known = routes[pathname] ?? catalogByPath.get(pathname);
  const title = known?.title ?? titleFromPath(pathname);
  return {
    title,
    description:
      known?.description ??
      `Explore ${title.toLowerCase()} and the current Crewww edit.`,
    image: known?.image ?? DEFAULT_IMAGE,
    type: known?.type ?? "website",
    path: `${pathname}${search}`,
  };
}
