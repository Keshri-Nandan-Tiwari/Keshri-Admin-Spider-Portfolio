import { useEffect, useRef } from "react";
import { createSpiderEngine } from "../spider";

// The same spider as the rest of the site — default size, luxe gold, quick and free —
// lowered into the corner on a silk thread, then it strolls around the edges.
const COLORS = ["gold", "royal", "platinum", "rose", "magma", "cyan", "green", "theme"];
const LOOK = {
  enabled: true, textFx: false, web: false, trail: false, silkLines: false, aura: false,
  sparks: false, lights: 0, speed: 55, frenzy: 125, chaos: 60, pounce: true,
  steer: "follow", palette: "gold", size: 60, filter: "none",
};

export default function LoaderSpider({ stage }) {
  const canvasRef = useRef(null);
  const threadRef = useRef(null);
  const st = useRef({ engine: null, walk: 0, hold: 0, timers: [], wi: 0, userUntil: 0, down: false, ci: 0 });

  useEffect(() => {
    const s = st.current;
    const W = window.innerWidth;
    const engine = createSpiderEngine(canvasRef.current, LOOK, { driven: true });
    s.engine = engine;
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) canvasRef.current.__engine = engine; // test hook, development only
    engine.snapTo(W - 70, -90); // just above the top edge, in the right-hand corner

    // the silk thread follows the spider down from the top edge, then fades
    let raf = 0, landedAt = 0;
    const tick = () => {
      const th = threadRef.current, b = engine.body();
      if (th) {
        th.style.left = b.x + "px";
        th.style.height = Math.max(0, b.y) + "px";
        if (!landedAt && b.y > 100) { landedAt = performance.now(); th.style.opacity = "0"; }
      }
      if (!landedAt || performance.now() - landedAt < 1200) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Touch / click: the spider follows your finger. Tap the spider itself and it swells and changes colour.
    const follow = (x, y) => { s.userUntil = performance.now() + 2600; engine.setTarget(x, y); };
    const onDown = (ev) => {
      if (ev.target.closest && ev.target.closest(".loader-skip")) return;
      if (engine.hit(ev.clientX, ev.clientY, 70)) {
        if (engine.pop(1.6)) {
          s.ci = (s.ci + 1) % COLORS.length;
          engine.update({ palette: COLORS[s.ci] });
        }
        return;
      }
      s.down = true; follow(ev.clientX, ev.clientY);
    };
    const onMove = (ev) => { if (s.down) follow(ev.clientX, ev.clientY); };
    const onUp = () => { s.down = false; };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      cancelAnimationFrame(raf);
      s.timers.forEach(clearTimeout); clearInterval(s.walk); clearInterval(s.hold);
      engine.destroy(); s.engine = null;
    };
  }, []);

  useEffect(() => {
    const s = st.current, e = s.engine;
    if (!e) return;
    const W = window.innerWidth, H = window.innerHeight;
    const go = (x, y) => { if (performance.now() < s.userUntil) return; e.setTarget(x, y); };
    const later = (fn, ms) => s.timers.push(setTimeout(fn, ms));

    // free roam: darts to random spots anywhere on screen, sometimes sprinting, sometimes pouncing
    const startWalk = () => {
      if (s.walk) return;
      const pick = () => {
        const m = 70, b = e.body();
        let x, y, tries = 0;
        do { x = m + Math.random() * (W - 2 * m); y = m + Math.random() * (H - 2 * m); tries++; }
        while (Math.hypot(x - b.x, y - b.y) < Math.min(W, H) * 0.35 && tries < 8);
        return [x, y];
      };
      let goal = pick(), until = performance.now() + 2600;
      e.update({ speed: 140 });
      s.walk = setInterval(() => {
        const b = e.body(), now = performance.now();
        if (Math.hypot(b.x - goal[0], b.y - goal[1]) < 60 || now > until) {
          if (Math.random() < 0.3) e.pounce();
          goal = pick(); until = now + 2200 + Math.random() * 1200;
          e.update({ speed: Math.random() < 0.4 ? 230 : 140 }); // an occasional sprint
        }
        go(goal[0], goal[1]);
      }, 100);
    };

    if (stage === "ready") {
      e.update({ speed: 55 }); // slow, so it visibly lowers itself on the thread
      go(W - 70, 115); // lower itself into the corner…
      later(startWalk, 1400); // …then roam freely
    } else if (stage === "hello") {
      startWalk();
    } else if (stage === "name") {
      // KESHRI drops in: the spider heads down and keeps quiet
      clearInterval(s.walk); s.walk = 0; e.update({ speed: 100 });
      const b0 = e.body(), qx = Math.min(W - 110, Math.max(110, b0.x)), qy = H - 80;
      go(qx, qy);
      clearInterval(s.hold);
      s.hold = setInterval(() => go(qx, qy), 800);
    } else if (stage === "zipper") {
      clearInterval(s.hold); e.update({ speed: 230 });
      go(-260, H - 80);
      later(() => { if (canvasRef.current) { canvasRef.current.style.transition = "opacity .7s"; canvasRef.current.style.opacity = "0"; } }, 150);
    }
  }, [stage]);

  return (
    <>
      <div ref={threadRef} className="loader-thread" aria-hidden="true" />
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }} />
    </>
  );
}
