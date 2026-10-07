import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";
import { ArrowRight, MapPin, Download } from "lucide-react";
import { PROFILE } from "../data/content";
import NeonSign from "./NeonSign";
import Magnetic from "./Magnetic";
import ShatterTitle from "./ShatterTitle";
import IdentityLoop from "./IdentityLoop";

export default function Hero() {
  const rotateY = useMotionValue(0);
  const smoothRotateY = useSpring(rotateY, { stiffness: 140, damping: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const dragState = useRef({ active: false, lastX: 0, moved: 0, startX: 0 });

  const startDrag = (clientX) => {
    dragState.current = { active: true, lastX: clientX, startX: clientX, moved: 0 };
    setIsDragging(true);
  };
  const moveDrag = (clientX) => {
    if (!dragState.current.active) return;
    const delta = clientX - dragState.current.lastX;
    dragState.current.lastX = clientX;
    dragState.current.moved += Math.abs(delta);
    rotateY.set(rotateY.get() + delta * 1.2); // drag left/right spins it, as far as you like
  };
  const endDrag = () => {
    const wasTap = dragState.current.moved < 6;
    dragState.current.active = false;
    setIsDragging(false);

    if (wasTap) {
      // A tap (not a drag): boosted full 360 spin with the border flashing bright.
      setIsFlashing(true);
      animate(rotateY, rotateY.get() + 360, {
        duration: 1,
        ease: "easeInOut",
        onComplete: () => setIsFlashing(false),
      });
    } else {
      // A drag: once you let go, glide back to the default front-facing look.
      animate(rotateY, Math.round(rotateY.get() / 360) * 360, { duration: 0.9, ease: "easeOut" });
    }
  };

  const handlers = {
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      startDrag(e.clientX);
    },
    onPointerMove: (e) => moveDrag(e.clientX),
    onPointerUp: endDrag,
    onPointerLeave: () => {
      if (dragState.current.active) endDrag();
    },
  };

  return (
    <section className="hero" id="hero">
      <div className="container hero-grid">
        <div>
          <motion.div
            className="hero-kicker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <MapPin size={12} style={{ display: "inline", marginRight: 6 }} />
            {PROFILE.location}
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <ShatterTitle
              segments={[
                { text: "Software", className: "hero-title-word font-satoshi" },
                { text: "Developer", className: "hero-title-word hl" },
              ]}
            />
          </motion.h1>
          <p className="shatter-hint">Tap the title</p>

          <motion.p
            className="hero-blurb"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            {PROFILE.blurb}
          </motion.p>

          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            <Magnetic strength={0.3}>
              <a href="#contact" className="btn btn-primary">
                Get in touch <ArrowRight size={16} />
              </a>
            </Magnetic>
            <Magnetic strength={0.3}>
              <a href={PROFILE.resumeFile} download className="btn-resume">
                <Download size={17} /> Download Resume
              </a>
            </Magnetic>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div
            className={`photo-ring mirror-reflect ${isDragging || isFlashing ? "photo-ring-active" : ""}`}
            style={{ rotateY: smoothRotateY, cursor: isDragging ? "grabbing" : "grab" }}
            {...handlers}
          >
            <div className="photo-ring-inner photo-flip-space">
              <div className="photo-face photo-face-front">
                <img src="/photo.jpg" alt="Keshri Nandan Tiwari" />
                <div className="hero-photo-badge">{PROFILE.name}</div>
              </div>
              <div className="photo-face photo-face-back">
                <span className="photo-back-handle">@keshri_08__</span>
                <IdentityLoop compact />
              </div>
            </div>
          </motion.div>
          <p className="shatter-hint" style={{ textAlign: "center" }}>Tap to spin — drag to rotate</p>
          <NeonSign />
        </motion.div>
      </div>
    </section>
  );
}
