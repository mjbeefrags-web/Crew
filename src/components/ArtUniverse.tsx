import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { psychedelicPieces } from "../data/psychedelic";
import { trackEvent } from "../lib/insights";

/** Positions are authored in the CSS grid below; percentages keep it responsive. */
const positions = [
  { x: 14, y: 26, z: -160, delay: 0 },
  { x: 74, y: 18, z: -260, delay: -2.4 },
  { x: 48, y: 62, z: -80, delay: -4.8 },
  { x: 84, y: 70, z: -220, delay: -7.2 },
  { x: 22, y: 78, z: -320, delay: -9.6 },
] as const;

/**
 * A lightweight "universe of arts": each artwork plate is a portal into its
 * own generated world (streets, buildings, a black hole) built from CSS.
 * No WebGL, no walk mode — hover to fall into the world, click to travel.
 */
export function ArtUniverse() {
  const navigate = useNavigate();
  const [focused, setFocused] = useState<string | null>(null);
  const [travelling, setTravelling] = useState<string | null>(null);

  const travel = (pieceId: string) => {
    if (travelling) return;
    trackEvent("drop_view", { dropSlug: "psychedelic-minds" });
    setTravelling(pieceId);
    window.setTimeout(
      () => navigate(`/drops/psychedelic-minds?piece=${pieceId}&entered=1`),
      420,
    );
  };

  return (
    <div
      className={`art-universe${focused ? " has-focus" : ""}`}
      role="group"
      aria-label="Five psychedelic art worlds"
    >
      <div className="universe-stars" aria-hidden="true" />
      <div className="universe-horizon" aria-hidden="true" />
      {psychedelicPieces.map((piece, index) => {
        const position = positions[index];
        const thumb = piece.artwork.replace(
          "/print-plates/",
          "/print-plates/thumbs/",
        );
        const style = {
          "--node-x": `${position.x}%`,
          "--node-y": `${position.y}%`,
          "--node-z": `${position.z}px`,
          "--node-delay": `${position.delay}s`,
          "--piece-accent": piece.accent,
          "--art": `url(${thumb})`,
        } as CSSProperties;
        return (
          <Link
            key={piece.id}
            to={`/drops/psychedelic-minds?piece=${piece.id}&entered=1`}
            className={`art-node${focused === piece.id ? " is-focused" : ""}`}
            style={style}
            onMouseEnter={() => setFocused(piece.id)}
            onMouseLeave={() =>
              setFocused((current) => (current === piece.id ? null : current))
            }
            onFocus={() => setFocused(piece.id)}
            onBlur={() =>
              setFocused((current) => (current === piece.id ? null : current))
            }
            onClick={(event) => {
              event.preventDefault();
              travel(piece.id);
            }}
            aria-label={`Enter ${piece.name}: ${piece.world.name}`}
          >
            <span className="art-world" aria-hidden="true">
              <span className="world-grid" />
              <span className="world-buildings">
                {Array.from({ length: 9 }, (_, building) => (
                  <i key={building} />
                ))}
              </span>
              <span className="world-blackhole" />
              <span className="world-road" />
            </span>
            <span className="art-plate">
              <img
                src={thumb}
                alt=""
                width={420}
                height={198}
                loading="lazy"
                decoding="async"
              />
              <span className="art-plate-glow" />
            </span>
            <span className="art-caption">
              <b>{piece.name}</b>
              <small>{piece.world.name}</small>
            </span>
          </Link>
        );
      })}
      {travelling && (
        <div className="universe-warp" aria-hidden="true">
          <span />
          <b>ENTERING {travelling.replace("mind-", "WORLD ")}</b>
        </div>
      )}
    </div>
  );
}
