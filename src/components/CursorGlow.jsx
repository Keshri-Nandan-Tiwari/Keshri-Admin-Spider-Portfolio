import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CursorGlow() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  // Dot follows instantly, the ring trails behind with a soft spring —
  // reads as a premium, deliberate cursor rather than a blurry blob.
  const ringX = useSpring(x, { stiffness: 180, damping: 20, mass: 0.4 });
  const ringY = useSpring(y, { stiffness: 180, damping: 20, mass: 0.4 });

  useEffect(() => {
    const handleMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [x, y]);

  return (
    <>
      <motion.div className="cursor-dot" style={{ left: x, top: y }} />
      <motion.div className="cursor-ring" style={{ left: ringX, top: ringY }} />
    </>
  );
}
