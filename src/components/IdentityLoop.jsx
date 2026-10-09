import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useContent } from "../ContentContext";

export default function IdentityLoop({ compact = false }) {
  const { IDENTITY_LOOP } = useContent();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % Math.max(1, IDENTITY_LOOP.length)), 3600);
    return () => clearInterval(t);
  }, [IDENTITY_LOOP.length]);

  const current = IDENTITY_LOOP[index % Math.max(1, IDENTITY_LOOP.length)];
  if (!current) return null;

  return (
    <div className={`identity-card ${compact ? "identity-card-compact" : ""}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          <span className="identity-eyebrow">{current.eyebrow}</span>
          <p className="identity-text">
            {current.parts.map((p, i) => (
              <span key={i} className={p.bold ? "identity-bold" : "identity-normal"}>
                {p.text}
              </span>
            ))}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
