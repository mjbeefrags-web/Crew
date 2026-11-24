type BrandMarkProps = {
  inverse?: boolean;
};

/** The approved CREWWW logo plate, tinted for dark surfaces via CSS. */
export function BrandMark({ inverse = false }: BrandMarkProps) {
  return (
    <span
      className={`brand-mark ${inverse ? "brand-mark-inverse" : ""}`}
      role="img"
      aria-label="Crewww"
    >
      <img
        className="brand-logo"
        src="/images/brand/logo-light.png"
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}
