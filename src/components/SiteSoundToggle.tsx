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
    window.dispatchEvent(
      new CustomEvent("crewww:sound-change", { detail: { enabled: next } }),
    );
    if (next) {
      playSound("select");
      trackEvent("sound_opt_in");
    } else stopAmbience();
  };

  return (
    <button
      type="button"
      data-sound-toggle
      aria-label={`Sound ${enabled ? "on" : "off"}`}
      aria-pressed={enabled}
      onClick={toggle}
    >
      <svg
        className={`sound-waveform${enabled ? " is-on" : ""}`}
        width="20"
        height="12"
        viewBox="0 0 20 12"
        fill="none"
        aria-hidden="true"
      >
        {[4, 8, 6, 10].map((height, index) => (
          <rect
            key={index}
            x={1 + index * 5}
            width="2"
            height={height}
            y={6 - height / 2}
            rx={0.8}
          />
        ))}
      </svg>
      <span>{enabled ? "SOUND ON" : "SOUND OFF"}</span>
    </button>
  );
}
