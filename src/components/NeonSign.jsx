import { useEffect, useMemo, useRef, useState } from "react";
import { NEON_GLYPHS, NEON_VIEWBOX } from "../data/neonPath";

// green -> red -> white -> blue -> back to green, forever
const COLORS = ["#00ff9c", "#ff2d55", "#f2f2f2", "#3d8bff"];

const WRITE_MS = 6500; // the invisible pen traveling the whole phrase
const HOLD_MS = 5000; // fully lit, exactly 5 seconds
const ERASE_MS = 5000; // the same path, backwards
const WAIT_MS = 1000; // dark

const PEN_WIDTH = 54; // reveal-stroke width (wider than any letter stroke)

export default function NeonSign() {
  // One entry per letter; each letter keeps ALL its contours together so
  // counters (the holes in D, e, o, p, a, d) stay open.
  const letters = useMemo(
    () => NEON_GLYPHS.map((d) => ({ d, contours: d.split(/(?=M)/).filter(Boolean) })),
    []
  );
  const flat = useMemo(() => letters.flatMap((l, li) => l.contours.map((c) => ({ c, li }))), [letters]);
  const revealRefs = useRef([]);
  const lengths = useRef([]);
  const [colorIndex, setColorIndex] = useState(0);
  const progress = useRef(0);

  // Measure every contour once, then arm its dash so nothing is visible.
  useEffect(() => {
    lengths.current = revealRefs.current.map((el) => (el ? el.getTotalLength() : 0));
    revealRefs.current.forEach((el, i) => {
      if (!el) return;
      const len = lengths.current[i];
      el.style.strokeDasharray = `${len} ${len}`;
      el.style.strokeDashoffset = `${len}`;
    });
  }, []);

  const apply = (p) => {
    const lens = lengths.current;
    const total = lens.reduce((a, b) => a + b, 0);
    let travelled = p * total;
    lens.forEach((len, i) => {
      const el = revealRefs.current[i];
      if (!el || !len) return;
      const frac = Math.max(0, Math.min(1, travelled / len));
      el.style.strokeDashoffset = `${len * (1 - frac)}`;
      travelled -= len;
    });
  };

  // DARK -> WRITE -> HOLD 5s -> ERASE (backwards) -> DARK 1s -> next color -> repeat
  useEffect(() => {
    let raf;
    let phase = "writing";
    let phaseStart = performance.now();
    let cancelled = false;

    const tick = (now) => {
      if (cancelled) return;
      const t = now - phaseStart;

      if (phase === "writing") {
        progress.current = Math.min(1, t / WRITE_MS);
        if (t >= WRITE_MS) { phase = "holding"; phaseStart = now; }
      } else if (phase === "holding") {
        progress.current = 1;
        if (t >= HOLD_MS) { phase = "erasing"; phaseStart = now; }
      } else if (phase === "erasing") {
        progress.current = Math.max(0, 1 - t / ERASE_MS);
        if (t >= ERASE_MS) { phase = "waiting"; phaseStart = now; }
      } else if (phase === "waiting") {
        progress.current = 0;
        if (t >= WAIT_MS) {
          setColorIndex((i) => (i + 1) % COLORS.length);
          phase = "writing";
          phaseStart = now;
        }
      }
      apply(progress.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, []);

  const color = COLORS[colorIndex];

  return (
    <div className="neon-wall" style={{ "--neon": color }}>
      <div className="neon-wall-texture" />
      <svg className="neon-svg" viewBox={NEON_VIEWBOX} role="img" aria-label="Developer Keshri Nandan">
        <defs>
          {letters.map((l, li) => (
            <mask id={`pen-${li}`} key={li} maskUnits="userSpaceOnUse" x="-200" y="-400" width="2400" height="800">
              {flat.map((f, i) =>
                f.li === li ? (
                  <path
                    key={i}
                    ref={(el) => (revealRefs.current[i] = el)}
                    d={f.c}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={PEN_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              )}
            </mask>
          ))}
        </defs>

        <g className="neon-tube">
          {letters.map((l, li) => (
            <path key={li} d={l.d} fill={color} fillRule="evenodd" mask={`url(#pen-${li})`} />
          ))}
        </g>
        <g className="neon-core">
          {letters.map((l, li) => (
            <path key={li} d={l.d} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" mask={`url(#pen-${li})`} />
          ))}
        </g>
      </svg>
    </div>
  );
}
