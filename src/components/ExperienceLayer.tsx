import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * The site-wide experience layer.
 *
 * One rAF-throttled scroll/pointer loop publishes the current scroll progress,
 * scroll velocity, pointer position and active chapter as CSS variables on the
 * document root. That lets plain CSS react to the visitor without every
 * component owning a listener. It also adds:
 *
 *  - a route curtain that wipes between pages,
 *  - a small cursor companion with contextual labels,
 *  - pointer tilt for any element marked `data-tilt`,
 *  - a scroll rail with the active chapter.
 *
 * Everything is progressive: reduced-motion visitors get the content with no
 * transitions, and touch devices never see the cursor companion.
 */

const CHAPTER_LABELS: Array<[RegExp, string]> = [
  [/^\/drops\/psychedelic-minds/, 'THE ROOM'],
  [/^\/drops/, 'THE DROP'],
  [/^\/products/, 'THE OBJECT'],
  [/^\/lookbook|^\/looks/, 'THE STORY'],
  [/^\/about/, 'THE STORY'],
  [/^\/cart|^\/checkout|^\/order-confirmation/, 'THE BAG'],
  [/^\/account|^\/login|^\/register|^\/forgot-password|^\/wishlist/, 'YOUR CREWWW'],
  [/^\/search/, 'THE SEARCH'],
  [/^\/admin/, 'THE CONSOLE'],
  [/^\/design-system/, 'THE SYSTEM'],
];

function routeLabel(pathname: string): string {
  if (pathname === '/') return 'THE BLOCK';
  return CHAPTER_LABELS.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'THE EDIT';
}

function scrollToHash(hash: string) {
  if (!hash) return;
  const target = document.getElementById(hash.replace('#', ''));
  target?.scrollIntoView({ behavior: 'auto', block: 'start' });
}

export function ExperienceLayer() {
  const location = useLocation();
  const [chapter, setChapter] = useState(() => routeLabel(location.pathname));
  const [curtain, setCurtain] = useState<{ id: number; label: string } | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const countRef = useRef<HTMLSpanElement | null>(null);
  const chapterRef = useRef(chapter);
  const firstPath = useRef(location.pathname);
  const firstRender = useRef(true);

  chapterRef.current = chapter;

  // Scroll state, pointer state, tilt and chapter detection.
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let scrollFrame = 0;
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();
    let velocity = 0;
    let tiltElement: HTMLElement | null = null;
    let tiltRect: DOMRect | null = null;
    let lastHover = '';
    let lastLabel = '';
    let pointerSeen = false;
    let chapterAt = 0;

    const clearTilt = () => {
      if (!tiltElement) return;
      tiltElement.classList.remove('is-tilting');
      tiltElement.style.removeProperty('--xp-rx');
      tiltElement.style.removeProperty('--xp-ry');
      tiltElement.style.removeProperty('--xp-lift');
      tiltElement = null;
      tiltRect = null;
    };

    const applyChapter = (next: string) => {
      if (!next || next === chapterRef.current) return;
      chapterRef.current = next;
      setChapter(next);
    };

    const findChapter = (): string => {
      const sections = document.querySelectorAll<HTMLElement>('[data-chapter]');
      if (!sections.length) return routeLabel(location.pathname);
      const line = window.innerHeight * 0.42;
      let current = '';
      sections.forEach((section) => {
        const bounds = section.getBoundingClientRect();
        if (bounds.top <= line && bounds.bottom > line) current = section.dataset.chapter ?? '';
        else if (bounds.top <= line) current = section.dataset.chapter ?? current;
      });
      return current || routeLabel(location.pathname);
    };

    let disposed = false;
    let lastProgress = -1;
    let lastVelocity = -2;

    const updateScroll = () => {
      scrollFrame = 0;
      if (disposed || document.visibilityState === 'hidden') return;
      const y = window.scrollY;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, y / max));
      const now = performance.now();
      const delta = Math.max(16, now - lastScrollTime);
      velocity = Math.max(-1, Math.min(1, ((y - lastScrollY) / delta) * 0.9));
      lastScrollY = y;
      lastScrollTime = now;

      if (progress !== lastProgress) {
        root.style.setProperty('--xp-progress', progress.toFixed(4));
        lastProgress = progress;
      }
      if (velocity !== lastVelocity) {
        root.style.setProperty('--xp-velocity', velocity.toFixed(3));
        lastVelocity = velocity;
      }
      if (root.style.getPropertyValue('--xp-y').replace(/px$/, '') !== String(Math.round(y))) root.style.setProperty('--xp-y', `${Math.round(y)}px`);
      const percent = String(Math.round(progress * 100)).padStart(3, '0');
      if (countRef.current && countRef.current.textContent !== percent) countRef.current.textContent = percent;
      // Throttle chapter detection; quadratic signal: dense reading moves fast.
      if (now - chapterAt >= (Math.abs(velocity) > 0.35 ? 200 : 500)) {
        chapterAt = now;
        applyChapter(findChapter());
      }
    };

    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(updateScroll);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const target = event.target instanceof Element ? event.target : null;
      pointerSeen = true;

      root.dataset.xpPointer = 'on';
      root.style.setProperty('--xp-cx', `${event.clientX}px`);
      root.style.setProperty('--xp-cy', `${event.clientY}px`);
      root.style.setProperty('--xp-px', ((event.clientX / window.innerWidth) - 0.5).toFixed(3));
      root.style.setProperty('--xp-py', ((event.clientY / window.innerHeight) - 0.5).toFixed(3));

      const interactive = target?.closest('a, button, [role="button"], input, select, textarea, label, [data-cursor]');
      const hover = interactive ? 'on' : 'off';
      if (hover !== lastHover) { root.dataset.xpHover = hover; lastHover = hover; }

      const labelTarget = target?.closest<HTMLElement>('[data-cursor]');
      const label = labelTarget?.dataset.cursor ?? '';
      if (label !== lastLabel) {
        lastLabel = label;
        root.dataset.xpLabel = label ? 'on' : 'off';
        if (labelRef.current) labelRef.current.textContent = label;
      }

      if (reduceMotion) return;
      const nextTilt = target?.closest<HTMLElement>('[data-tilt]') ?? null;
      if (nextTilt !== tiltElement) {
        clearTilt();
        if (nextTilt) {
          tiltElement = nextTilt;
          tiltRect = nextTilt.getBoundingClientRect();
          nextTilt.classList.add('is-tilting');
        }
      }
      if (!tiltElement || !tiltRect) return;
      const x = (event.clientX - tiltRect.left) / Math.max(1, tiltRect.width) - 0.5;
      const y = (event.clientY - tiltRect.top) / Math.max(1, tiltRect.height) - 0.5;
      tiltElement.style.setProperty('--xp-ry', `${(x * 7).toFixed(2)}deg`);
      tiltElement.style.setProperty('--xp-rx', `${(-y * 7).toFixed(2)}deg`);
      tiltElement.style.setProperty('--xp-lift', '-4px');
    };

    const onPointerLeave = () => {
      root.dataset.xpPointer = 'off';
      root.dataset.xpHover = 'off';
      root.dataset.xpLabel = 'off';
      lastHover = '';
      lastLabel = '';
      clearTilt();
    };

    const onPointerDown = () => {
      if (!pointerSeen) return;
      cursorRef.current?.classList.add('is-pressed');
    };
    const onPointerUp = () => cursorRef.current?.classList.remove('is-pressed');

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    updateScroll();

    return () => {
      disposed = true;
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      clearTilt();
    };
  }, [location.pathname]);

  // Page-to-page transition and scroll position.
  useEffect(() => {
    const pathChanged = firstPath.current !== location.pathname;
    firstPath.current = location.pathname;

    if (!pathChanged && firstRender.current) {
      if (location.hash) scrollToHash(location.hash);
      firstRender.current = false;
      return undefined;
    }
    firstRender.current = false;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (!pathChanged) {
      if (location.hash) scrollToHash(location.hash);
      return undefined;
    }

    if (location.hash) window.requestAnimationFrame(() => scrollToHash(location.hash));
    else window.scrollTo({ top: 0, behavior: 'auto' });

    if (reduceMotion) return undefined;

    setChapter(routeLabel(location.pathname));
    const id = Date.now();
    setCurtain({ id, label: routeLabel(location.pathname) });
    const timer = window.setTimeout(() => setCurtain((current) => (current?.id === id ? null : current)), 820);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return <>
    <aside className="xp-hud" aria-hidden="true">
      <span className="xp-hud-count" ref={countRef}>000</span>
      <span className="xp-hud-rail"><i /></span>
      <span className="xp-hud-chapter">{chapter}</span>
    </aside>
    <div className="xp-cursor" ref={cursorRef} aria-hidden="true"><i /></div>
    <div className="xp-label" ref={labelRef} aria-hidden="true" />
    {curtain && <div className="xp-curtain" key={curtain.id} aria-hidden="true">
      <div className="xp-curtain-mark"><span>CREWWW</span><i /></div>
      <b>{curtain.label}</b>
      <span className="xp-curtain-meta">SIGNAL THROUGH / 001</span>
    </div>}
  </>;
}
