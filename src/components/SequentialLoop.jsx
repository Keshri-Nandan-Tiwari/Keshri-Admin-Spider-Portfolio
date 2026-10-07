import { useEffect, useState } from "react";

const TYPE_SPEED = 45;
const HOLD_MS = 900;
const ERASE_SPEED = 26;
const GAP_MS = 300;

/**
 * Cycles through `items`, typing each one out letter by letter.
 * Every item types in normal white text — except the last item in the
 * list, which lands big and in the theme's highlight color. Then it loops.
 */
export default function SequentialLoop({ items, className = "" }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("typing"); // typing | holding | erasing | gap

  const isLast = index === items.length - 1;
  const full = items[index];

  useEffect(() => {
    let t;
    if (phase === "typing") {
      if (text.length < full.length) {
        t = setTimeout(() => setText(full.slice(0, text.length + 1)), TYPE_SPEED);
      } else {
        t = setTimeout(() => setPhase("holding"), HOLD_MS);
      }
    } else if (phase === "holding") {
      t = setTimeout(() => setPhase("erasing"), 10);
    } else if (phase === "erasing") {
      if (text.length > 0) {
        t = setTimeout(() => setText(text.slice(0, -1)), ERASE_SPEED);
      } else {
        t = setTimeout(() => setPhase("gap"), GAP_MS);
      }
    } else if (phase === "gap") {
      setIndex((i) => (i + 1) % items.length);
      setPhase("typing");
    }
    return () => clearTimeout(t);
  }, [phase, text, full, items.length]);

  return (
    <div className={`seq-loop-stage ${className}`}>
      <div className={isLast ? "seq-big" : "seq-normal"}>
        {text}
        <span className="seq-cursor" />
      </div>
    </div>
  );
}
