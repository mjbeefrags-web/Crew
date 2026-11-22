type BrandMarkProps = {
  inverse?: boolean;
};

export function BrandMark({ inverse = false }: BrandMarkProps) {
  return (
    <span className={`brand-mark ${inverse ? 'brand-mark-inverse' : ''}`}>
      <span className="brand-symbol crewww-symbol" aria-hidden="true">C</span>
      <span className="brand-word">CREWWW</span>
    </span>
  );
}
