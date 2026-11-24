import { lazy, Suspense, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  drops,
  getDrop,
  psychedelicCover,
  psychedelicLineup,
} from "../data/drops";
import { psychedelicPieces } from "../data/psychedelic";
import { psychedelicProducts } from "../data/psychedelicProducts";
import { useCommerceStore } from "../state/commerceStore";
import { trackEvent } from "../lib/insights";
import { ColorwayMatrix } from "../components/ColorwayMatrix";

const DropExperience = lazy(() =>
  import("../components/DropExperience").then((module) => ({
    default: module.DropExperience,
  })),
);

export function DropsIndexPage() {
  return (
    <div className="storefront-page drops-index-page">
      <section
        className="drops-index-hero"
        data-reveal
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(10,9,11,.94),rgba(10,9,11,.35)),url(${psychedelicCover})`,
        }}
      >
        <div className="drops-index-artwall" aria-hidden="true">
          {psychedelicPieces.map((piece) => (
            <img key={piece.id} src={piece.artwork} alt="" loading="lazy" />
          ))}
        </div>
        <p className="store-eyebrow">CREW / CONCEPT 02 / PSYCHEDELIC MINDS</p>
        <h1>
          Enter the <em>drop.</em>
        </h1>
        <p>
          Five pieces. Five states of mind. Every hoodie is an item with a story
          — open one and the room changes around it.
        </p>
        <Link className="text-link" to="/drops/psychedelic-minds">
          ENTER THE PSYCHEDELIC ROOM ↗
        </Link>
        <Link className="drops-classic-link" to="/drops/out-of-focus">
          PRESS START / CLASSIC CHAMBER ↗
        </Link>
      </section>
      <Link
        to="/drops/psychedelic-minds"
        className="drops-trip-entry"
        data-reveal
      >
        <span>CONCEPT 02 / IMMERSIVE ROOM</span>
        <h2>
          Feel the <em>frequency.</em>
        </h2>
        <p>A living psychedelic world. Five pieces, five moods, one trip.</p>
        <b>ENTER ROOM 01 ↗</b>
      </Link>
      <section className="drops-index-grid" data-reveal>
        {drops.map((drop, index) => (
          <Link
            key={drop.slug}
            to={`/drops/${drop.slug}`}
            className="drop-index-card"
          >
            <div className="drop-index-media">
              <img
                src={drop.plate}
                alt={`${drop.name} artwork plate`}
                loading="lazy"
              />
              <span>{drop.number}</span>
            </div>
            <div className="drop-index-copy">
              <p>
                DESIGN {drop.number} · {drop.signal}
              </p>
              <h2>{drop.name}</h2>
              <p className="drop-index-world">
                {psychedelicPieces[index]?.world.name}
              </p>
              <p>“{drop.line}”</p>
              <b>OPEN THE DROP ↗</b>
            </div>
            <span className="drop-index-order">0{index + 1}</span>
          </Link>
        ))}
      </section>
      <ColorwayMatrix />
      <section className="drops-lineup" data-reveal>
        <img
          src={psychedelicLineup}
          alt="Full psychedelic minds hoodie lineup"
          loading="lazy"
        />
        <div>
          <p className="store-eyebrow">THE FULL LINEUP / SIX COLOURWAYS</p>
          <h2>
            Pick your
            <br />
            <em>frequency.</em>
          </h2>
          <p>
            White · Deep Red · Black · Chocolate Brown · Petrol Blue.
            Full-colour DTG back print with the CREW chest mark.
          </p>
        </div>
      </section>
    </div>
  );
}

export function DropPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const drop = getDrop(slug);
  const addCartLine = useCommerceStore((state) => state.addCartLine);

  useEffect(() => {
    if (drop) trackEvent("drop_view", { dropSlug: drop.slug });
  }, [drop?.slug]);

  if (!drop)
    return (
      <div className="storefront-page route-fallback">
        <p className="store-eyebrow">CREW / DROP NOT FOUND</p>
        <h1>
          Not in
          <br />
          <em>this drop.</em>
        </h1>
        <Link className="text-link" to="/drops">
          BACK TO THE DROPS ↗
        </Link>
      </div>
    );
  const index = Math.max(
    0,
    drops.findIndex((item) => item.slug === slug),
  );
  const product = psychedelicProducts[index] ?? psychedelicProducts[0];
  return (
    <Suspense
      fallback={
        <div className="catalog-skeleton" role="status">
          OPENING THE DROP CHAMBER…
        </div>
      }
    >
      <DropExperience
        key={drop.slug}
        drop={drop}
        onExit={() => navigate("/drops")}
        onSelectDrop={(next) => navigate(`/drops/${next}`)}
        onColorwayChange={(colorway) =>
          trackEvent("drop_colorway", { dropSlug: drop.slug, query: colorway })
        }
        onAddToBag={(colorway, size) => {
          addCartLine({
            productId: product.id,
            size,
            color: colorway,
            quantity: 1,
          });
          trackEvent("drop_add", {
            dropSlug: drop.slug,
            productSlug: product.slug,
            query: `${colorway}/${size}`,
          });
        }}
      />
    </Suspense>
  );
}
