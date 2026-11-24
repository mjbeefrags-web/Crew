/**
 * Tiny synthesised sound layer for the drop experience.
 *
 * No audio files, no autoplay: every sound starts from a user gesture and
 * is muted by default. The palette is deliberately short and percussive —
 * fairground blips, a low room hum, and a filter-swept portal whoosh.
 */

let context: AudioContext | null = null;
let ambience: {
  oscillator: OscillatorNode;
  sub: OscillatorNode;
  gain: GainNode;
} | null = null;
let enabled = false;

type SoundKind = "click" | "select" | "portal" | "unlock" | "deny";

function getContext(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  const Constructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Constructor) return null;
  if (!context) context = new Constructor();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
  if (!next) stopAmbience();
}

export function isSoundEnabled() {
  return enabled;
}

export function playSound(kind: SoundKind = "click") {
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;
  const gain = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 6;
  filter.connect(gain);
  gain.connect(audio.destination);

  const settings: Record<
    SoundKind,
    {
      from: number;
      to: number;
      duration: number;
      cutoff: number;
      volume: number;
      type: OscillatorType;
    }
  > = {
    click: {
      from: 620,
      to: 310,
      duration: 0.09,
      cutoff: 2400,
      volume: 0.06,
      type: "square",
    },
    select: {
      from: 330,
      to: 660,
      duration: 0.16,
      cutoff: 3200,
      volume: 0.07,
      type: "triangle",
    },
    portal: {
      from: 90,
      to: 780,
      duration: 0.7,
      cutoff: 1800,
      volume: 0.11,
      type: "sawtooth",
    },
    unlock: {
      from: 440,
      to: 1320,
      duration: 0.42,
      cutoff: 5200,
      volume: 0.08,
      type: "triangle",
    },
    deny: {
      from: 180,
      to: 110,
      duration: 0.18,
      cutoff: 900,
      volume: 0.06,
      type: "square",
    },
  };
  const config = settings[kind];
  const oscillator = audio.createOscillator();
  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.from, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(30, config.to),
    now + config.duration,
  );
  filter.frequency.setValueAtTime(config.cutoff, now);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(200, config.cutoff * 0.35),
    now + config.duration,
  );
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(config.volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
  oscillator.connect(filter);
  oscillator.start(now);
  oscillator.stop(now + config.duration + 0.02);
}

export function startAmbience() {
  const audio = getContext();
  if (!audio || ambience) return;
  const gain = audio.createGain();
  gain.gain.value = 0.012;
  gain.connect(audio.destination);
  const oscillator = audio.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = 55;
  const sub = audio.createOscillator();
  sub.type = "sine";
  sub.frequency.value = 82.5;
  oscillator.connect(gain);
  sub.connect(gain);
  oscillator.start();
  sub.start();
  ambience = { oscillator, sub, gain };
}

export function stopAmbience() {
  if (!ambience) return;
  ambience.oscillator.stop();
  ambience.sub.stop();
  ambience.gain.disconnect();
  ambience = null;
}
