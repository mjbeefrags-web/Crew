import { useMemo, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { dropColorways } from "../data/drops";
import {
  psychedelicFrontViews,
  psychedelicPieces,
  type PsychedelicPiece,
} from "../data/psychedelic";
import { psychedelicProducts } from "../data/psychedelicProducts";

const viewFor = (piece: PsychedelicPiece, column: number): string => {
  if (column === 0) return piece.photo ?? piece.artwork;
  if (column <= piece.angles.length) return piece.angles[column - 1];
  return psychedelicFrontViews[
    (column - piece.angles.length - 1) % psychedelicFrontViews.length
  ];
};

/**
 * Editorial garment × colourway matrix. Every cell shows a different supplied
 * angle, the preview matches the selected image, and the exact look is stored
 * in the URL so it survives a reload or can be shared.
 */
export function ColorwayMatrix() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pieceIndex = useMemo(() => {
    const requested = searchParams.get("piece");
    const index = psychedelicPieces.findIndex((item) => item.id === requested);
    return index >= 0 ? index : 0;
  }, [searchParams]);
  const colorIndex = useMemo(() => {
    const requested = searchParams.get("colour");
    const index = dropColorways.findIndex(
      (item) => item.name.toLowerCase() === requested?.toLowerCase(),
    );
    return index >= 0 ? index : 0;
  }, [searchParams]);
  const piece = psychedelicPieces[pieceIndex];
  const colorway = dropColorways[colorIndex];
  const product = psychedelicProducts[pieceIndex];
  const previewImage = viewFor(piece, colorIndex);

  const select = (nextPiece: number, nextColor: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("piece", psychedelicPieces[nextPiece].id);
    next.set("colour", dropColorways[nextColor].name);
    setSearchParams(next, { replace: true });
  };

  return (
    <section
      className="colorway-matrix"
      data-reveal
      aria-labelledby="matrix-title"
    >
      <div className="matrix-heading">
        <div>
          <p className="store-eyebrow">CONCEPT 02 / THE EDITORIAL MATRIX</p>
          <h2 id="matrix-title">
            Pick your <em>frequency.</em>
          </h2>
        </div>
        <p>
          Five garments. Five colourways. Twenty supplied views. Select a look
          and the room changes with it.
        </p>
      </div>
      <div className="matrix-body">
        <div className="matrix-scroll">
          <div
            className="matrix-grid"
            role="grid"
            aria-label="Garment and colourway matrix"
          >
            <div className="matrix-cell matrix-corner" role="columnheader">
              GARMENT / COLOUR
            </div>
            {dropColorways.map((color) => (
              <div
                className="matrix-cell matrix-column"
                role="columnheader"
                key={color.name}
              >
                <i style={{ background: color.value }} />
                {color.name}
              </div>
            ))}
            {psychedelicPieces.map((item, row) => (
              <div className="matrix-row" role="row" key={item.id}>
                <div className="matrix-cell matrix-label" role="rowheader">
                  <span>{String(row + 1).padStart(2, "0")}</span>
                  {item.name}
                </div>
                {dropColorways.map((color, column) => {
                  const selected = row === pieceIndex && column === colorIndex;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      role="gridcell"
                      aria-label={`${item.name} in ${color.name}`}
                      aria-selected={selected}
                      className={`matrix-cell matrix-choice${selected ? " is-selected" : ""}`}
                      style={
                        {
                          "--cell-color": color.value,
                          "--cell-art": `url(${viewFor(item, column)})`,
                        } as CSSProperties
                      }
                      onClick={() => select(row, column)}
                    >
                      <img src={viewFor(item, column)} alt="" loading="lazy" />
                      <span>{color.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <aside className="matrix-preview" key={`${piece.id}-${colorway.name}`}>
          <div
            className="matrix-preview-art"
            style={
              {
                "--cell-color": colorway.value,
                "--preview-art": `url(${piece.artwork})`,
              } as CSSProperties
            }
          >
            <img
              src={previewImage}
              alt={`${piece.name} in ${colorway.name}`}
              loading="lazy"
            />
            <span aria-hidden="true">{piece.world.glyph}</span>
          </div>
          <p className="matrix-preview-kicker">
            SELECTED / {piece.signal} · {colorway.name.toUpperCase()}
          </p>
          <h3>{piece.name}</h3>
          <p className="matrix-preview-world">
            {piece.world.name} / {piece.world.realm}
          </p>
          <p className="matrix-preview-line">“{piece.line}”</p>
          <div className="matrix-preview-actions">
            <Link
              to={`/drops/psychedelic-minds?piece=${piece.id}&entered=1&colour=${encodeURIComponent(colorway.name)}&mood=ACID`}
            >
              ENTER THIS WORLD ↗
            </Link>
            <Link to={`/products/${product.slug}`}>VIEW PRODUCT ↗</Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
