/* Spider FX — refined "luxe" effects layered under the spider canvas (z-index 148).
 * Gold dust, idle sparkles and a living web mesh — all off until switched on. */
const TAU = Math.PI * 2, R = Math.random;

export function createSpiderFx(getBody) {
  const canvas = document.createElement("canvas");
  canvas.className = "spd-fx"; canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", zIndex: "148", pointerEvents: "none" });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d"), root = document.documentElement;
  let S = {}, W = 0, H = 0, raf = 0, running = false, last = 0, t = 0, colT = 0, lastInput = performance.now();
  let sp = "rgb(255,51,85)", alt = "rgb(255,255,255)", rgb = [255, 51, 85], rgb2 = [255, 255, 255];
  let dust = [], mesh = [], orbit = 0, prev = null;
  const mouse = { x: -9999, y: -9999, on: false };

  const nums = (s) => { const m = String(s).match(/[\d.]+/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null; };
  const rgba = (c, a) => "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
  function colors() {
    const cs = getComputedStyle(root);
    sp = cs.getPropertyValue("--spd-sp").trim() || sp; alt = cs.getPropertyValue("--spd-alt").trim() || alt;
    rgb = nums(sp) || rgb; rgb2 = nums(alt) || rgb2;
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const body = () => { const b = getBody ? getBody() : null; return b && (b.x || b.y) ? b : { x: W / 2, y: H / 2, h: 0 }; };
  const on = () => S.enabled !== false;
  const need = () => on() && (S.dust || S.mesh || S.orbit || dust.length);

  function star(x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
  }

  /* ---- living web mesh ---- */
  function stepMesh(dt) {
    const n = W < 700 ? 34 : 58;
    if (mesh.length !== n) { mesh = []; for (let i = 0; i < n; i++) mesh.push({ x: R() * W, y: R() * H, vx: (R() - 0.5) * 22, vy: (R() - 0.5) * 22 }); }
    const b = body(); ctx.lineWidth = 1; ctx.strokeStyle = sp;
    mesh.forEach((p, i) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      for (let j = i + 1; j < mesh.length; j++) { const q = mesh[j], d = Math.hypot(p.x - q.x, p.y - q.y); if (d < 125) { ctx.globalAlpha = (1 - d / 125) * 0.26; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } }
      const links = mouse.on ? [[mouse.x, mouse.y, 190, 0.55], [b.x, b.y, 230, 0.65]] : [[b.x, b.y, 230, 0.65]];
      links.forEach(([hx, hy, rr, al]) => { const d = Math.hypot(p.x - hx, p.y - hy); if (d < rr) { ctx.globalAlpha = (1 - d / rr) * al; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(hx, hy); ctx.stroke(); ctx.lineWidth = 1; } });
      ctx.globalAlpha = 0.75; ctx.fillStyle = sp; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, TAU); ctx.fill();
    });
  }

  /* ---- gold dust: glitter shed by the spider as it moves ---- */
  function stepDust(dt) {
    const b = body();
    if (S.dust && prev) {
      const sp2 = Math.hypot(b.x - prev.x, b.y - prev.y) / Math.max(dt, 0.001);
      const n = Math.min(4, (sp2 / 260) * (dt * 60) * 0.5 + (R() < 0.12 ? 1 : 0));
      for (let i = 0; i < n && dust.length < 160; i++) dust.push({ x: b.x + (R() - 0.5) * 16, y: b.y + (R() - 0.5) * 16, vx: (R() - 0.5) * 22, vy: -8 - R() * 26, life: 0, max: 1.2 + R() * 1.6, r: 1 + R() * 2.4, ph: R() * TAU, big: R() < 0.35 });
    }
    prev = { x: b.x, y: b.y };
    ctx.globalCompositeOperation = "lighter";
    dust = dust.filter((d) => {
      d.life += dt; if (d.life >= d.max) return false;
      d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 6 * dt; d.vx *= 0.99;
      const k = d.life / d.max, a = (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) * (0.55 + 0.45 * Math.sin(d.ph + t * 9));
      ctx.fillStyle = rgba(d.big ? [255, 244, 214] : rgb, Math.max(0, a));
      if (d.big) star(d.x, d.y, d.r * 2.6); else { ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 0.7, 0, TAU); ctx.fill(); }
      return true;
    });
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---- idle orbit: when you pause, soft sparkles circle the spider ---- */
  function stepOrbit(dt) {
    const idle = performance.now() - lastInput > 2500;
    orbit += ((idle ? 1 : 0) - orbit) * Math.min(1, dt * 2.2);
    if (orbit < 0.02) return;
    const b = body();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const a = t * (0.7 + i * 0.09) + (i / 6) * TAU, r = 40 + (i % 3) * 14 + Math.sin(t + i) * 4;
      ctx.fillStyle = rgba(i % 2 ? rgb2 : [255, 240, 205], orbit * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)));
      star(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r * 0.8, 3 + (i % 3));
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt; colT -= dt;
    if (colT <= 0) { colors(); colT = 0.25; }
    ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1;
    if (S.mesh) stepMesh(dt);
    if (S.dust || dust.length) stepDust(dt);
    if (S.orbit) stepOrbit(dt);
    ctx.globalAlpha = 1;
    if (!need()) { running = false; ctx.clearRect(0, 0, W, H); return; }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || !need()) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }

  const inUI = (e) => !!(e.target && e.target.closest && e.target.closest(".spd-ui,input,textarea,select"));
  const touch = () => { lastInput = performance.now(); };
  const onDown = (e) => { touch(); mouse.x = e.clientX; mouse.y = e.clientY; start(); };
  const onMove = (e) => { touch(); mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; start(); };
  const onLeave = () => { mouse.on = false; };
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointerdown", onDown, true);
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);

  return {
    update(patch) {
      S = Object.assign(S, patch);
      if (!S.mesh) mesh = [];
      if (!S.dust) dust = [];
      if (!on()) { dust = []; mesh = []; ctx.clearRect(0, 0, W, H); }
      start();
    },
    destroy() {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize); window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave);
      canvas.remove();
    },
  };
}
