import { useEffect, useRef, useState, useCallback } from "react";

const AUTO_SCROLL_MS = 2600;
const RESUME_AFTER_MS = 3500;

export default function Coverflow({ children }) {
  const scrollerRef = useRef(null);
  const itemRefs = useRef([]);
  const [transforms, setTransforms] = useState([]);
  const autoTimer = useRef(null);
  const resumeTimer = useRef(null);

  const count = children.length;

  const updateTransforms = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const centerX = scrollerRect.left + scrollerRect.width / 2;

    const next = itemRefs.current.map((el) => {
      if (!el) return { scale: 1, rotate: 0, opacity: 1, isActive: false };
      const rect = el.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const dist = (itemCenter - centerX) / (scrollerRect.width / 2);
      const clamped = Math.max(-1.4, Math.min(1.4, dist));
      const scale = 1 - Math.min(Math.abs(clamped) * 0.22, 0.3);
      const rotate = clamped * -22;
      const opacity = 1 - Math.min(Math.abs(clamped) * 0.35, 0.55);
      const isActive = Math.abs(clamped) < 0.18;
      return { scale, rotate, opacity, isActive };
    });
    setTransforms(next);
  }, []);

  useEffect(() => {
    updateTransforms();
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => requestAnimationFrame(updateTransforms);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [updateTransforms]);

  // One shared "advance" step — reused by both the initial timer and the
  // one that resumes after a pause, so the loop-back logic can't drift.
  const advance = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = itemRefs.current[0];
    const cardWidth = card ? card.getBoundingClientRect().width + 20 : 300;
    // A little slack so it reliably detects "at the end" even with subpixel rounding.
    const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 24;
    if (atEnd) {
      scroller.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      scroller.scrollTo({ left: scroller.scrollLeft + cardWidth, behavior: "smooth" });
    }
  }, []);

  const startAuto = useCallback(() => {
    clearInterval(autoTimer.current);
    autoTimer.current = setInterval(advance, AUTO_SCROLL_MS);
  }, [advance]);

  useEffect(() => {
    startAuto();
    return () => clearInterval(autoTimer.current);
  }, [count, startAuto]);

  const pauseAuto = () => {
    clearInterval(autoTimer.current);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(startAuto, RESUME_AFTER_MS);
  };

  return (
    <div
      className="coverflow"
      ref={scrollerRef}
      onPointerDown={pauseAuto}
      onWheel={pauseAuto}
      onTouchStart={pauseAuto}
    >
      {children.map((child, i) => {
        const t = transforms[i] || { scale: 0.9, rotate: 0, opacity: 0.8, isActive: false };
        return (
          <div
            className={`coverflow-item ${t.isActive ? "coverflow-active" : ""}`}
            key={i}
            ref={(el) => (itemRefs.current[i] = el)}
            style={{
              transform: `scale(${t.scale}) rotateY(${t.rotate}deg)`,
              opacity: t.opacity,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
