import type { EditorialStory, StorePreview } from "../../domain/content";

export const storePreviews: readonly StorePreview[] = [
  {
    slug: "location-preview-01",
    name: "CREWWW / Location preview 01",
    area: "Sample district",
    address: "Address pending owner confirmation",
    hours: ["Opening hours pending confirmation"],
    phone: "Contact details pending confirmation",
    previewOnly: true,
  },
  {
    slug: "location-preview-02",
    name: "CREWWW / Location preview 02",
    area: "Sample district",
    address: "Address pending owner confirmation",
    hours: ["Opening hours pending confirmation"],
    phone: "Contact details pending confirmation",
    previewOnly: true,
  },
  {
    slug: "location-preview-03",
    name: "CREWWW / Location preview 03",
    area: "Sample district",
    address: "Address pending owner confirmation",
    hours: ["Opening hours pending confirmation"],
    phone: "Contact details pending confirmation",
    previewOnly: true,
  },
];

export const stories: readonly EditorialStory[] = [
  {
    slug: "notes-1",
    title: "The first frame",
    eyebrow: "LOOKBOOK / 01",
    description:
      "A campaign visual study built around graphic fleece, city light and the pieces that move with you.",
    image: "/images/editorial/lookbook-01.webp",
    type: "lookbook",
  },
  {
    slug: "notes-2",
    title: "Off the clock",
    eyebrow: "LOOKBOOK / 02",
    description:
      "A visual note on the hours around the plan, with sample wardrobe references.",
    image: "/images/editorial/lookbook-02.webp",
    type: "lookbook",
  },
  {
    slug: "notes-3",
    title: "Find your frequency",
    eyebrow: "LOOKBOOK / 03",
    description:
      "Everyday shape, expressive graphics and room to make the look your own.",
    image: "/images/editorial/lookbook-03.webp",
    type: "lookbook",
  },
  {
    slug: "first-run",
    title: "After hours, on your terms.",
    eyebrow: "DROP 01 / THE FIRST RUN",
    description:
      "A development campaign for the Crewww hoodie edit. Product, pricing and campaign details remain subject to owner confirmation.",
    image: "/images/editorial/drop-story.webp",
    type: "drop",
  },
];
