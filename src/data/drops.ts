/**
 * Concept 02 — Psychedelic Minds.
 *
 * Names, lines, print spec and colourways are transcribed from the design
 * team's CREW_Hoodie_Collection.pdf (slides 19–31). The `plate` values point
 * at lossless artwork crops extracted from the odd slides (21/23/25/27/29)
 * under public/images/drops/psychedelic-minds/print-plates; the full-slide
 * WebP exports remain in public/images/drops for the cover and lineup.
 */

export type DropColorway = { name: string; value: string };

export type Drop = {
  id: string;
  slug: string;
  number: string;
  name: string;
  line: string;
  lore: string;
  plate: string;
  artwork: string;
  colorways: DropColorway[];
  signal: string;
};

export const dropColorways: DropColorway[] = [
  { name: "White", value: "#eae5d8" },
  { name: "Deep Red", value: "#7d2026" },
  { name: "Black", value: "#171719" },
  { name: "Chocolate Brown", value: "#4b332b" },
  { name: "Petrol Blue", value: "#1d4b56" },
];

export const psychedelicCover = "/images/drops/drop-21.webp";
export const psychedelicLineup = "/images/drops/drop-31.webp";
export const crewMark = "/images/brand/logo.png";

export const drops: Drop[] = [
  {
    id: "drop-01",
    slug: "out-of-focus",
    number: "01 / 05",
    name: "Out of Focus",
    line: "Physically here. Mentally somewhere else.",
    lore: "The first transmission. A figure dissolving at the edges, caught between the room you are standing in and the place your head already went. Full-colour DTG back print with the CREW chest mark.",
    plate:
      "/images/drops/psychedelic-minds/print-plates/01-out-of-focus-dtg-back-print.webp",
    artwork: "/images/drops/drop-22.webp",
    colorways: dropColorways,
    signal: "DRIFT",
  },
  {
    id: "drop-02",
    slug: "life-in-scroll",
    number: "02 / 05",
    name: "Life in Scroll",
    line: "A never-ending feed. A life on repeat.",
    lore: "Design two. The loop that never quite ends: same gesture, same scroll, same small promise that the next one will be different. Printed loud on the back, quiet on the chest.",
    plate:
      "/images/drops/psychedelic-minds/print-plates/02-life-in-scroll-dtg-back-print.webp",
    artwork: "/images/drops/drop-24.webp",
    colorways: dropColorways,
    signal: "LOOP",
  },
  {
    id: "drop-03",
    slug: "the-gift-theory",
    number: "03 / 05",
    name: "The Gift Theory",
    line: "The more gifts, the merrier.",
    lore: "An offering wrapped in repetition. The gift theory says abundance is its own kind of permission. Full-colour DTG back graphic with the standard CREW chest logo.",
    plate:
      "/images/drops/psychedelic-minds/print-plates/03-the-gift-theory-dtg-back-print.webp",
    artwork: "/images/drops/drop-26.webp",
    colorways: dropColorways,
    signal: "GIVE",
  },
  {
    id: "drop-04",
    slug: "lost-in-the-frequency",
    number: "04 / 05",
    name: "Lost in the Frequency",
    line: "Reality is loud. Music takes you somewhere else.",
    lore: "Tune out to tune in. Static, signal and a frequency that only exists when the volume is high enough. Design four of the psychedelic run.",
    plate:
      "/images/drops/psychedelic-minds/print-plates/04-lost-in-the-frequency-dtg-back-print.webp",
    artwork: "/images/drops/drop-28.webp",
    colorways: dropColorways,
    signal: "TUNE",
  },
  {
    id: "drop-05",
    slug: "outsourced-mind",
    number: "05 / 05",
    name: "Outsourced Mind",
    line: "Keep your mind yours.",
    lore: "The last transmission in the set. A warning disguised as a graphic: think for me, write it for me, decide for me. The mind is the one thing you do not hand over.",
    plate:
      "/images/drops/psychedelic-minds/print-plates/05-outsourced-mind-dtg-back-print.webp",
    artwork: "/images/drops/drop-30.webp",
    colorways: dropColorways,
    signal: "KEEP",
  },
];

export const getDrop = (slug: string | undefined): Drop | undefined =>
  drops.find((drop) => drop.slug === slug);
