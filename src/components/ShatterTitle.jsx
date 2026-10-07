import { useState } from "react";
import { motion } from "framer-motion";

/**
 * segments: [{ text: "Software ", className: "" }, { text: "Developer", className: "hl" }]
 * Click/tap: letters shatter apart, then reassemble one by one. Click again
 * to replay the same effect.
 */
export default function ShatterTitle({ segments }) {
  const [phase, setPhase] = useState("idle"); // idle | shatter | reassemble

  const handleTrigger = () => {
    if (phase !== "idle") return;
    setPhase("shatter");
    setTimeout(() => setPhase("reassemble"), 480);
    setTimeout(() => setPhase("idle"), 1350);
  };

  let globalIndex = 0;

  return (
    <span
      className="shatter-trigger"
      data-spider-ignore
      onClick={handleTrigger}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleTrigger()}
      aria-label="Replay title animation"
    >
      {segments.map((seg, si) => (
        <span className={seg.className} key={si}>
          {seg.text.split("").map((l) => {
            const i = globalIndex++;
            const dir = i % 2 === 0 ? -1 : 1;
            return (
              <motion.span
                key={i}
                style={{ display: "inline-block" }}
                animate={
                  phase === "shatter"
                    ? {
                        opacity: 0,
                        y: dir * (70 + i * 16),
                        x: (i - globalIndex / 2) * 22,
                        rotate: dir * (90 + i * 22),
                        scale: 0.5,
                        transition: { duration: 0.45, ease: "easeIn" },
                      }
                    : phase === "reassemble"
                    ? {
                        opacity: 1,
                        y: 0,
                        x: 0,
                        rotate: 0,
                        scale: 1,
                        transition: { delay: i * 0.032, type: "spring", stiffness: 280, damping: 15 },
                      }
                    : { opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }
                }
              >
                {l === " " ? "\u00A0" : l}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
