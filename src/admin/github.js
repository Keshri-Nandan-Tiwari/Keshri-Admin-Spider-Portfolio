// Publishing = committing your content to the GitHub repo (the live site reads it from there, and
// Netlify / Vercel redeploy from it). Your token never leaves this browser except in requests
// straight to api.github.com.
import { SITE, rawUrl } from "../siteConfig";
import { sanitizeContent } from "../safe";
import { CONTENT_URL, DEFAULT_CONTENT } from "../ContentContext";

export const GH_KEY = "portfolio-admin-github";
const TOKEN_KEY = "portfolio-admin-token";
const RAW = () => { try { return JSON.parse(localStorage.getItem(GH_KEY) || "{}"); } catch (_) { return {}; } };

// A Netlify / Vercel deploy hook must be an https URL on one of their own domains.
export const safeHook = (u) => {
  try { const x = new URL(String(u || "").trim()); return x.protocol === "https:" && /^(api\.netlify\.com|api\.vercel\.com)$/.test(x.hostname) ? x.href : ""; } catch (_) { return ""; }
};

// The repo always comes from siteConfig.js, so an old repo name remembered by the browser can never
// send your edits to the wrong place. (Turn on "Advanced" in the Publish tab to point somewhere else.)
// The GitHub token is kept only for this browser session (sessionStorage) and is gone when you close the tab.
export const loadSettings = () => {
  const st = RAW();
  if (st.token) { const { token, ...rest } = st; try { localStorage.setItem(GH_KEY, JSON.stringify(rest)); } catch (_) {} } // clean up tokens saved by older versions
  const base = { owner: SITE.owner, repo: SITE.repo, branch: SITE.branch, path: SITE.contentPath };
  const custom = st.advanced ? { owner: st.owner || base.owner, repo: st.repo || base.repo, branch: st.branch || base.branch, path: st.path || base.path } : {};
  let token = ""; try { token = sessionStorage.getItem(TOKEN_KEY) || ""; } catch (_) {}
  return { ...base, ...custom, token, deployHook: safeHook(st.deployHook), advanced: !!st.advanced };
};
export const saveSettings = (s) => {
  const { token, ...rest } = s;
  if (token !== undefined) { try { token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY); } catch (_) {} }
  const cur = RAW(); delete cur.token;
  localStorage.setItem(GH_KEY, JSON.stringify({ ...cur, ...rest }));
};
export const clearToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch (_) {} };
export const clearSettings = () => { localStorage.removeItem(GH_KEY); clearToken(); };

const headers = (s) => ({ Authorization: `Bearer ${s.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" });
const repoUrl = (s) => `https://api.github.com/repos/${s.owner}/${s.repo}`;

const toB64 = (str) => btoa(unescape(encodeURIComponent(str)));
const dataB64 = (dataUrl) => dataUrl.split(",")[1];

// Proves the token belongs to someone who can write to THIS repo — the only way into the admin panel.
export async function testConnection(s) {
  if (!s.token) throw new Error("Paste your GitHub token first.");
  const r = await fetch(repoUrl(s), { headers: headers(s) });
  if (r.status === 401) throw new Error("GitHub rejected the token (401). Check it is correct and not expired.");
  if (r.status === 404) throw new Error(`Repo ${s.owner}/${s.repo} not found (404). Check the token can access it.`);
  if (!r.ok) throw new Error("GitHub error " + r.status);
  const j = await r.json();
  if (!j.permissions || !j.permissions.push) throw new Error("This token can't write to the repo. Only the owner (or a collaborator with write access) can use the admin panel.");
  return `Connected to ${j.full_name} (branch ${s.branch}).`;
}

// reads a JSON file from the repo (with its sha); json is null when it doesn't exist yet
async function getJson(s, path) {
  const g = await fetch(`${repoUrl(s)}/contents/${path}?ref=${encodeURIComponent(s.branch)}`, { headers: headers(s) });
  if (g.status === 404) return { json: null, sha: undefined };
  if (!g.ok) throw new Error(`Could not read ${path} (${g.status}). ${g.status === 401 ? "Your GitHub token has expired — use Security → Replace GitHub token." : ""}`);
  const j = await g.json();
  let json = null;
  try { json = JSON.parse(decodeURIComponent(escape(atob(String(j.content).replace(/\n/g, ""))))); } catch (_) { json = null; }
  return { json, sha: j.sha };
}

async function putFile(s, path, contentB64, message, knownSha) {
  let sha = knownSha;
  if (sha === undefined) {
    const g = await fetch(`${repoUrl(s)}/contents/${path}?ref=${encodeURIComponent(s.branch)}`, { headers: headers(s) });
    if (g.ok) sha = (await g.json()).sha;
    else if (g.status !== 404) throw new Error(`Could not read ${path} (${g.status}).`);
  }
  const r = await fetch(`${repoUrl(s)}/contents/${path}`, {
    method: "PUT", headers: headers(s),
    body: JSON.stringify({ message, content: contentB64, branch: s.branch, ...(sha ? { sha } : {}) }),
  });
  if (!r.ok) {
    let m = ""; try { m = (await r.json()).message; } catch (_) {}
    throw new Error(`Could not save ${path} (${r.status}). ${m}`);
  }
}

// Asks Netlify / Vercel to rebuild right now (optional "build hook" URL), in addition to the automatic deploy.
export async function triggerDeploy(url) {
  if (!url) return false;
  try { await fetch(url, { method: "POST", mode: "no-cors" }); return true; } catch (_) { return false; }
}

// Uploads any new photo / resume (stored in the draft as data: URLs), then saves content.json.
export async function publish(content, s, log) {
  if (!s.token) throw new Error("Sign in again: there is no GitHub token in this session.");
  // never trust the editor's data: unsafe links / oversized values are cleaned before anything is saved
  const out = sanitizeContent(JSON.parse(JSON.stringify(content)));
  if (JSON.stringify(out) !== JSON.stringify(content)) log("Cleaned some unsafe or oversized values before saving.");
  const stamp = Date.now();
  const p = out.profile;
  if (String(p.photo || "").startsWith("data:")) {
    const ext = p.photo.startsWith("data:image/png") ? "png" : "jpg";
    const path = `public/uploads/photo-${stamp}.${ext}`;
    log("Uploading photo…");
    await putFile(s, path, dataB64(p.photo), "Admin: update photo");
    p.photo = "/uploads/" + path.split("/").pop();
  }
  if (String(p.resumeFile || "").startsWith("data:")) {
    const path = `public/uploads/resume-${stamp}.pdf`;
    log("Uploading resume…");
    await putFile(s, path, dataB64(p.resumeFile), "Admin: update resume");
    p.resumeFile = "/uploads/" + path.split("/").pop();
  }
  // photos inside gallery sections
  for (let si = 0; si < (out.sections || []).length; si++) {
    const sec = out.sections[si];
    for (let ii = 0; ii < (sec.items || []).length; ii++) {
      const it = sec.items[ii];
      if (String(it.image || "").startsWith("data:")) {
        const path = `public/uploads/gallery-${stamp}-${si}-${ii}.jpg`;
        log(`Uploading photo ${ii + 1} of “${sec.title || "gallery"}”…`);
        await putFile(s, path, dataB64(it.image), "Admin: add gallery photo");
        it.image = "/uploads/" + path.split("/").pop();
      }
    }
  }
  out.meta = { updatedAt: new Date().toISOString() };
  log(`Saving to GitHub (${s.owner}/${s.repo}@${s.branch})…`);
  // keep the locked access keys exactly as they are on GitHub (an old draft must never roll them back)
  const { json: remote, sha } = await getJson(s, s.path);
  out.admin = { ...(out.admin || {}) };
  if (remote && remote.admin) { if (remote.admin.vault) out.admin.vault = remote.admin.vault; if (remote.admin.recovery) out.admin.recovery = remote.admin.recovery; }
  await putFile(s, s.path, toB64(JSON.stringify(out, null, 2) + "\n"), "Admin: update portfolio content", sha);
  if (safeHook(s.deployHook)) log((await triggerDeploy(safeHook(s.deployHook))) ? "Asked Netlify/Vercel to rebuild the site." : "Could not reach the deploy hook (the site still redeploys from the GitHub push).");
  // the editor never holds the locked keys
  if (out.admin) { delete out.admin.vault; delete out.admin.recovery; }
  return out;
}

// Saves the locked access keys (passcode vault / recovery vault) without touching your content.
export async function saveVaults(s, patch) {
  const { json, sha } = await getJson(s, s.path);
  const base = json || JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  base.admin = { ...(base.admin || {}), ...patch };
  Object.keys(base.admin).forEach((k) => base.admin[k] === null && delete base.admin[k]);
  await putFile(s, s.path, toB64(JSON.stringify(base, null, 2) + "\n"), "Admin: update access", sha);
}

// The locked keys + email settings as published (readable by anyone; useless without the passcode).
const CACHE_KEY = "portfolio-admin-cache";
export async function fetchRemoteAdmin() {
  const get = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  let j = await get(rawUrl(SITE.contentPath) + "?t=" + Date.now());
  if (!j) j = await get(CONTENT_URL + "?v=" + Date.now());
  if (j) {
    const admin = j.admin || {};
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(admin)); } catch (_) {}
    return { ok: true, admin };
  }
  try { return { ok: false, admin: JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") }; } catch (_) { return { ok: false, admin: {} }; }
}

// What does GitHub hold, and what is the deployed site serving? (the second only works when this admin runs on the live site)
export async function checkLive(s) {
  const out = { repo: null, site: null };
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${s.owner}/${s.repo}/${s.branch}/${s.path}?t=${Date.now()}`, { cache: "no-store" });
    if (r.ok) out.repo = ((await r.json()).meta || {}).updatedAt || "";
  } catch (_) {}
  try {
    const r = await fetch(CONTENT_URL + "?v=" + Date.now(), { cache: "no-store" });
    if (r.ok) out.site = ((await r.json()).meta || {}).updatedAt || "";
  } catch (_) {}
  return out;
}
