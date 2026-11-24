import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import {
  frequenciesForPiece,
  psychedelicFrontViews,
  psychedelicPieces,
} from '../data/psychedelic';
import { psychedelicProducts } from '../data/psychedelicProducts';
import { dropColorways } from '../data/drops';
import { useCommerceStore } from '../state/commerceStore';
import { useUiStore } from '../state/uiStore';
import { trackEvent } from '../lib/insights';
import { isSoundEnabled, playSound, setSoundEnabled, startAmbience, stopAmbience } from '../lib/sound';

const PsychedelicField = lazy(() => import('../scenes/PsychedelicField').then((module) => ({ default: module.PsychedelicField })));
const DropObjectStage = lazy(() => import('../components/DropObjectStage').then((module) => ({ default: module.DropObjectStage })));

/**
 * Concept 02 — not a product page but a room you enter. Every hoodie owns a
 * named world: artwork, palette, sigil, language, camera and canonical product.
 * The URL is the source of truth so a chosen world, view, colour and size can
 * be shared or reopened without resetting the experience.
 */
export function PsychedelicDropPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = useMemo(() => {
    const requested = searchParams.get('piece');
    const index = psychedelicPieces.findIndex((item) => item.id === requested);
    return index >= 0 ? index : 0;
  }, [searchParams]);
  const piece = psychedelicPieces[active];
  const product = psychedelicProducts[active];
  const frequencies = useMemo(() => frequenciesForPiece(piece), [piece]);
  const moodIndex = useMemo(() => {
    const requested = searchParams.get('mood');
    const index = frequencies.findIndex((item) => item.name.toLowerCase() === requested?.toLowerCase());
    return index >= 0 ? index : 0;
  }, [frequencies, searchParams]);
  const mood = frequencies[moodIndex];

  const views = useMemo(() => [
    {
      src: piece.photo ?? piece.artwork,
      label: piece.photoApproved ? 'APPROVED PRODUCT PHOTO' : piece.photo ? 'CONCEPT GARMENT STUDY' : 'DTG PRINT PLATE',
    },
    { src: piece.artwork, label: 'DTG ARTWORK PLATE' },
    ...piece.angles.map((src, index) => ({ src, label: `ALTERNATE VIEW ${String.fromCharCode(65 + index)}` })),
    ...psychedelicFrontViews.map((src, index) => ({ src, label: index === 0 ? 'FRONT / CHEST MARK RIGHT' : 'FRONT / CHEST MARK LEFT' })),
  ], [piece]);
  const viewIndex = useMemo(() => {
    const requested = Number(searchParams.get('view') ?? 0);
    return Number.isFinite(requested) ? Math.max(0, Math.min(views.length - 1, Math.floor(requested))) : 0;
  }, [searchParams, views.length]);
  const view = views[viewIndex] ?? views[0];

  const colorIndex = useMemo(() => {
    const requested = searchParams.get('colour');
    const index = dropColorways.findIndex((item) => item.name.toLowerCase() === requested?.toLowerCase());
    return index >= 0 ? index : Math.max(0, dropColorways.findIndex((item) => item.name === product.color));
  }, [product.color, searchParams]);
  const sizeIndex = useMemo(() => {
    const requested = searchParams.get('size');
    const index = product.sizes.findIndex((item) => item === requested);
    return index >= 0 ? index : Math.max(0, product.sizes.findIndex((item) => item === 'M'));
  }, [product.sizes, searchParams]);
  const selectedColor = dropColorways[colorIndex] ?? dropColorways[0];
  const selectedSize = product.sizes[sizeIndex] ?? product.sizes[0] ?? 'M';
  const selectedVariant = product.variants?.find((variant) => variant.color === selectedColor.name && variant.size === selectedSize);
  const soldOut = selectedVariant ? selectedVariant.stockQuantity <= 0 : false;
  const entered = searchParams.get('entered') === '1';

  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [zoom, setZoom] = useState(1);
  const stageRef = useRef<HTMLElement | null>(null);
  const addCartLine = useCommerceStore((state) => state.addCartLine);
  const showNotice = useUiStore((state) => state.showNotice);

  const setParam = (key: string, value: string | null, push = false) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: !push });
  };

  const worldStyle = {
    '--trip-accent': piece.accent,
    '--world-a': mood.a,
    '--world-b': mood.b,
    '--world-c': mood.c,
    '--world-art': `url(${piece.artwork})`,
  } as CSSProperties;

  useEffect(() => {
    trackEvent('drop_view', { dropSlug: `psychedelic-minds/${piece.id}`, query: piece.world.name });
  }, [piece.id, piece.world.name]);

  useEffect(() => {
    const onScroll = () => {
      const element = stageRef.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / (window.innerHeight + bounds.height)));
      setZoom(1 + progress * 0.42);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [entered]);

  const choose = (index: number) => {
    const next = (index + psychedelicPieces.length) % psychedelicPieces.length;
    const chosen = psychedelicPieces[next];
    const chosenProduct = psychedelicProducts[next];
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('piece', chosen.id);
    nextParams.set('entered', '1');
    nextParams.set('mood', frequenciesForPiece(chosen)[0].name);
    nextParams.set('view', '0');
    nextParams.set('colour', chosenProduct.color);
    nextParams.set('size', chosenProduct.sizes.find((item) => item === 'M') ?? chosenProduct.sizes[0]);
    setSearchParams(nextParams);
    playSound('portal');
  };

  useEffect(() => {
    if (!entered) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); choose(active + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); choose(active - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) { startAmbience(); playSound('unlock'); } else stopAmbience();
  };

  const equip = () => {
    if (soldOut) return;
    addCartLine({ productId: product.id, size: selectedSize, color: selectedColor.name, quantity: 1 });
    trackEvent('drop_add', { dropSlug: `psychedelic-minds/${piece.id}`, productSlug: product.slug, query: `${selectedColor.name}/${selectedSize}` });
    playSound('select');
    showNotice(`${product.name} · ${selectedColor.name} · ${selectedSize} added to your bag.`);
  };

  const onRoomPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5;
    const y = (event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5;
    event.currentTarget.style.setProperty('--eye-x', `${x * 20}px`);
    event.currentTarget.style.setProperty('--eye-y', `${y * 12}px`);
    event.currentTarget.style.setProperty('--field-x', `${(x + 0.5) * 100}%`);
    event.currentTarget.style.setProperty('--field-y', `${(y + 0.5) * 100}%`);
  };

  const onGarmentPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5;
    const y = (event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5;
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 11}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${x * 15}deg`);
    event.currentTarget.style.setProperty('--sheen-x', `${(x + 0.5) * 100}%`);
  };

  const resetGarment = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--tilt-x', '0deg');
    event.currentTarget.style.setProperty('--tilt-y', '-4deg');
    event.currentTarget.style.setProperty('--sheen-x', '50%');
  };

  return <div
    className={`psychedelic-drop${entered ? ' has-entered' : ''}`}
    style={worldStyle}
    onPointerMove={onRoomPointerMove}
  >
    <div className="psychedelic-backdrop">
      <Suspense fallback={<div className="psychedelic-fallback" />}>
        <PsychedelicField mood={mood} energy={entered ? 1 : 0.45} accent={piece.accent} />
      </Suspense>
      <div className="trip-art-collage" aria-hidden="true">
        {psychedelicPieces.map((item, index) => <img
          key={item.id}
          src={item.artwork}
          alt=""
          className={index === active ? 'is-active' : ''}
          style={{ '--art-index': index } as CSSProperties}
        />)}
      </div>
      <div className="psychedelic-eyes" aria-hidden="true">
        <span className="psychedelic-eye"><i /><b /></span>
        <span className="psychedelic-eye"><i /><b /></span>
      </div>
      <div className="psychedelic-field-glow" aria-hidden="true" />
      <div className="psychedelic-grain" aria-hidden="true" />
      <div className="psychedelic-vignette" aria-hidden="true" />
    </div>

    <header className="psychedelic-topbar">
      <Link to="/drops" className="psychedelic-exit" onClick={() => playSound('click')}>← BACK TO THE DROPS</Link>
      <p>CONCEPT 02 / <b>{piece.world.name}</b> / ROOM {String(active + 1).padStart(2, '0')}</p>
      <button type="button" onClick={toggleSound} aria-pressed={soundOn}>{soundOn ? 'SOUND ON ◖◗' : 'SOUND OFF ◖◗'}</button>
    </header>

    {!entered && <div className="psychedelic-gate">
      <Link to="/" className="psychedelic-brand" aria-label="Crewww home"><BrandMark /></Link>
      <p className="trip-eyebrow">FIVE HOODIES / FIVE WORLDS / ONE FREQUENCY</p>
      <h1>Put on the<br /><em>frequency.</em></h1>
      <p className="trip-lede">Each hoodie is a concept with a whole world inside it. Sound on if you want the room to breathe with you.</p>
      <button type="button" className="trip-enter" onClick={() => { setParam('entered', '1'); startAmbience(); playSound('unlock'); trackEvent('sound_opt_in', { query: 'psychedelic-drop' }); }}>ENTER THE ROOM ↗</button>
      <p className="trip-note">NO FLASHING LIGHTS · EASY ON THE EYES · ARROW KEYS TO MOVE BETWEEN WORLDS</p>
    </div>}

    {entered && <main className="psychedelic-journey">
      <section className="psychedelic-room" data-chapter="THE ROOM" ref={stageRef}>
      <section className="trip-copy" key={piece.id}>
        <p className="trip-world-kicker"><span aria-hidden="true">{piece.world.glyph}</span> WORLD / {piece.world.name}</p>
        <p className="trip-eyebrow"><span className="trip-pulse" /> SIGNAL / {piece.signal}</p>
        <h1>{piece.name.split(' ').map((word, index) => <span key={index}>{word}<br /></span>)}</h1>
        <p className="trip-line">“{piece.line}”</p>
        <p className="trip-lore">{piece.lore} <i>{piece.world.realm}.</i></p>
        <div className="trip-options">
          <div className="trip-option-row">
            <span>COLOUR / {selectedColor.name.toUpperCase()}</span>
            <div className="trip-color-grid" role="group" aria-label="Choose a colourway">
              {dropColorways.map((color, index) => <button key={color.name} type="button" aria-label={`Select ${color.name} colourway`} aria-pressed={colorIndex === index} title={color.name} style={{ background: color.value }} onClick={() => { setParam('colour', color.name); playSound('select'); }} />)}
            </div>
          </div>
          <div className="trip-option-row">
            <span>SIZE / {selectedSize}</span>
            <div className="trip-size-grid" role="group" aria-label="Choose a size">
              {product.sizes.map((size, index) => <button key={size} type="button" aria-label={`Select size ${size}`} aria-pressed={sizeIndex === index} onClick={() => { setParam('size', size); playSound('click'); }}>{size}</button>)}
            </div>
          </div>
          {selectedVariant && <p className="trip-stock">{soldOut ? 'SOLD OUT IN THIS VARIANT' : selectedVariant.stockQuantity <= 5 ? `ONLY ${selectedVariant.stockQuantity} LEFT` : `SKU ${selectedVariant.sku}`}</p>}
        </div>
        <div className="trip-actions">
          <button type="button" className="trip-bag" disabled={soldOut} onClick={equip}>ADD TO BAG · {product.price.toFixed(0)} ↗</button>
          <Link to={`/products/${product.slug}`} className="trip-detail">FULL DETAILS ↗</Link>
        </div>
      </section>

      <section
        className="trip-product"
        key={`${piece.id}-product`}
        aria-label={`${piece.name} hoodie`}
        style={{ '--zoom': zoom } as CSSProperties}
        onPointerMove={onGarmentPointerMove}
        onPointerLeave={resetGarment}
      >
        <div className="trip-art-plate" aria-hidden="true"><img src={piece.artwork} alt="" /></div>
        <div className="trip-world-sigil" aria-hidden="true">{piece.world.glyph}</div>
        <div className="trip-halo" aria-hidden="true" />
        <div className="trip-orbit" aria-hidden="true"><i /><i /><i /></div>
        <div className="trip-garment">
          <img src={view.src} alt={`${piece.name} — ${view.label.toLowerCase()}`} />
          <span className="trip-sheen" aria-hidden="true" />
        </div>
        <span className="trip-image-tag">
          <b>{piece.photoApproved ? 'APPROVED PRODUCT PHOTO' : 'CONCEPT GARMENT STUDY'}</b>
          {view.label}
        </span>
        <div className="trip-view-strip" role="group" aria-label="Choose a garment view">
          {views.map((item, index) => <button
            key={`${item.src}-${index}`}
            type="button"
            aria-label={item.label}
            aria-pressed={index === viewIndex}
            className={index === viewIndex ? 'is-active' : ''}
            onClick={() => { setParam('view', String(index)); playSound('click'); }}
          ><img src={item.src} alt="" loading="lazy" /><span>{String(index + 1).padStart(2, '0')}</span></button>)}
        </div>
      </section>

      <nav className="trip-picker" aria-label="Choose a garment world">
        {psychedelicPieces.map((item, index) => <button
          key={item.id}
          type="button"
          className={index === active ? 'is-active' : ''}
          onClick={() => choose(index)}
          aria-label={`${item.name} — ${item.world.name}`}
          aria-current={index === active}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>
          <em aria-hidden="true">{item.world.glyph}</em>
          <b>{item.world.name}</b>
          <small>{item.name}</small>
          <i style={{ background: item.accent }} />
        </button>)}
      </nav>

      <div className="trip-moods" aria-label="Room frequency">
        {frequencies.map((item, index) => <button
          key={item.name}
          type="button"
          onClick={() => { setParam('mood', item.name); playSound('portal'); trackEvent('drop_colorway', { dropSlug: 'psychedelic-minds', query: `${piece.id}/${item.name}` }); }}
          aria-pressed={index === moodIndex}
          aria-label={`${item.name} frequency`}
          title={`${item.name} frequency`}
          style={{ background: `linear-gradient(135deg,${item.a},${item.b},${item.c})` }}
        ><span>{item.name} frequency</span></button>)}
      </div>

      <div className="trip-dots" aria-hidden="true">{psychedelicPieces.map((item, index) => <button
        key={item.id}
        type="button"
        aria-label={`Enter world ${String(index + 1).padStart(2, '0')}`}
        aria-current={index === active}
        className={index === active ? 'is-active' : ''}
        onClick={() => choose(index)}
      />)}</div>
      <p className="trip-scroll-note">SCROLL TO ZOOM · ARROW KEYS TO CHANGE WORLD · HOVER THE GARMENT</p>
      </section>

      <Suspense fallback={<div className="drop-object-loading" role="status">PREPARING OBJECT…</div>}>
        <DropObjectStage
          piece={piece}
          product={product}
          index={active}
          colorways={dropColorways}
          colorIndex={colorIndex}
          sizeIndex={sizeIndex}
          soldOut={soldOut}
          onColorChange={(next) => { setParam('colour', dropColorways[next]?.name ?? null); playSound('select'); }}
          onSizeChange={(size) => { setParam('size', size); playSound('click'); }}
          onEquip={equip}
        />
      </Suspense>
    </main>}
  </div>;
}
