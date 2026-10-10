import { createContext, useContext, useEffect, useState } from "react";
import { SITE, rawUrl } from "./siteConfig";
import { sanitizeContent } from "./safe";
import { PROFILE, FACTS, SKILL_GROUPS, EDUCATION, CERTIFICATIONS, PROJECTS, IDENTITY_LOOP } from "./data/content";

// Everything the admin panel can edit lives in one object. Defaults come from data/content.js,
// so the site looks exactly the same until you publish changes from the admin panel.
export const DEFAULT_CONTENT = {
  profile: { ...PROFILE, photo: "/photo.jpg", handle: "@keshri_08__" },
  links: [], // extra links: { label, url }
  marquee: ["Full-Stack Developer", "Java · Spring Boot", "React · Vite", "Open to Work"],
  facts: FACTS,
  identity: IDENTITY_LOOP,
  skills: SKILL_GROUPS,
  education: EDUCATION,
  certifications: CERTIFICATIONS,
  projects: PROJECTS,
  layout: { hide: [], noMenu: [] }, // built-in sections you hide, and sections you keep out of the top-right menu
  sections: [], // extra sections you add in the admin panel (interests, hobbies, ...)
  meta: { updatedAt: "" },
  admin: { serviceId: "", templateId: "", publicKey: "" }, // email settings for passcode reset (public by design)
};

export const DRAFT_KEY = "portfolio-admin-draft";

export function normalize(raw) {
  const d = DEFAULT_CONTENT, r = raw && typeof raw === "object" ? raw : {};
  const arr = (k) => (Array.isArray(r[k]) ? r[k] : d[k]);
  return sanitizeContent({
    profile: { ...d.profile, ...(r.profile || {}) },
    links: arr("links"), marquee: arr("marquee"), facts: arr("facts"), identity: arr("identity"),
    skills: arr("skills"), education: arr("education"), certifications: arr("certifications"), projects: arr("projects"),
    layout: { hide: [], noMenu: [], ...(r.layout || {}) },
    sections: arr("sections"),
    meta: { ...d.meta, ...(r.meta || {}) },
    admin: (({ vault, recovery, ...rest }) => ({ ...d.admin, ...rest }))(r.admin || {}),
  });
}

export function loadDraft() {
  try { const t = localStorage.getItem(DRAFT_KEY); return t ? normalize(JSON.parse(t)) : null; } catch (_) { return null; }
}

const BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";
export const CONTENT_URL = BASE + "content.json";

// Files you upload in the admin panel (photo) are in your GitHub repo right away,
// before Netlify has finished its next deploy, so load them from GitHub first.
export const assetUrl = (p) => (typeof p === "string" && p.startsWith("/uploads/") ? rawUrl("public" + p) : p);

const Ctx = createContext(null);

export function ContentProvider({ preview, children }) {
  const [content, setContent] = useState(() => (preview ? loadDraft() || DEFAULT_CONTENT : DEFAULT_CONTENT));

  useEffect(() => {
    if (preview) { setContent(loadDraft() || DEFAULT_CONTENT); return; }
    let dead = false, best = null;
    // Two sources, newest wins: the deployed file, and the repo itself (fresh within ~30 seconds of publishing).
    const take = (j) => {
      if (!j || dead) return;
      const n = normalize(j);
      if (!best || (n.meta.updatedAt || "") >= (best.meta.updatedAt || "")) { best = n; setContent(n); }
    };
    const get = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    get(CONTENT_URL + "?v=" + Date.now()).then(take);
    get(rawUrl(SITE.contentPath) + "?t=" + Math.floor(Date.now() / 30000)).then(take);
    return () => { dead = true; };
  }, [preview]);

  // Inside the admin panel's prototype, edits arrive live from the parent window.
  useEffect(() => {
    if (!preview) return;
    const f = (e) => {
      if (e.source === window.parent && e.data && e.data.type === "portfolio-draft") setContent(normalize(e.data.content));
    };
    window.addEventListener("message", f);
    if (window.parent !== window) window.parent.postMessage({ type: "portfolio-preview-ready" }, "*");
    return () => window.removeEventListener("message", f);
  }, [preview]);

  return <Ctx.Provider value={{ content, preview }}>{children}</Ctx.Provider>;
}

export function useContent() {
  const v = useContext(Ctx);
  const c = v ? v.content : DEFAULT_CONTENT;
  return {
    PROFILE: c.profile, LINKS: c.links, MARQUEE: c.marquee, FACTS: c.facts, IDENTITY_LOOP: c.identity,
    SKILL_GROUPS: c.skills, EDUCATION: c.education, CERTIFICATIONS: c.certifications, PROJECTS: c.projects, SECTIONS: c.sections, LAYOUT: c.layout,
  };
}

// Built-in sections, in page order. Their numbers (01, 02, …) close up automatically when you hide one,
// and your own sections continue the count.
export const BUILTIN = ["about", "education", "certifications", "skills", "projects"];
export function useSectionNumber(id) {
  const { LAYOUT, SECTIONS } = useContent();
  const order = [...BUILTIN.filter((b) => !LAYOUT.hide.includes(b)), ...SECTIONS.map((x) => `sec-${x.id}`)];
  return String(Math.max(0, order.indexOf(id)) + 1).padStart(2, "0");
}
