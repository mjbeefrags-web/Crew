import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import type { Product } from "../domain/product";
import type { DropColorway } from "../data/drops";
import type { PsychedelicPiece } from "../data/psychedelic";
import {
  dossierFor,
  type PsychedelicDossier,
} from "../data/psychedelicDossier";
import { formatCurrency } from "../utils/formatCurrency";

const HoodieViewer = lazy(() =>
  import("./HoodieViewer").then((module) => ({ default: module.HoodieViewer })),
);

type DossierTab = keyof PsychedelicDossier;

const DOSSIER_TABS: Array<{ key: DossierTab; label: string; number: string }> =
  [
    { key: "concept", label: "CONCEPT", number: "01" },
    { key: "artwork", label: "ARTWORK", number: "02" },
    { key: "garment", label: "GARMENT", number: "03" },
    { key: "world", label: "WORLD", number: "04" },
  ];

const PHASES = [
  { label: "SCAN", note: "TURN THE OBJECT" },
  { label: "PRINT", note: "READ THE PLATE" },
  { label: "EQUIP", note: "CHOOSE YOUR LOADOUT" },
];

type DropObjectStageProps = {
  piece: PsychedelicPiece;
  product: Product;
  index: number;
  colorways: readonly DropColorway[];
  colorIndex: number;
  sizeIndex: number;
  soldOut: boolean;
  onColorChange: (index: number) => void;
  onSizeChange: (size: string) => void;
  onEquip: () => void;
};

/**
 * The drop's signature scroll chapter.
 *
 * A tall section holds the object stage in place while the page scrolls. The
 * visitor's scroll turns the garment, advances the scan HUD and moves the
 * dossier from concept to artwork to loadout. It is deliberately built on the
 * existing Three.js viewer rather than adding a second 3D runtime.
 */
export function DropObjectStage({
  piece,
  product,
  index,
  colorways,
  colorIndex,
  sizeIndex,
  soldOut,
  onColorChange,
  onSizeChange,
  onEquip,
}: DropObjectStageProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const userTabRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState<DossierTab>("concept");
  const [reduceMotion] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );

  const dossier = useMemo(() => dossierFor(piece), [piece]);
  const selectedColor = colorways[colorIndex] ?? colorways[0];
  const selectedSize = product.sizes[sizeIndex] ?? product.sizes[0] ?? "M";
  const phaseIndex = progress < 0.32 ? 0 : progress < 0.68 ? 1 : 2;
  const scrollYaw = reduceMotion || !isActive ? 0 : progress * Math.PI * 2;
  const phase = PHASES[phaseIndex];
  const percentage = String(Math.round(progress * 100)).padStart(3, "0");

  useEffect(() => {
    userTabRef.current = false;
    setTab("concept");
  }, [piece.id]);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return undefined;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - window.innerHeight);
      const next = Math.max(0, Math.min(1, -bounds.top / travel));
      setProgress((current) =>
        Math.abs(current - next) < 0.002 ? current : next,
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    measure();

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => setIsActive(entries.some((entry) => entry.isIntersecting)),
        { rootMargin: "140px 0px", threshold: 0.1 },
      );
      observer.observe(element);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (userTabRef.current) return;
    const next: DossierTab =
      progress < 0.32 ? "concept" : progress < 0.68 ? "artwork" : "garment";
    setTab((current) => (current === next ? current : next));
  }, [progress]);

  const chooseTab = (next: DossierTab) => {
    userTabRef.current = true;
    setTab(next);
  };

  const style = {
    "--object-progress": progress.toFixed(4),
    "--object-accent": piece.accent,
    "--world-a": piece.world.palette[0],
    "--world-b": piece.world.palette[1],
    "--world-c": piece.world.palette[2],
  } as CSSProperties;

  return (
    <section
      className={`drop-object${isActive ? "" : " is-inactive"}`}
      ref={sectionRef}
      style={style}
      data-chapter="THE OBJECT"
      aria-labelledby="drop-object-title"
    >
      <div className="drop-object-sticky">
        <div className="drop-object-backdrop" aria-hidden="true">
          <img
            src={piece.artwork}
            alt=""
            width={957}
            height={452}
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="drop-object-hud" aria-hidden="true">
          <span>OBJECT {String(index + 1).padStart(2, "0")} / 05</span>
          <span className="drop-object-hud-signal">
            <i /> {phase.label} · {percentage}%
          </span>
          <span>SCROLL TO INSPECT</span>
        </div>

        <div className="drop-object-copy">
          <p className="drop-object-kicker">
            <span aria-hidden="true">{piece.world.glyph}</span> WORLD /{" "}
            {piece.world.name}
          </p>
          <p className="drop-object-signal">
            <i /> SIGNAL / {piece.signal}
          </p>
          <h2 id="drop-object-title">
            {piece.name}
            <span>.</span>
          </h2>
          <p className="drop-object-line">“{piece.line}”</p>

          <div
            className="drop-object-tabs"
            role="tablist"
            aria-label={`${piece.name} dossier`}
          >
            {DOSSIER_TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`dossier-tab-${item.key}`}
                aria-selected={tab === item.key}
                aria-controls="drop-object-dossier"
                className={tab === item.key ? "is-active" : ""}
                onClick={() => chooseTab(item.key)}
              >
                <span>{item.number}</span>
                {item.label}
              </button>
            ))}
          </div>

          <div
            className="drop-object-dossier"
            id="drop-object-dossier"
            role="tabpanel"
            aria-labelledby={`dossier-tab-${tab}`}
            key={`${piece.id}-${tab}`}
          >
            <p>{dossier[tab]}</p>
            {tab === "world" && (
              <div className="drop-object-palette" aria-label="World palette">
                {piece.world.palette.map((colour) => (
                  <i key={colour} style={{ background: colour }} />
                ))}
                <span>{piece.world.realm}</span>
              </div>
            )}
            {tab === "garment" && product.specifications?.details && (
              <p className="drop-object-fineprint">
                {product.specifications.details}
              </p>
            )}
          </div>

          <div className="drop-object-stats" aria-label="Object summary">
            <div>
              <b>01</b>
              <span>DTG BACK PRINT</span>
            </div>
            <div>
              <b>{String(product.sizes.length).padStart(2, "0")}</b>
              <span>SIZES</span>
            </div>
            <div>
              <b>{String(colorways.length).padStart(2, "0")}</b>
              <span>COLOURWAYS</span>
            </div>
            <div>
              <b>02</b>
              <span>CHEST MARKS</span>
            </div>
          </div>

          <div className="drop-object-loadout">
            <p>
              <span>LOADOUT</span>
              <b>
                {selectedColor.name.toUpperCase()} / {selectedSize}
              </b>
            </p>
            <div
              className="drop-object-swatches"
              role="group"
              aria-label="Choose a colourway"
            >
              {colorways.map((colour, colourIndex) => (
                <button
                  key={colour.name}
                  type="button"
                  aria-label={`Select ${colour.name} colourway`}
                  aria-pressed={colourIndex === colorIndex}
                  title={colour.name}
                  style={{ background: colour.value }}
                  onClick={() => onColorChange(colourIndex)}
                />
              ))}
            </div>
            <div
              className="drop-object-sizes"
              role="group"
              aria-label="Choose a size"
            >
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-label={`Select size ${size}`}
                  aria-pressed={size === selectedSize}
                  onClick={() => onSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="drop-object-actions">
            <button
              type="button"
              className="drop-object-equip"
              disabled={soldOut}
              onClick={onEquip}
            >
              {soldOut
                ? "SOLD OUT IN THIS VARIANT"
                : `EQUIP · ${formatCurrency(product.price, product.currency)}`}{" "}
              <span aria-hidden="true">↗</span>
            </button>
            <Link
              to={`/products/${product.slug}`}
              className="drop-object-detail"
            >
              OPEN FULL DOSSIER ↗
            </Link>
          </div>
        </div>

        <div
          className="drop-object-stage"
          aria-label={`${piece.name} interactive 3D object`}
        >
          <div className="drop-object-reticle" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="drop-object-ring" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="drop-object-artcard" aria-hidden="true">
            <img
              src={piece.artwork}
              alt=""
              width={957}
              height={452}
              loading="lazy"
              decoding="async"
            />
            <span>{piece.world.name}</span>
          </div>
          <Suspense
            fallback={
              <img
                className="drop-object-poster"
                src={piece.photo ?? piece.artwork}
                alt={`${piece.name} garment preview`}
              />
            }
          >
            <HoodieViewer
              color={selectedColor.value}
              label={piece.name}
              artworkUrl={piece.artwork}
              scrollYaw={scrollYaw}
              fallbackUrl={piece.photo ?? piece.artwork}
            />
          </Suspense>
          <div className="drop-object-readout" aria-hidden="true">
            <span>
              ROTATION{" "}
              <b>{String(Math.round(progress * 360)).padStart(3, "0")}°</b>
            </span>
            <span>NODE / {piece.signal}</span>
          </div>
        </div>

        <div className="drop-object-progress" aria-hidden="true">
          <span>{phase.note}</span>
          <i>
            <b />
          </i>
          <span>{percentage} / 100</span>
        </div>
      </div>
    </section>
  );
}
