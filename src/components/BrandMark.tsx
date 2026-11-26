type BrandMarkProps = {
  inverse?: boolean;
};

/**
 * The approved CREWWW logo plate, used as a CSS mask so its fill can follow the
 * psychedelic palette without shipping a separate image per colourway.
 */
export function BrandMark({ inverse = false }: BrandMarkProps) {
  return (
    <span
      className={`brand-mark ${inverse ? "brand-mark-inverse" : ""}`}
      role="img"
      aria-label="Crewww"
    >
      <span className="brand-logo" aria-hidden="true" />
    </span>
  );
}
