import type { PsychedelicPiece } from "./psychedelic";

/**
 * Long-form copy for the in-world object dossier.
 *
 * Kept separate from the product records so the store's commerce data stays
 * honest: these are concept notes for the supplied artwork, not production
 * claims. The garment copy deliberately repeats that final specs are pending.
 */
export type PsychedelicDossier = {
  concept: string;
  artwork: string;
  garment: string;
  world: string;
};

const dossiers: Record<string, PsychedelicDossier> = {
  "mind-01": {
    concept:
      "A study of being physically present and mentally elsewhere. The figure loses its edges first; the room stays sharp. This is the hoodie for the moment you stop answering and let the signal drift.",
    artwork:
      "A full-colour DTG back print reproduced from the supplied plate: a dissolving portrait, acid-green signal and an oxblood shadow. The back carries the whole thought; the chest mark keeps the front quiet.",
    garment:
      "Heavyweight cotton fleece in a relaxed pullover fit with ribbed cuffs and hem. Shown here as a concept 3D study — final specification and measurements are still to be confirmed with the production sample.",
    world:
      "THE DRIFT FIELD — where edges forget themselves. Acid green, oxblood and petrol blue. Enter when your body is in the room but your head has already left.",
  },
  "mind-02": {
    concept:
      "The loop that never quite ends. Same gesture, same scroll, same small promise that the next one will be different. A self-portrait of the feed, worn on the back.",
    artwork:
      "A dense, repeating back plate in bloom pink, deep violet and bone. The repetition is the point: every pass through the image finds another small detail, and the chest mark keeps the front deliberately plain.",
    garment:
      "Heavyweight cotton fleece, relaxed drop-shoulder fit, ribbed cuffs and hem. The preview garment is an illustration of the intended silhouette; production measurements are pending.",
    world:
      "THE LOOP CORRIDOR — where every scroll returns. Bloom pink, deep violet and bone. The room keeps handing you the same door.",
  },
  "mind-03": {
    concept:
      "An offering wrapped in repetition. Abundance as permission, not proof. The more gifts, the merrier — until the giving becomes its own loop and the receipt is the only thing left.",
    artwork:
      "A warm, ornamental back print in gold, oxblood and forest green. Full-colour DTG keeps the small gifts inside the graphic legible on cloth. The standard CREW chest mark anchors the front.",
    garment:
      "Heavyweight cotton fleece in a relaxed pullover fit. This is a concept garment study from the supplied collection; final fabric, fit and measurements are to be confirmed.",
    world:
      "THE GIVEN ROOM — where abundance becomes proof. Gold, oxblood and forest green. Everything is offered; nothing is free.",
  },
  "mind-04": {
    concept:
      "Reality is loud. Music takes you somewhere else. A room built from static, signal and the volume knob, for the moments when the only way to hear yourself is to turn everything else up.",
    artwork:
      "A cold, ecstatic back plate in electric blue, deep indigo and night. The waveform runs edge to edge so the print changes shape with the garment. The chest mark is the only anchor.",
    garment:
      "Heavyweight cotton fleece, relaxed fit, ribbed cuffs and hem. Shown as a concept 3D garment study — final production specification is pending.",
    world:
      "THE SIGNAL SEA — where static turns into colour. Electric blue, deep indigo and night. Tune out to tune in.",
  },
  "mind-05": {
    concept:
      "A warning disguised as a graphic. Think for me, write it for me, decide for me. The mind is the one thing you do not hand over, even when every room offers to think on your behalf.",
    artwork:
      "A borrowed-brain plate in violet, oxblood and acid green. Full-colour DTG back print, reproduced from the supplied artwork; the chest mark stays standard so the back can carry the warning.",
    garment:
      "Heavyweight cotton fleece in a relaxed pullover fit with ribbed cuffs and hem. Preview imagery is a concept garment study; final fabric and measurements are still to be confirmed.",
    world:
      "THE BORROWED MIND — where thinking gets outsourced. Violet, oxblood and acid green. Keep the one thing that is yours.",
  },
};

export function dossierFor(piece: PsychedelicPiece): PsychedelicDossier {
  return (
    dossiers[piece.id] ?? {
      concept: `${piece.lore} ${piece.line}`,
      artwork:
        "Full-colour DTG back print reproduced from the supplied concept plate. The standard CREW chest mark anchors the front.",
      garment:
        "Heavyweight cotton fleece in a relaxed pullover fit. Preview imagery is a concept garment study; final specification is pending.",
      world: `${piece.world.name} — ${piece.world.realm}. ${piece.world.palette.map((colour) => colour).join(", ")}.`,
    }
  );
}
