// Publishing = committing your content to the GitHub repo. Netlify / Vercel then rebuild the site.
// Your token never leaves this browser except in requests straight to api.github.com.
export const GH_KEY = "portfolio-admin-github";

export const loadSettings = () => {
  const d = { owner: "Keshri-Nandan-Tiwari", repo: "Keshri-Spider-Portfolio", branch: "main", path: "public/content.json", token: "" };
  try { return { ...d, ...JSON.parse(localStorage.getItem(GH_KEY) || "{}") }; } catch (_) { return d; }
};
export const saveSettings = (s) => localStorage.setItem(GH_KEY, JSON.stringify(s));

const headers = (s) => ({ Authorization: `Bearer ${s.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" });
const repoUrl = (s) => `https://api.github.com/repos/${s.owner}/${s.repo}`;

const toB64 = (str) => btoa(unescape(encodeURIComponent(str)));
const dataB64 = (dataUrl) => dataUrl.split(",")[1];

export async function testConnection(s) {
  if (!s.token) throw new Error("Paste your GitHub token first.");
  const r = await fetch(repoUrl(s), { headers: headers(s) });
  if (r.status === 401) throw new Error("GitHub rejected the token (401). Check it is correct and not expired.");
  if (r.status === 404) throw new Error("Repo not found (404). Check the owner/repo names and that the token can access it.");
  if (!r.ok) throw new Error("GitHub error " + r.status);
  const j = await r.json();
  if (j.permissions && !j.permissions.push) throw new Error("Token can read but not write. Give it Contents: Read and write.");
  return `Connected to ${j.full_name} (default branch: ${j.default_branch}).`;
}

async function putFile(s, path, contentB64, message) {
  let sha;
  const g = await fetch(`${repoUrl(s)}/contents/${path}?ref=${encodeURIComponent(s.branch)}`, { headers: headers(s) });
  if (g.ok) sha = (await g.json()).sha;
  else if (g.status !== 404) throw new Error(`Could not read ${path} (${g.status}).`);
  const r = await fetch(`${repoUrl(s)}/contents/${path}`, {
    method: "PUT", headers: headers(s),
    body: JSON.stringify({ message, content: contentB64, branch: s.branch, ...(sha ? { sha } : {}) }),
  });
  if (!r.ok) {
    let m = ""; try { m = (await r.json()).message; } catch (_) {}
    throw new Error(`Could not save ${path} (${r.status}). ${m}`);
  }
}

// Uploads any new photo / resume (stored in the draft as data: URLs), then saves content.json.
export async function publish(content, s, log) {
  if (!s.token) throw new Error("Add your GitHub token in the Publish tab first.");
  const out = JSON.parse(JSON.stringify(content));
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
  log("Saving content…");
  await putFile(s, s.path, toB64(JSON.stringify(out, null, 2) + "\n"), "Admin: update portfolio content");
  return out;
}
