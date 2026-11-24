/**
 * Concept 02 — Psychedelic Minds.
 *
 * Every garment is a concept with its own world. The canonical assets live in
 * public/images/drops/psychedelic-minds and mirror the master set in
 * docs/material/psychedelic-minds. `world` drives the room palette, sigil and
 * language; `artwork` is the true DTG back print; `photo` is the hero garment.
 */
export type PsychedelicWorld = {
  name: string;
  realm: string;
  glyph: string;
  palette: readonly [string, string, string];
};

export type PsychedelicPiece = {
  id: string;
  signal: string;
  name: string;
  line: string;
  lore: string;
  world: PsychedelicWorld;
  artwork: string;
  photo?: string;
  photoApproved?: boolean;
  angles: readonly string[];
  accent: string;
};

const assetRoot = "/images/drops/psychedelic-minds";

const anglesFor = (slug: string): readonly string[] =>
  ["a", "b", "c", "d"].map(
    (view) => `${assetRoot}/alternate-colorway-views/${slug}-view-${view}.webp`,
  );

export const psychedelicFrontViews = [
  `${assetRoot}/front-and-chest-mark/front-right.webp`,
  `${assetRoot}/front-and-chest-mark/front-left.webp`,
] as const;

export const psychedelicPieces: readonly PsychedelicPiece[] = [
  {
    id: "mind-01",
    signal: "DRIFT",
    name: "Out of Focus",
    line: "Physically here. Mentally somewhere else.",
    lore: "Edges dissolve. The room stays, you do not.",
    world: {
      name: "THE DRIFT FIELD",
      realm: "where edges forget themselves",
      glyph: "◌",
      palette: ["#c9ef68", "#7d2026", "#1d4b56"],
    },
    artwork: `${assetRoot}/print-plates/01-out-of-focus-dtg-back-print.webp`,
    photo: "/images/drops/hoodie-01-out-of-focus-approved.jpg",
    photoApproved: true,
    angles: anglesFor("01-out-of-focus"),
    accent: "#c9ef68",
  },
  {
    id: "mind-02",
    signal: "LOOP",
    name: "Life in Scroll",
    line: "A never-ending feed. A life on repeat.",
    lore: "Same gesture, same scroll, next one will be different.",
    world: {
      name: "THE LOOP CORRIDOR",
      realm: "where every scroll returns",
      glyph: "∞",
      palette: ["#f2a0c4", "#5c2b6e", "#e8d7b8"],
    },
    artwork: `${assetRoot}/print-plates/02-life-in-scroll-dtg-back-print.webp`,
    photo: "/images/drops/hoodie-02-life-in-scroll-approved.jpg",
    photoApproved: true,
    angles: anglesFor("02-life-in-scroll"),
    accent: "#f2a0c4",
  },
  {
    id: "mind-03",
    signal: "GIVE",
    name: "The Gift Theory",
    line: "The more gifts, the merrier.",
    lore: "Abundance is its own kind of permission.",
    world: {
      name: "THE GIVEN ROOM",
      realm: "where abundance becomes proof",
      glyph: "✦",
      palette: ["#ffd27a", "#7d2026", "#254c43"],
    },
    artwork: `${assetRoot}/print-plates/03-the-gift-theory-dtg-back-print.webp`,
    photo: `${assetRoot}/hoodie-product-photos/03-the-gift-theory-hoodie.webp`,
    angles: anglesFor("03-the-gift-theory"),
    accent: "#ffd27a",
  },
  {
    id: "mind-04",
    signal: "TUNE",
    name: "Lost in the Frequency",
    line: "Reality is loud. Music takes you somewhere else.",
    lore: "Static, signal, and a frequency you can feel.",
    world: {
      name: "THE SIGNAL SEA",
      realm: "where static turns into colour",
      glyph: "≋",
      palette: ["#83d6ef", "#2b1b4d", "#101b2a"],
    },
    artwork: `${assetRoot}/print-plates/04-lost-in-the-frequency-dtg-back-print.webp`,
    photo: "/images/drops/hoodie-04-lost-in-frequency-approved.jpg",
    photoApproved: true,
    angles: anglesFor("04-lost-in-the-frequency"),
    accent: "#83d6ef",
  },
  {
    id: "mind-05",
    signal: "KEEP",
    name: "Outsourced Mind",
    line: "Keep your mind yours.",
    lore: "The one thing you do not hand over.",
    world: {
      name: "THE BORROWED MIND",
      realm: "where thinking gets outsourced",
      glyph: "◉",
      palette: ["#b69cff", "#7d2026", "#c9ef68"],
    },
    artwork: `${assetRoot}/print-plates/05-outsourced-mind-dtg-back-print.webp`,
    photo: `${assetRoot}/hoodie-product-photos/05-outsourced-mind-hoodie.webp`,
    angles: anglesFor("05-outsourced-mind"),
    accent: "#b69cff",
  },
];

export const psychedelicMoods = [
  { name: "ACID", a: "#c9ef68", b: "#7d2026", c: "#1d4b56" },
  { name: "BLOOM", a: "#f2a0c4", b: "#5c2b6e", c: "#ffd27a" },
  { name: "DEEP", a: "#83d6ef", b: "#2b1b4d", c: "#c9ef68" },
  { name: "EMBER", a: "#ff9d5c", b: "#7d2026", c: "#f2d67a" },
] as const;

export const getPsychedelicPiece = (
  id?: string | null,
): PsychedelicPiece | undefined =>
  psychedelicPieces.find((piece) => piece.id === id);

/**
 * Frequencies are rotations of a garment's own world palette, never a generic
 * overlay. Switching pieces therefore changes all three shader colours, not
 * just an accent, so each concept really lives in a different room.
 */
export const frequenciesForPiece = (piece: PsychedelicPiece) =>
  psychedelicMoods.map((mood, index) => ({
    ...mood,
    a: piece.world.palette[index % piece.world.palette.length],
    b: piece.world.palette[(index + 1) % piece.world.palette.length],
    c: piece.world.palette[(index + 2) % piece.world.palette.length],
  }));
