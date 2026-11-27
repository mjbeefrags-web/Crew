import { useEffect, useMemo, useState } from "react";

/**
 * Word-by-word verse reveal in the spirit of Cartier's "Into the Wild":
 * each word settles from blur to focus as the room's line plays out.
 * Reduced-motion visitors receive the whole line immediately.
 */
export function ScrollVerse({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    setVisible(reduceMotion ? words.length : 0);
    if (reduceMotion) return undefined;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(index);
      if (index >= words.length) window.clearInterval(timer);
    }, 180);
    return () => window.clearInterval(timer);
  }, [text, words.length, reduceMotion]);

  return (
    <p className={`verse ${className}`.trim()}>
      <span className="verse-sr">{text}</span>
      <span aria-hidden="true" className="verse-words">
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className={
              index < visible - 1
                ? "verse-word is-past"
                : index === visible - 1
                  ? "verse-word is-current"
                  : "verse-word is-upcoming"
            }
          >
            {word}
          </span>
        ))}
      </span>
    </p>
  );
}
