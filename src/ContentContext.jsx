import { createContext, useContext, useEffect, useState } from "react";
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
  admin: { serviceId: "", templateId: "", publicKey: "" }, // email settings for passcode reset (public by design)
};

export const DRAFT_KEY = "portfolio-admin-draft";

export function normalize(raw) {
  const d = DEFAULT_CONTENT, r = raw && typeof raw === "object" ? raw : {};
  const arr = (k) => (Array.isArray(r[k]) ? r[k] : d[k]);
  return {
    profile: { ...d.profile, ...(r.profile || {}) },
    links: arr("links"), marquee: arr("marquee"), facts: arr("facts"), identity: arr("identity"),
    skills: arr("skills"), education: arr("education"), certifications: arr("certifications"), projects: arr("projects"),
    admin: { ...d.admin, ...(r.admin || {}) },
  };
}

export function loadDraft() {
  try { const t = localStorage.getItem(DRAFT_KEY); return t ? normalize(JSON.parse(t)) : null; } catch (_) { return null; }
}

const BASE = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) || "/";
export const CONTENT_URL = BASE + "content.json";

const Ctx = createContext(null);

export function ContentProvider({ preview, children }) {
  const [content, setContent] = useState(() => (preview ? loadDraft() || DEFAULT_CONTENT : DEFAULT_CONTENT));

  useEffect(() => {
    if (preview) { setContent(loadDraft() || DEFAULT_CONTENT); return; }
    let dead = false;
    fetch(CONTENT_URL + "?v=" + Date.now(), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!dead && j) setContent(normalize(j)); })
      .catch(() => {});
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
    SKILL_GROUPS: c.skills, EDUCATION: c.education, CERTIFICATIONS: c.certifications, PROJECTS: c.projects,
  };
}
