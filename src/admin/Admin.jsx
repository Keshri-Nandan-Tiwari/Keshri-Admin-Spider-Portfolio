import { useEffect, useRef, useState, useCallback } from "react";
import "./admin.css";
import { DEFAULT_CONTENT, DRAFT_KEY, CONTENT_URL, normalize, loadDraft } from "../ContentContext";
import { ICON_NAMES } from "../icons";
import { loadSettings, saveSettings, testConnection, publish } from "./github";
import { loadMailCfg, saveMailCfg, mailReady, sendMail, changedMail } from "./mail";

const PASS_KEY = "portfolio-admin-pass";
const SESSION_KEY = "portfolio-admin-unlocked";

async function sha(text) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (_) {
    let h = 5381; for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "x" + h;
  }
}

const downloadJson = (obj, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
  a.download = name; a.click();
};

const move = (arr, i, d) => { const a = [...arr], j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };

/* ---------- small building blocks ---------- */
function Field({ label, hint, value, onChange, area, placeholder, type = "text" }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {area ? <textarea value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input type={type} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Chips({ label, items, onChange, placeholder }) {
  const [t, setT] = useState("");
  const add = () => { const v = t.trim(); if (!v) return; onChange([...(items || []), v]); setT(""); };
  return (
    <div className="adm-field">
      <span>{label}</span>
      <div className="adm-chips">
        {(items || []).map((x, i) => (
          <span className="adm-chip" key={i}>{x}<button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button></span>
        ))}
      </div>
      <div className="adm-chipadd">
        <input value={t} placeholder={placeholder || "Type and press Enter"} onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className="adm-btn" onClick={add}>Add</button>
      </div>
    </div>
  );
}

// A list of cards you can add to, reorder, edit and delete.
function Collection({ items, onChange, blank, title, sub, addLabel, render }) {
  const [open, setOpen] = useState(null);
  const set = (i, v) => onChange(items.map((x, j) => (j === i ? v : x)));
  return (
    <div>
      {items.map((it, i) => (
        <div className="adm-card" key={i}>
          <div className="adm-card-head" onClick={() => setOpen(open === i ? null : i)}>
            <b>{title(it, i) || "(untitled)"}</b>
            {sub && <em>{sub(it)}</em>}
            <span className="adm-actions" onClick={(e) => e.stopPropagation()}>
              <button className="adm-mini" disabled={i === 0} aria-label="Move up" onClick={() => { onChange(move(items, i, -1)); if (open === i) setOpen(i - 1); }}>↑</button>
              <button className="adm-mini" disabled={i === items.length - 1} aria-label="Move down" onClick={() => { onChange(move(items, i, 1)); if (open === i) setOpen(i + 1); }}>↓</button>
              <button className="adm-mini del" aria-label="Delete" onClick={() => { if (window.confirm("Delete this item?")) { onChange(items.filter((_, j) => j !== i)); setOpen(null); } }}>✕</button>
            </span>
          </div>
          {open === i && <div className="adm-card-body">{render(it, (v) => set(i, v))}</div>}
        </div>
      ))}
      <button className="adm-add" onClick={() => { onChange([...items, blank()]); setOpen(items.length); }}>+ {addLabel}</button>
    </div>
  );
}

function resizeImage(file, max = 900) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.88));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
const readDataUrl = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = rej; fr.onload = () => res(fr.result); fr.readAsDataURL(file); });

/* ---------- passcode gate ---------- */
const RESET_KEY = "portfolio-admin-reset";
const setPasscode = async (pass) => { localStorage.setItem(PASS_KEY, await sha(pass)); sessionStorage.setItem(SESSION_KEY, "1"); };

// Email settings are public by design; keep a copy on this device and fall back to the published file on a new device.
async function findMailCfg() {
  const local = loadMailCfg();
  if (mailReady(local)) return local;
  try {
    const r = await fetch(CONTENT_URL + "?v=" + Date.now(), { cache: "no-store" });
    if (r.ok) { const j = await r.json(); if (mailReady(j.admin)) return j.admin; }
  } catch (_) { /* offline or not published yet */ }
  return null;
}

function Gate({ onOk }) {
  const saved = localStorage.getItem(PASS_KEY);
  const [mode, setMode] = useState("login"); // login | forgot | code | token | newpass
  const [a, setA] = useState(""), [b, setB] = useState(""), [code, setCode] = useState(""), [token, setToken] = useState("");
  const [err, setErr] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false);
  const cfgRef = useRef(null);

  const finish = async (how) => {
    await setPasscode(a);
    const cfg = cfgRef.current || (await findMailCfg());
    if (cfg) { try { await sendMail(cfg, changedMail(how)); } catch (_) { /* notification is best-effort */ } }
    onOk();
  };
  const checkNew = () => {
    if (a.length < 4) { setErr("Use at least 4 characters."); return false; }
    if (a !== b) { setErr("The two passcodes don't match."); return false; }
    return true;
  };

  const login = async (e) => {
    e.preventDefault(); setErr("");
    if (saved) {
      if ((await sha(a)) === saved) { sessionStorage.setItem(SESSION_KEY, "1"); onOk(); } else setErr("Wrong passcode.");
    } else if (checkNew()) { await setPasscode(a); onOk(); }
  };

  const sendCode = async () => {
    setErr(""); setInfo(""); setBusy(true);
    try {
      const cfg = await findMailCfg();
      if (!cfg) throw new Error("Email isn't set up for this site yet. Use your GitHub token below instead, then set up email in Admin → Security.");
      cfgRef.current = cfg;
      const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000, c = String(n).padStart(6, "0");
      sessionStorage.setItem(RESET_KEY, JSON.stringify({ h: await sha(c), exp: Date.now() + 10 * 60000, tries: 0 }));
      await sendMail(cfg, { subject: "Your portfolio admin reset code", message: `Your reset code is ${c}. It works for 10 minutes. If you didn't ask for it, ignore this email.`, code: c });
      setInfo("Code sent. Check your email (and spam)."); setMode("code");
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  const verifyCode = async (e) => {
    e.preventDefault(); setErr("");
    let r; try { r = JSON.parse(sessionStorage.getItem(RESET_KEY) || "null"); } catch (_) { r = null; }
    if (!r || Date.now() > r.exp) return setErr("That code expired. Ask for a new one.");
    if (r.tries >= 5) return setErr("Too many tries. Ask for a new code.");
    if ((await sha(code.trim())) !== r.h) { r.tries++; sessionStorage.setItem(RESET_KEY, JSON.stringify(r)); return setErr("Wrong code."); }
    if (!checkNew()) return;
    sessionStorage.removeItem(RESET_KEY); await finish("reset with an email code");
  };
  const verifyToken = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await testConnection({ ...loadSettings(), token: token.trim() }); setMode("newpass"); setInfo("Token verified. Choose a new passcode."); }
    catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  const saveNew = async (e) => { e.preventDefault(); setErr(""); if (checkNew()) await finish("reset with the GitHub token"); };

  return (
    <div className="adm-root"><div className="adm-gate">
      {mode === "login" && (
        <form onSubmit={login}>
          <h1>Portfolio <span style={{ color: "#ff3355" }}>Admin</span></h1>
          <p className="adm-sub">{saved ? "Enter your passcode to continue." : "First time here: create a passcode for this device."}</p>
          <Field label="Passcode" type="password" value={a} onChange={setA} />
          {!saved && <Field label="Repeat passcode" type="password" value={b} onChange={setB} />}
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }}>{saved ? "Unlock" : "Create passcode"}</button>
          {saved && <button type="button" className="adm-link" onClick={() => { setErr(""); setMode("forgot"); }}>Forgot passcode?</button>}
          <p className="adm-sub" style={{ marginTop: 14 }}>This keeps casual visitors out of the editor. Nobody can change your live site without your GitHub token.</p>
        </form>
      )}
      {mode === "forgot" && (
        <form onSubmit={(e) => e.preventDefault()}>
          <h1>Reset passcode</h1>
          <p className="adm-sub">Pick a way to prove it's you.</p>
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%", marginBottom: 10 }} disabled={busy} onClick={sendCode}>{busy ? "Sending…" : "Email me a reset code"}</button>
          <button className="adm-btn" style={{ width: "100%" }} onClick={() => { setErr(""); setMode("token"); }}>Verify with my GitHub token</button>
          <button type="button" className="adm-link" onClick={() => { setErr(""); setMode("login"); }}>← Back</button>
        </form>
      )}
      {mode === "code" && (
        <form onSubmit={verifyCode}>
          <h1>Enter the code</h1>
          <p className="adm-sub">{info}</p>
          <Field label="6-digit code" value={code} onChange={setCode} placeholder="123456" />
          <Field label="New passcode" type="password" value={a} onChange={setA} />
          <Field label="Repeat new passcode" type="password" value={b} onChange={setB} />
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }}>Set new passcode</button>
          <button type="button" className="adm-link" onClick={() => { setErr(""); setMode("forgot"); }}>← Back</button>
        </form>
      )}
      {mode === "token" && (
        <form onSubmit={verifyToken}>
          <h1>Verify with GitHub</h1>
          <p className="adm-sub">Paste the GitHub token you use to publish. It is only checked with GitHub and is not saved here.</p>
          <Field label="GitHub token" type="password" value={token} onChange={setToken} />
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }} disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
          <button type="button" className="adm-link" onClick={() => { setErr(""); setMode("forgot"); }}>← Back</button>
        </form>
      )}
      {mode === "newpass" && (
        <form onSubmit={saveNew}>
          <h1>New passcode</h1>
          <p className="adm-sub">{info}</p>
          <Field label="New passcode" type="password" value={a} onChange={setA} />
          <Field label="Repeat new passcode" type="password" value={b} onChange={setB} />
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }}>Save passcode</button>
        </form>
      )}
    </div></div>
  );
}

/* ---------- tabs ---------- */
function ProfileTab({ c, set }) {
  const p = c.profile, up = (k) => (v) => set({ ...c, profile: { ...p, [k]: v } });
  const photoRef = useRef(), cvRef = useRef();
  return (
    <>
      <h2>Profile</h2>
      <p className="adm-sub">Your name, headline, bio and photo.</p>
      <div className="adm-photo">
        <img src={p.photo} alt="" />
        <div>
          <input ref={photoRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) up("photo")(await resizeImage(f)); }} />
          <button className="adm-btn pri" onClick={() => photoRef.current.click()}>Change photo</button>
          <p className="adm-sub" style={{ marginTop: 8 }}>Resized automatically. Goes live when you publish.</p>
        </div>
      </div>
      <div className="adm-grid">
        <Field label="Full name" value={p.name} onChange={up("name")} />
        <Field label="Role / headline" value={p.role} onChange={up("role")} hint="Shown big in the hero, e.g. Software Developer" />
        <Field label="Location" value={p.location} onChange={up("location")} />
        <Field label="Photo-back handle" value={p.handle} onChange={up("handle")} hint="Shown on the back of your photo card" />
      </div>
      <Field label="Bio" area value={p.blurb} onChange={up("blurb")} />
      <Chips label="Highlight tags" items={p.tags} onChange={up("tags")} />
      <hr className="adm-sep" />
      <h2>Resume</h2>
      <p className="adm-sub">Current file: <b>{String(p.resumeFile).startsWith("data:") ? "new file (not published yet)" : p.resumeFile}</b></p>
      <input ref={cvRef} type="file" accept="application/pdf" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) up("resumeFile")(await readDataUrl(f)); }} />
      <button className="adm-btn" onClick={() => cvRef.current.click()}>Upload new resume (PDF)</button>
    </>
  );
}

function LinksTab({ c, set }) {
  const p = c.profile, up = (k) => (v) => set({ ...c, profile: { ...p, [k]: v } });
  return (
    <>
      <h2>Contact &amp; links</h2>
      <p className="adm-sub">Leave a field empty to hide it from the site. Add as many extra links as you like.</p>
      <div className="adm-grid">
        <Field label="Email" value={p.email} onChange={up("email")} />
        <Field label="Phone" value={p.phone} onChange={up("phone")} placeholder="+91-..." />
        <Field label="LinkedIn URL" value={p.linkedin} onChange={up("linkedin")} />
        <Field label="GitHub URL" value={p.github} onChange={up("github")} />
        <Field label="Instagram URL" value={p.instagram} onChange={up("instagram")} />
        <Field label="X (Twitter) URL" value={p.x} onChange={up("x")} />
      </div>
      <hr className="adm-sep" />
      <h2>Extra links</h2>
      <p className="adm-sub">YouTube, Telegram, a blog, a second portfolio — anything.</p>
      <Collection items={c.links} onChange={(v) => set({ ...c, links: v })} blank={() => ({ label: "", url: "" })}
        title={(l) => l.label || l.url} addLabel="Add a link"
        render={(l, u) => (<>
          <Field label="Label" value={l.label} onChange={(v) => u({ ...l, label: v })} placeholder="YouTube" />
          <Field label="URL" value={l.url} onChange={(v) => u({ ...l, url: v })} placeholder="https://" />
        </>)} />
    </>
  );
}

function AboutTab({ c, set }) {
  return (
    <>
      <h2>About lines</h2>
      <p className="adm-sub">The sentences that type themselves out in the About section. Each one is a normal phrase plus one highlighted phrase.</p>
      <Collection items={c.facts} onChange={(v) => set({ ...c, facts: v })} blank={() => ({ lead: "", highlight: "", tone: "black" })}
        title={(f) => `${f.lead} ${f.highlight}`} addLabel="Add a line"
        render={(f, u) => (<>
          <Field label="Normal text" value={f.lead} onChange={(v) => u({ ...f, lead: v })} placeholder="I believe in code that" />
          <Field label="Highlighted phrase" value={f.highlight} onChange={(v) => u({ ...f, highlight: v })} placeholder="actually ships" />
          <Select label="Highlight style" value={f.tone} onChange={(v) => u({ ...f, tone: v })} options={["black", "red", "orange", "blue"]} />
        </>)} />
      <hr className="adm-sep" />
      <h2>Scrolling strip</h2>
      <p className="adm-sub">The words that scroll across the page under the hero.</p>
      <Chips label="Strip items" items={c.marquee} onChange={(v) => set({ ...c, marquee: v })} />
      <hr className="adm-sep" />
      <h2>Photo-card lines</h2>
      <p className="adm-sub">Short “who I am” lines that rotate on the back of your photo. Use the pieces to mix normal and bold text.</p>
      <Collection items={c.identity} onChange={(v) => set({ ...c, identity: v })} blank={() => ({ eyebrow: "", parts: [{ text: "", bold: true }] })}
        title={(l) => `${l.eyebrow} — ${l.parts.map((p) => p.text).join("")}`} addLabel="Add a card line"
        render={(l, u) => (<>
          <Field label="Small label" value={l.eyebrow} onChange={(v) => u({ ...l, eyebrow: v })} placeholder="I am" />
          <Collection items={l.parts} onChange={(v) => u({ ...l, parts: v })} blank={() => ({ text: "", bold: false })}
            title={(p) => p.text} sub={(p) => (p.bold ? "bold" : "normal")} addLabel="Add a piece"
            render={(p, pu) => (<>
              <Field label="Text" value={p.text} onChange={(v) => pu({ ...p, text: v })} />
              <Select label="Style" value={p.bold ? "bold" : "normal"} onChange={(v) => pu({ ...p, bold: v === "bold" })} options={["bold", "normal"]} />
            </>)} />
        </>)} />
    </>
  );
}

function SkillsTab({ c, set }) {
  return (
    <>
      <h2>Skills</h2>
      <p className="adm-sub">Each group is a card in the Toolbox carousel. Add groups and put any skills inside them.</p>
      <Collection items={c.skills} onChange={(v) => set({ ...c, skills: v })} blank={() => ({ title: "New group", icon: "Sparkles", items: [] })}
        title={(g) => g.title} sub={(g) => `${(g.items || []).length} skills`} addLabel="Add a skill group"
        render={(g, u) => (<>
          <div className="adm-grid">
            <Field label="Group name" value={g.title} onChange={(v) => u({ ...g, title: v })} />
            <Select label="Icon" value={g.icon} onChange={(v) => u({ ...g, icon: v })} options={ICON_NAMES} />
          </div>
          <Chips label="Skills in this group" items={g.items} onChange={(v) => u({ ...g, items: v })} placeholder="e.g. Kotlin" />
        </>)} />
    </>
  );
}

function EducationTab({ c, set }) {
  return (
    <>
      <h2>Education</h2>
      <p className="adm-sub">Add your schools and degrees. The score (percentage or CGPA) is optional and only shows if you fill it in.</p>
      <Collection items={c.education} onChange={(v) => set({ ...c, education: v })}
        blank={() => ({ school: "New school", place: "", degree: "", period: "", score: "", icon: "School" })}
        title={(e) => e.school} sub={(e) => e.period} addLabel="Add education"
        render={(e, u) => (<>
          <Field label="School / college" value={e.school} onChange={(v) => u({ ...e, school: v })} />
          <div className="adm-grid">
            <Field label="Place" value={e.place} onChange={(v) => u({ ...e, place: v })} />
            <Field label="Period" value={e.period} onChange={(v) => u({ ...e, period: v })} placeholder="Sep 2022 – Jun 2026" />
            <Field label="Score (optional)" value={e.score} onChange={(v) => u({ ...e, score: v })} placeholder="82% or 8.4 CGPA" />
            <Select label="Icon" value={e.icon || "School"} onChange={(v) => u({ ...e, icon: v })} options={ICON_NAMES} />
          </div>
          <Field label="Degree / course" value={e.degree} onChange={(v) => u({ ...e, degree: v })} />
        </>)} />
    </>
  );
}

function CertsTab({ c, set }) {
  return (
    <>
      <h2>Certifications</h2>
      <p className="adm-sub">Add, edit, reorder or delete. A credential link is optional.</p>
      <Collection items={c.certifications} onChange={(v) => set({ ...c, certifications: v })}
        blank={() => ({ title: "New certification", org: "", icon: "Award", link: "" })}
        title={(x) => x.title} sub={(x) => x.org} addLabel="Add a certification"
        render={(x, u) => (<>
          <Field label="Title" value={x.title} onChange={(v) => u({ ...x, title: v })} />
          <div className="adm-grid">
            <Field label="Issued by" value={x.org} onChange={(v) => u({ ...x, org: v })} />
            <Select label="Icon" value={x.icon || "Award"} onChange={(v) => u({ ...x, icon: v })} options={ICON_NAMES} />
          </div>
          <Field label="Credential link (optional)" value={x.link} onChange={(v) => u({ ...x, link: v })} placeholder="https://" />
        </>)} />
    </>
  );
}

function ProjectsTab({ c, set }) {
  return (
    <>
      <h2>Projects</h2>
      <p className="adm-sub">Add as many as you want — the grid grows to fit.</p>
      <Collection items={c.projects} onChange={(v) => set({ ...c, projects: v })}
        blank={() => ({ title: "New project", tag: "", period: "", desc: "", metric: "", stack: [], link: "", github: "" })}
        title={(p) => p.title} sub={(p) => p.period} addLabel="Add a project"
        render={(p, u) => (<>
          <div className="adm-grid">
            <Field label="Title" value={p.title} onChange={(v) => u({ ...p, title: v })} />
            <Field label="Label above the title" value={p.tag} onChange={(v) => u({ ...p, tag: v })} placeholder="Personal project" />
            <Field label="Period" value={p.period} onChange={(v) => u({ ...p, period: v })} />
            <Field label="Highlight result" value={p.metric} onChange={(v) => u({ ...p, metric: v })} placeholder="40% faster" />
            <Field label="Live link (optional)" value={p.link} onChange={(v) => u({ ...p, link: v })} placeholder="https://" />
            <Field label="Code link (optional)" value={p.github} onChange={(v) => u({ ...p, github: v })} placeholder="https://github.com/..." />
          </div>
          <Field label="Description" area value={p.desc} onChange={(v) => u({ ...p, desc: v })} />
          <Chips label="Tech stack" items={p.stack} onChange={(v) => u({ ...p, stack: v })} />
        </>)} />
    </>
  );
}

function PublishTab({ c, set, live, onPublished }) {
  const [s, setS] = useState(loadSettings), [log, setLog] = useState([]), [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const say = (t, k) => setLog((l) => [...l, { t, k }]);
  const upd = (k) => (v) => { const n = { ...s, [k]: v }; setS(n); saveSettings(n); };
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { say(e.message, "bad"); } setBusy(false); };

  return (
    <>
      <h2>Publish to your live site</h2>
      <div className="adm-note">
        Publishing saves your content into your GitHub repo. Netlify / Vercel rebuilds automatically and your site updates in about a minute.
        You need a GitHub token with <b>Contents: Read and write</b> access to the repo. It is stored only in this browser.
      </div>
      <div className="adm-grid">
        <Field label="GitHub username" value={s.owner} onChange={upd("owner")} />
        <Field label="Repository" value={s.repo} onChange={upd("repo")} />
        <Field label="Branch" value={s.branch} onChange={upd("branch")} />
        <Field label="Content file" value={s.path} onChange={upd("path")} hint="Leave as is unless you moved it" />
      </div>
      <Field label="GitHub token" type="password" value={s.token} onChange={upd("token")} hint="Create one at github.com → Settings → Developer settings → Personal access tokens" />
      <div className="adm-row">
        <button className="adm-btn" disabled={busy} onClick={() => run(async () => say(await testConnection(s), "good"))}>Test connection</button>
        <button className="adm-btn pri" disabled={busy} onClick={() => run(async () => {
          setLog([]);
          const out = await publish(c, s, (t) => say(t));
          set(out); onPublished(out);
          say("Published! Your site will update in about a minute.", "good");
        })}>{busy ? "Working…" : "Publish now"}</button>
      </div>
      <div className="adm-log">{log.length ? log.map((l, i) => <div key={i} className={l.k}>{l.t}</div>) : "Status messages appear here."}</div>
      <hr className="adm-sep" />
      <h2>Backup &amp; reset</h2>
      <div className="adm-row">
        <button className="adm-btn" onClick={() => downloadJson(c, "portfolio-content.json")}>Download backup</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { set(normalize(JSON.parse(await f.text()))); say("Backup loaded into the editor. Publish to make it live.", "good"); } catch (_) { say("That file isn't valid JSON.", "bad"); }
        }} />
        <button className="adm-btn" onClick={() => fileRef.current.click()}>Load a backup</button>
        <button className="adm-btn" onClick={() => { if (window.confirm("Discard your unpublished edits and go back to what is live?")) set(live); }}>Discard unpublished edits</button>
        <button className="adm-btn danger" onClick={() => { if (window.confirm("Reset everything in the editor to the original built-in content? (Nothing goes live until you publish.)")) set({ ...DEFAULT_CONTENT, admin: c.admin }); }}>Reset editor to default</button>
      </div>
      <hr className="adm-sep" />
      <h2>Reset the whole live website</h2>
      <p className="adm-sub">
        Puts your <b>live</b> portfolio back to the original default: the original bio, skills, education, certifications, projects, links, photo and resume.
        A backup of what is live right now downloads first, and your email settings are kept. The site updates in about a minute.
      </p>
      <button className="adm-btn danger" disabled={busy} onClick={() => run(async () => {
        if (!window.confirm("Reset the WHOLE live website to the default portfolio?\n\nA backup of the current live content will download first.")) return;
        setLog([]);
        try { downloadJson(live, "portfolio-live-backup.json"); say("Backup of the current live content downloaded."); } catch (_) { /* best effort */ }
        const out = await publish({ ...DEFAULT_CONTENT, admin: c.admin }, s, (t) => say(t));
        set(out); onPublished(out);
        say("Done. Your live website is being reset to the default portfolio. It updates in about a minute.", "good");
      })}>Reset live website to default</button>
    </>
  );
}

function SecurityTab({ c, set }) {
  const m = c.admin, up = (k) => (v) => set({ ...c, admin: { ...m, [k]: v } });
  const [cur, setCur] = useState(""), [n1, setN1] = useState(""), [n2, setN2] = useState(""), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const say = (t, k) => setMsg({ t, k });
  const change = async () => {
    setMsg(null);
    if ((await sha(cur)) !== localStorage.getItem(PASS_KEY)) return say("Your current passcode is wrong.", "bad");
    if (n1.length < 4) return say("Use at least 4 characters.", "bad");
    if (n1 !== n2) return say("The new passcodes don't match.", "bad");
    await setPasscode(n1); setCur(""); setN1(""); setN2("");
    if (mailReady(m)) {
      try { await sendMail(m, changedMail("changed from the admin panel")); say("Passcode changed. A notice was emailed to you.", "good"); }
      catch (e) { say("Passcode changed, but the email failed: " + e.message, "bad"); }
    } else say("Passcode changed. (Set up email below to be notified next time.)", "good");
  };
  return (
    <>
      <h2>Security</h2>
      <h3 style={{ fontSize: ".95rem", margin: "6px 0 10px" }}>Change passcode</h3>
      <div className="adm-grid">
        <Field label="Current passcode" type="password" value={cur} onChange={setCur} />
        <span />
        <Field label="New passcode" type="password" value={n1} onChange={setN1} />
        <Field label="Repeat new passcode" type="password" value={n2} onChange={setN2} />
      </div>
      <button className="adm-btn pri" onClick={change}>Change passcode</button>
      {msg && <div className={`adm-log ${msg.k}`} style={{ minHeight: 0 }}><div className={msg.k}>{msg.t}</div></div>}
      <hr className="adm-sep" />
      <h3 style={{ fontSize: ".95rem", margin: "6px 0 6px" }}>Email for passcode reset &amp; alerts</h3>
      <div className="adm-note">
        With email set up you get a message whenever the passcode changes, and “Forgot passcode?” can email you a reset code.
        It uses <b>EmailJS</b> (free): create a service for your Gmail, then a template whose <b>To</b> address is your email and whose body uses
        <code> {"{{subject}}"} </code>and<code> {"{{message}}"}</code>. Paste the three IDs below, <b>Save</b>, then <b>Publish</b> so it also works on other devices.
        These three values are public by design, and the message always goes to the address inside your template.
      </div>
      <div className="adm-grid">
        <Field label="EmailJS Service ID" value={m.serviceId} onChange={up("serviceId")} placeholder="service_xxxxxxx" />
        <Field label="EmailJS Template ID" value={m.templateId} onChange={up("templateId")} placeholder="template_xxxxxxx" />
      </div>
      <Field label="EmailJS Public Key" value={m.publicKey} onChange={up("publicKey")} />
      <div className="adm-row">
        <button className="adm-btn" disabled={busy} onClick={async () => {
          setBusy(true); setMsg(null);
          try { saveMailCfg(m); await sendMail(m, { subject: "Portfolio admin test email", message: "If you can read this, passcode emails are working." }); say("Test email sent. Check your inbox (and spam).", "good"); }
          catch (e) { say(e.message, "bad"); }
          setBusy(false);
        }}>Send test email</button>
      </div>
      <p className="adm-sub" style={{ marginTop: 14 }}>
        Forgot the passcode and email isn't set up? On the sign-in screen choose <b>Forgot passcode? → Verify with my GitHub token</b>.
      </p>
    </>
  );
}

const PROFILE_KEYS = ["name", "role", "location", "handle", "blurb", "tags", "photo", "resumeFile"];
const LINK_KEYS = ["email", "phone", "linkedin", "github", "instagram", "x"];
function resetSection(tab, c) {
  const d = DEFAULT_CONTENT, pick = (keys) => Object.fromEntries(keys.map((k) => [k, d.profile[k]]));
  switch (tab) {
    case "profile": return { ...c, profile: { ...c.profile, ...pick(PROFILE_KEYS) } };
    case "links": return { ...c, links: d.links, profile: { ...c.profile, ...pick(LINK_KEYS) } };
    case "about": return { ...c, facts: d.facts, marquee: d.marquee, identity: d.identity };
    case "skills": return { ...c, skills: d.skills };
    case "education": return { ...c, education: d.education };
    case "certs": return { ...c, certifications: d.certifications };
    case "projects": return { ...c, projects: d.projects };
    default: return c;
  }
}

const TABS = [["profile", "Profile"], ["links", "Links"], ["about", "About"], ["skills", "Skills"], ["education", "Education"], ["certs", "Certifications"], ["projects", "Projects"], ["security", "Security"], ["publish", "Publish"]];

const SECTION_OF = { profile: "hero", links: "contact", about: "about", skills: "skills", education: "education", certs: "certifications", projects: "projects" };
const DEVICES = [["Desktop", 1280], ["Tablet", 820], ["Phone", 390]];

// The prototype: your real site, in a frame, updating live as you type.
function Prototype({ c, tab }) {
  const frame = useRef(), stage = useRef();
  const [dev, setDev] = useState(0), [box, setBox] = useState({ w: 600, h: 600 }), [ver, setVer] = useState(0);
  const send = useCallback(() => { const w = frame.current && frame.current.contentWindow; if (w) w.postMessage({ type: "portfolio-draft", content: c }, "*"); }, [c]);

  useEffect(() => { const t = setTimeout(send, 120); return () => clearTimeout(t); }, [send]);
  useEffect(() => {
    const f = (e) => { if (frame.current && e.source === frame.current.contentWindow && e.data && e.data.type === "portfolio-preview-ready") send(); };
    window.addEventListener("message", f); return () => window.removeEventListener("message", f);
  }, [send]);
  useEffect(() => {
    const id = SECTION_OF[tab], w = frame.current && frame.current.contentWindow;
    if (id && w) w.postMessage({ type: "portfolio-scroll", id }, "*");
  }, [tab]);
  useEffect(() => {
    if (!stage.current) return;
    const ro = new ResizeObserver(() => setBox({ w: stage.current.clientWidth, h: stage.current.clientHeight }));
    ro.observe(stage.current); return () => ro.disconnect();
  }, []);

  const width = DEVICES[dev][1], k = Math.min(1, box.w / width), left = Math.max(0, (box.w - width * k) / 2);
  const src = window.location.href.split("#")[0] + "#/preview";
  return (
    <div className="adm-proto">
      <div className="adm-proto-bar">
        <b>Prototype</b>
        <span className="adm-badge ok">live</span>
        <span style={{ flex: 1 }} />
        {DEVICES.map(([n], i) => <button key={n} className={`adm-tab ${dev === i ? "on" : ""}`} aria-selected={dev === i} onClick={() => setDev(i)}>{n}</button>)}
        <button className="adm-mini" title="Reload preview" onClick={() => setVer((v) => v + 1)}>↻</button>
      </div>
      <div className="adm-proto-stage" ref={stage}>
        <iframe key={ver} ref={frame} name="portfolio-preview" title="Prototype of your site" src={src} onLoad={send}
          style={{ width, height: box.h / k, transform: `scale(${k})`, left }} />
      </div>
    </div>
  );
}

function Panel({ onLock }) {
  const [c, setC] = useState(() => loadDraft() || DEFAULT_CONTENT);
  const [live, setLive] = useState(DEFAULT_CONTENT);
  const [tab, setTab] = useState("profile");
  const [proto, setProto] = useState(() => window.innerWidth >= 980);
  const [mobileView, setMobileView] = useState("edit");
  const [vw, setVw] = useState(window.innerWidth);
  const first = useRef(true);
  useEffect(() => { const f = () => setVw(window.innerWidth); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);

  useEffect(() => {
    let dead = false;
    fetch(CONTENT_URL + "?v=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (dead) return;
      const l = j ? normalize(j) : DEFAULT_CONTENT; setLive(l);
      if (!localStorage.getItem(DRAFT_KEY)) setC(l);
    }).catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; if (!localStorage.getItem(DRAFT_KEY)) return; }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(c)); } catch (_) { /* storage full (very large upload) */ }
    saveMailCfg(c.admin);
  }, [c]);

  const dirty = JSON.stringify(c) !== JSON.stringify(live);
  const props = { c, set: setC };
  const narrow = vw < 980;
  const showProto = narrow ? mobileView === "proto" : proto;
  const showEditor = !(narrow && mobileView === "proto");
  return (
    <div className="adm-root">
      <div className="adm-top">
        <h1>Portfolio <span>Admin</span></h1>
        <span className={`adm-badge ${dirty ? "" : "ok"}`}>{dirty ? "Unpublished changes" : "Matches live site"}</span>
        {narrow
          ? <button className="adm-btn" onClick={() => setMobileView(mobileView === "edit" ? "proto" : "edit")}>{mobileView === "edit" ? "See prototype" : "Back to editing"}</button>
          : <button className="adm-btn" onClick={() => setProto(!proto)}>{proto ? "Hide prototype" : "Show prototype"}</button>}
        <button className="adm-btn pri" onClick={() => setTab("publish")}>Publish…</button>
        <button className="adm-btn" onClick={onLock}>Lock</button>
        <a className="adm-btn" href="#/">View site</a>
      </div>
      <div className="adm-tabs" role="tablist">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className="adm-tab" onClick={() => { setTab(id); if (narrow) setMobileView("edit"); }}>{label}</button>)}
      </div>
      <div className="adm-body">
        {showEditor && (
          <div className="adm-editor"><div className="adm-main">
            {tab === "profile" && <ProfileTab {...props} />}
            {tab === "links" && <LinksTab {...props} />}
            {tab === "about" && <AboutTab {...props} />}
            {tab === "skills" && <SkillsTab {...props} />}
            {tab === "education" && <EducationTab {...props} />}
            {tab === "certs" && <CertsTab {...props} />}
            {tab === "projects" && <ProjectsTab {...props} />}
            {tab === "security" && <SecurityTab {...props} />}
            {tab === "publish" && <PublishTab {...props} live={live} onPublished={setLive} />}
            {SECTION_OF[tab] && (
              <>
                <hr className="adm-sep" />
                <button className="adm-btn danger" onClick={() => { if (window.confirm("Reset this section to the original default content? (Nothing goes live until you publish.)")) setC(resetSection(tab, c)); }}>
                  Reset this section to default
                </button>
              </>
            )}
          </div></div>
        )}
        {showProto && <Prototype c={c} tab={tab} />}
      </div>
    </div>
  );
}

export default function Admin() {
  const [ok, setOk] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1" && !!localStorage.getItem(PASS_KEY));
  if (!ok) return <Gate onOk={() => setOk(true)} />;
  return <Panel onLock={() => { sessionStorage.removeItem(SESSION_KEY); setOk(false); }} />;
}
