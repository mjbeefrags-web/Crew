import { useState } from 'react';
import { recommendSize, type FitPreference } from '../domain/fit';
import { trackEvent } from '../lib/insights';

type Props = {
  sizes: readonly string[];
  fit?: string;
  wash?: string;
  ageBand?: string;
  productSlug: string;
  selected: string;
  onPick: (size: string) => void;
};

const PREFERENCES: { value: FitPreference; label: string }[] = [
  { value: 'snug', label: 'CLOSER' },
  { value: 'true', label: 'USUAL' },
  { value: 'roomy', label: 'ROOMIER' },
];

/** Provisional fit guidance that feeds both the PDP and the owner's fit-check signal. */
export function FitFinder({ sizes, fit, wash, ageBand, productSlug, selected, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<FitPreference>('true');
  const [chest, setChest] = useState(98);
  const recommendation = recommendSize(sizes, chest, preference, fit);

  return <div className="fit-finder">
    <button className="fit-finder-toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? 'CLOSE FIT CHECK' : 'FIND MY SIZE / FIT CHECK'} ↗
    </button>
    {open && <div className="fit-finder-panel">
      <fieldset>
        <legend>HOW DOES YOUR USUAL LAYER FIT?</legend>
        <div className="fit-finder-preferences">
          {PREFERENCES.map((item) => <button key={item.value} type="button" aria-pressed={preference === item.value} onClick={() => setPreference(item.value)}>{item.label}</button>)}
        </div>
      </fieldset>
      <label className="fit-finder-measure">
        <span>CHEST MEASUREMENT / CM</span>
        <input aria-label="Chest measurement in centimetres" type="range" min={70} max={140} step={1} value={chest} onChange={(event) => setChest(Number(event.target.value))} />
        <output>{chest} CM</output>
      </label>
      {recommendation && <div className="fit-finder-result" aria-live="polite">
        <p className="store-eyebrow">{recommendation.confidence === 'guided' ? 'GUIDED MATCH' : 'PROVISIONAL MATCH'}</p>
        <strong>{recommendation.size}</strong>
        <p>{recommendation.rationale}</p>
        {wash && <small>WASH / {wash}</small>}
        {ageBand && <small>AGE / {ageBand}</small>}
        <button type="button" disabled={selected === recommendation.size} onClick={() => {
          onPick(recommendation.size);
          trackEvent('fit_check', { productSlug, query: preference });
        }}>{selected === recommendation.size ? `${recommendation.size} SELECTED` : `USE SIZE ${recommendation.size} ↗`}</button>
      </div>}
      <p className="fit-finder-disclaimer">Illustrative guidance only. Final Crewww measurements and fit must be confirmed against a production sample.</p>
    </div>}
  </div>;
}
