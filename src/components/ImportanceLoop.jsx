import { useEffect, useState } from "react";

const TYPE_SPEED = 42;
const HOLD_MS = 950;
const ERASE_SPEED = 24;
const GAP_MS = 280;

export default function ImportanceLoop({ items }) {
  const [index, setIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [phase, setPhase] = useState("typing"); // typing | holding | erasing | gap

  const current = items[index];
  const combined = `${current.lead} ${current.highlight}`;
  const leadLen = current.lead.length + 1; // includes the trailing space

  useEffect(() => {
    let t;
    if (phase === "typing") {
      if (charCount < combined.length) {
        t = setTimeout(() => setCharCount((c) => c + 1), TYPE_SPEED);
      } else {
        t = setTimeout(() => setPhase("holding"), HOLD_MS);
      }
    } else if (phase === "holding") {
      t = setTimeout(() => setPhase("erasing"), 10);
    } else if (phase === "erasing") {
      if (charCount > 0) {
        t = setTimeout(() => setCharCount((c) => c - 1), ERASE_SPEED);
      } else {
        t = setTimeout(() => setPhase("gap"), GAP_MS);
      }
    } else if (phase === "gap") {
      setIndex((i) => (i + 1) % items.length);
      setPhase("typing");
    }
    return () => clearTimeout(t);
  }, [phase, charCount, combined]);

  const typedLead = combined.slice(0, Math.min(charCount, leadLen));
  const typedHighlight = combined.slice(leadLen, charCount);

  return (
    <div className="importance-loop-stage">
      <div className="importance-line">
        <span className="importance-lead">{typedLead}</span>
        <span className={`importance-highlight tone-${current.tone}`}>{typedHighlight}</span>
        <span className="seq-cursor" />
      </div>
    </div>
  );
}
