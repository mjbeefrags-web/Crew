import { useEffect, useState } from "react";
import {
  isSoundEnabled,
  playSound,
  setSoundEnabled,
  stopAmbience,
} from "../lib/sound";
import { trackEvent } from "../lib/insights";

/**
 * Opt-in site-wide blips. The drop chamber already sounds its own controls,
 * so interactive elements inside it are skipped to avoid double clicks.
 */
export function SiteSoundToggle() {
  const [enabled, setEnabled] = useState(() => isSoundEnabled());

  useEffect(() => {
    if (!enabled) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !target ||
        target.closest("[data-sound-toggle]") ||
        target.closest(".drop-experience")
      )
        return;
      if (target.closest("button, a, input, select")) playSound("click");
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [enabled]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
    window.dispatchEvent(new CustomEvent("crewww:sound-change", { detail: { enabled: next } }));
    if (next) {
      playSound("select");
      trackEvent("sound_opt_in");
    } else stopAmbience();
  };

  return (
    <button
      type="button"
      data-sound-toggle
      aria-label="Sound toggle"
      aria-pressed={enabled}
      onClick={toggle}
    >
      <svg
        className={`sound-waveform${enabled ? " is-on" : ""}`}
        width="18"
        height="10"
        viewBox="0 0 18 10"
        fill="none"
        aria-hidden="true"
      >
        {[1.5, 2.6, 1.8, 3.0, 2.3].map((height, index) => (
          <rect
            key={index}
            x={1 + index * 4}
            width="1.5"
            height={height}
            y={5 - height / 2}
            rx={0.3}
          />
        ))}
      </svg>
      <span>{enabled ? "SOUND ON" : "SOUND OFF"}</span>
    </button>
  );
}
