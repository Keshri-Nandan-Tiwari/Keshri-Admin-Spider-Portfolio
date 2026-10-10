// Everything that comes from content.json (or from the admin editor) is treated as untrusted input:
// links are limited to safe schemes, text is length-capped, and unknown values are dropped.
// (React already escapes text, so this is a second layer — it also stops "javascript:" links.)

const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g; // control characters (keeps \n and \t)

export const clean = (v, max = 500) => String(v ?? "").replace(CTRL, "").slice(0, max);
const tidy = (v, max) => clean(v, max).trim(); // for single-line fields where outer spaces are never meaningful

// http(s) links only
export function safeWeb(u) {
  const s = tidy(u, 2000);
  if (!s || /[\s<>"'`\\]/.test(s)) return "";
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (_) { return ""; }
}

// a file on this site, an https link, or (admin editor only) a freshly chosen image / PDF
export function safeAsset(u, { pdf = false } = {}) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  if (/^\/(?!\/)[A-Za-z0-9._~\-/]*$/.test(s) && !s.includes("..")) return s.slice(0, 300);
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
  if (pdf && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
  return safeWeb(s);
}

export const safeEmail = (e) => { const s = tidy(e, 200); return /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]+$/.test(s) ? s : ""; };
export const safePhone = (p) => { const s = tidy(p, 40); return /^[0-9+()\-.\s]*$/.test(s) ? s : ""; };
const word = (s, max = 40) => (/^[A-Za-z0-9_-]{1,40}$/.test(String(s ?? "")) ? String(s).slice(0, max) : "");
const list = (a, n, f) => (Array.isArray(a) ? a.slice(0, n).map(f).filter((x) => x !== "" && x != null) : []);
const str = (max) => (x) => clean(x, max);

// keep the data identical when nothing was unsafe: drop keys we only added as empty strings
const fix = (orig, out) => { Object.keys(out).forEach((k) => { if ((out[k] === "" || out[k] === undefined) && !(orig && k in orig)) delete out[k]; }); return out; };

const TONES = ["black", "red", "orange", "blue"];
const TYPES = ["text", "cards", "tags", "timeline", "stats", "links", "gallery"];

export function sanitizeContent(c) {
  const o = { ...c };
  if (o.profile) {
    const p = o.profile;
    o.profile = {
      ...p,
      name: clean(p.name, 120), role: clean(p.role, 120), location: clean(p.location, 160), handle: clean(p.handle, 80),
      blurb: clean(p.blurb, 3000), tags: list(p.tags, 30, str(80)),
      email: safeEmail(p.email), phone: safePhone(p.phone),
      github: safeWeb(p.github), linkedin: safeWeb(p.linkedin), instagram: safeWeb(p.instagram), x: safeWeb(p.x),
      photo: safeAsset(p.photo), resumeFile: safeAsset(p.resumeFile, { pdf: true }),
    };
  }
  if (o.links) o.links = list(o.links, 40, (l) => (safeWeb(l && l.url) ? { label: clean(l.label, 80), url: safeWeb(l.url) } : ""));
  if (o.marquee) o.marquee = list(o.marquee, 30, str(80));
  if (o.facts) o.facts = list(o.facts, 40, (f) => ({ lead: clean(f && f.lead, 200), highlight: clean(f && f.highlight, 200), tone: TONES.includes(f && f.tone) ? f.tone : "black" }));
  if (o.identity) o.identity = list(o.identity, 20, (i) => ({ ...i, eyebrow: clean(i && i.eyebrow, 60), parts: list(i && i.parts, 12, (q) => ({ text: clean(q && q.text, 200), bold: !!(q && q.bold) })) }));
  if (o.skills) o.skills = list(o.skills, 40, (g) => fix(g, { ...g, title: clean(g && g.title, 80), icon: word(g && g.icon) || "Sparkles", items: list(g && g.items, 100, str(80)) }));
  if (o.education) o.education = list(o.education, 30, (e) => fix(e, { ...e, school: clean(e && e.school, 200), place: clean(e && e.place, 200), degree: clean(e && e.degree, 300), period: clean(e && e.period, 80), score: clean(e && e.score, 40), icon: word(e && e.icon) || "School" }));
  if (o.certifications) o.certifications = list(o.certifications, 60, (x) => fix(x, { ...x, title: clean(x && x.title, 200), org: clean(x && x.org, 200), icon: word(x && x.icon) || "Award", link: safeWeb(x && x.link) }));
  if (o.projects) o.projects = list(o.projects, 60, (p) => fix(p, { ...p, title: clean(p && p.title, 200), tag: clean(p && p.tag, 120), period: clean(p && p.period, 80), desc: clean(p && p.desc, 3000), metric: clean(p && p.metric, 160), stack: list(p && p.stack, 40, str(60)), link: safeWeb(p && p.link), github: safeWeb(p && p.github) }));
  if (o.sections) o.sections = list(o.sections, 60, (s) => fix(s, {
    ...s, id: /^[a-z0-9]{3,12}$/.test(s && s.id) ? s.id : Math.random().toString(36).slice(2, 8),
    title: clean(s && s.title, 120), eyebrow: clean(s && s.eyebrow, 120), heading: clean(s && s.heading, 200),
    type: TYPES.includes(s && s.type) ? s.type : "text", icon: word(s && s.icon) || "Sparkles", showInMenu: !(s && s.showInMenu === false),
    text: clean(s && s.text, 30000), tags: list(s && s.tags, 100, str(80)),
    items: list(s && s.items, 100, (it) => fix(it, { ...it, title: clean(it && it.title, 200), text: clean(it && it.text, 3000), period: clean(it && it.period, 80), value: clean(it && it.value, 40), label: clean(it && it.label, 120), caption: clean(it && it.caption, 200), icon: word(it && it.icon) || undefined, link: safeWeb(it && it.link), url: safeWeb(it && it.url), image: safeAsset(it && it.image) })),
  }));
  if (o.layout) o.layout = { hide: list(o.layout.hide, 30, (x) => word(x, 20)), noMenu: list(o.layout.noMenu, 80, (x) => word(x, 30)) };
  if (o.meta) o.meta = { updatedAt: /^[0-9T:.\-Z+]{0,40}$/.test(o.meta.updatedAt || "") ? o.meta.updatedAt || "" : "" };
  if (o.admin) {
    const a = o.admin, id = (x) => (/^[A-Za-z0-9_.\-]{0,100}$/.test(x || "") ? x || "" : "");
    o.admin = { ...a, serviceId: id(a.serviceId), templateId: id(a.templateId), publicKey: id(a.publicKey) };
  }
  return o;
}
