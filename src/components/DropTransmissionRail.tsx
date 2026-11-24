import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { drops } from '../data/drops';
import { psychedelicPieces } from '../data/psychedelic';

/** Five editorial drop cards on the landing page — a doorway into each world. */
export function DropTransmissionRail() {
  return (
    <section className="transmission-rail" data-reveal aria-labelledby="transmission-title">
      <div className="transmission-heading">
        <div>
          <p className="store-eyebrow">CONCEPT 02 / FIVE TRANSMISSIONS</p>
          <h2 id="transmission-title">Five states<br /><em>of mind.</em></h2>
        </div>
        <div>
          <p>Out of Focus. Life in Scroll. The Gift Theory. Lost in the Frequency. Outsourced Mind. Each one opens a different room.</p>
          <Link to="/drops/psychedelic-minds">ENTER THE WHOLE WORLD ↗</Link>
        </div>
      </div>
      <div className="transmission-track">
        {drops.map((drop, index) => {
          const piece = psychedelicPieces[index];
          return <Link
            key={drop.slug}
            to={`/drops/${drop.slug}`}
            className="transmission-card"
            data-reveal
            style={{
              '--card-image': `url(${piece?.photo ?? drop.plate})`,
              '--card-art': `url(${piece?.artwork ?? drop.plate})`,
              '--card-accent': piece?.accent ?? '#c9ef68',
              '--reveal-delay': `${index * 90}ms`,
            } as CSSProperties}
          >
            <span className="transmission-number">{drop.number}</span>
            <span className="transmission-signal">{drop.signal}</span>
            <span className="transmission-art" aria-hidden="true" />
            <span className="transmission-glyph" aria-hidden="true">{piece?.world.glyph}</span>
            <div className="transmission-copy">
              <p>DESIGN {String(index + 1).padStart(2, '0')} / {drop.signal}</p>
              <h3>{drop.name}</h3>
              <p className="transmission-world-name">{piece?.world.name}</p>
              <p>“{drop.line}”</p>
              <b>OPEN THE DROP ↗</b>
            </div>
          </Link>;
        })}
      </div>
    </section>
  );
}
