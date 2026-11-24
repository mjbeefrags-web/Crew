import { useMemo, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { frequenciesForPiece, psychedelicPieces } from '../data/psychedelic';

/**
 * A garment is never treated as a thumbnail here: each one unlocks a named
 * world with its own palette, sigil, artwork plate and language. Selecting a
 * world changes the entire panel, and the URL keeps that choice shareable.
 */
export function ConceptWorlds() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = useMemo(() => {
    const requested = searchParams.get('world') ?? searchParams.get('piece');
    const index = psychedelicPieces.findIndex((item) => item.id === requested);
    return index >= 0 ? index : 0;
  }, [searchParams]);
  const piece = psychedelicPieces[active];
  const frequency = frequenciesForPiece(piece)[0];
  const style = {
    '--world-a': frequency.a,
    '--world-b': frequency.b,
    '--world-c': frequency.c,
    '--world-accent': piece.accent,
    '--world-art': `url(${piece.artwork})`,
  } as CSSProperties;

  const choose = (index: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('world', psychedelicPieces[index].id);
    setSearchParams(next, { replace: true });
  };

  return (
    <section className="concept-worlds" data-reveal aria-labelledby="concept-worlds-title" style={style}>
      <div className="concept-worlds-heading">
        <div>
          <p className="store-eyebrow">CONCEPT 02 / FIVE WORLDS IN ONE WARDROBE</p>
          <h2 id="concept-worlds-title">One hoodie.<br /><em>A whole other world.</em></h2>
        </div>
        <p>Every print is a portal. Pick a concept to see the world it lives in, then step inside it.</p>
      </div>

      <div className="concept-worlds-body">
        <nav className="concept-world-list" aria-label="Choose a garment world">
          {psychedelicPieces.map((item, index) => <button
            key={item.id}
            type="button"
            className={index === active ? 'is-active' : ''}
            aria-current={index === active}
            onClick={() => choose(index)}
            style={{ '--item-accent': item.accent, '--item-art': `url(${item.artwork})` } as CSSProperties}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <i aria-hidden="true">{item.world.glyph}</i>
            <b>{item.world.name}</b>
            <small>{item.signal} / {item.name}</small>
          </button>)}
        </nav>

        <div className="concept-world-stage" key={piece.id}>
          <div className="concept-world-art" aria-hidden="true"><img src={piece.artwork} alt="" loading="lazy" /></div>
          <span className="concept-world-sigil" aria-hidden="true">{piece.world.glyph}</span>
          <div className="concept-world-orbit" aria-hidden="true"><i /><i /><i /></div>
          <img className="concept-world-garment" src={piece.photo ?? piece.artwork} alt={`${piece.name} hoodie`} loading="lazy" />
          <div className="concept-world-copy">
            <p className="concept-world-kicker">WORLD {String(active + 1).padStart(2, '0')} / {piece.signal}</p>
            <h3>{piece.world.name}</h3>
            <p className="concept-world-realm">{piece.world.realm}</p>
            <p className="concept-world-line">“{piece.line}”</p>
            <Link to={`/drops/psychedelic-minds?piece=${piece.id}&entered=1&mood=ACID`}>ENTER THIS WORLD ↗</Link>
          </div>
          <span className="concept-world-plate-tag">{piece.photoApproved ? 'APPROVED PRODUCT PHOTO' : 'CONCEPT GARMENT STUDY'} / DTG ARTWORK</span>
        </div>
      </div>
    </section>
  );
}
