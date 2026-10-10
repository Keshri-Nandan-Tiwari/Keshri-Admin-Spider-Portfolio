import { useEffect, useRef, useState, useCallback } from "react";
import "./admin.css";
import { DEFAULT_CONTENT, DRAFT_KEY, CONTENT_URL, normalize, loadDraft, assetUrl as rawAsset } from "../ContentContext";
import { ICON_NAMES } from "../icons";
import { loadSettings, saveSettings, clearSettings, clearToken, safeHook, testConnection, publish, checkLive, saveVaults, fetchRemoteAdmin } from "./github";
import { lockedFor, recordFail, recordOk, fmtWait } from "./throttle";
import { logEvent, readLog, clearLog } from "./auditlog";
import { seal, open as openVault, newRecoveryKey, cleanKey, MIN_PASS, vaultSupported, passcodeProblem, generatePasscode } from "./vault";
import { loadMailCfg, saveMailCfg, mailReady, sendMail, changedMail } from "./mail";

const SESSION_KEY = "portfolio-admin-unlocked";

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
      {area ? <textarea value={value || ""} placeholder={placeholder} maxLength={30000} onChange={(e) => onChange(e.target.value)} />
        : <input type={type} value={value || ""} placeholder={placeholder} maxLength={2000} autoComplete={type === "password" ? "off" : undefined} onChange={(e) => onChange(e.target.value)} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
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
function Collection({ items, onChange, blank, title, sub, addLabel, render, open: openProp, setOpen: setOpenProp }) {
  const [openLocal, setOpenLocal] = useState(null);
  const open = openProp !== undefined ? openProp : openLocal, setOpen = setOpenProp || setOpenLocal;
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
// One passcode, kept in your repo (locked), works on every device. Nobody can create a passcode of their own:
// the very first setup needs your GitHub token, and after that the editor only opens with THE passcode.
const ADMIN_SESSION = SESSION_KEY;

function Gate({ onOk }) {
  const [mode, setMode] = useState("loading"); // loading | setup | login | forgot | recovery | token | newpass
  const [admin, setAdmin] = useState({}), [reach, setReach] = useState(true);
  const [a, setA] = useState(""), [b, setB] = useState(""), [token, setToken] = useState(""), [rkey, setRkey] = useState("");
  const [err, setErr] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false);
  const verified = useRef(""); // token proven valid this session
  const [shown, setShown] = useState("");

  const load = async () => {
    setMode("loading");
    const r = await fetchRemoteAdmin(); setAdmin(r.admin); setReach(r.ok);
    setMode(r.admin && r.admin.vault ? "login" : "setup");
  };
  useEffect(() => {
    // remove leftovers from older versions (an unsalted passcode hash and a saved token must never stay in the browser)
    ["portfolio-admin-pass", "portfolio-admin-auth", "portfolio-admin-mail"].forEach((k) => { try { localStorage.removeItem(k); } catch (_) {} });
    try { sessionStorage.removeItem("portfolio-admin-reset"); } catch (_) {}
    loadSettings();
    load();
  }, []);

  const checkNew = () => {
    const prob = passcodeProblem(a);
    if (prob) { setErr(prob); return false; }
    if (a !== b) { setErr("The two passcodes don't match."); return false; }
    return true;
  };
  const suggest = () => { const p = generatePasscode(); setA(p); setB(p); setShown(p); setErr(""); };
  const guard = () => { const w = lockedFor(); if (w > 0) { setErr(`Too many wrong attempts. Try again in ${fmtWait(w)}.`); logEvent("locked", fmtWait(w)); return false; } return true; };
  const wrong = (what) => { const w = recordFail(); logEvent("signin_fail", what); return w > 0 ? `${what} Locked for ${fmtWait(w)}.` : what; };
  const enter = (tok) => { recordOk(); logEvent("signin_ok"); saveSettings({ token: tok }); sessionStorage.setItem(ADMIN_SESSION, "1"); onOk(); };
  const notify = async (how) => { if (mailReady(admin)) { try { await sendMail(admin, changedMail(how)); } catch (_) { /* best effort */ } } };

  // creates / replaces the passcode vault using a token we have just proven valid
  const lockWith = async (tok, how) => {
    const s = { ...loadSettings(), token: tok };
    await testConnection(s);
    await saveVaults(s, { vault: await seal(tok, a) });
    await notify(how);
    enter(tok);
  };

  const setup = async (e) => {
    e.preventDefault(); setErr("");
    if (!checkNew()) return;
    if (/^ghp_/.test(token.trim()) && !window.confirm("This looks like a CLASSIC token, which can reach ALL of your repositories — and it will be stored (locked) in a public repo.\n\nA fine-grained token limited to just this repo is much safer.\n\nContinue anyway?")) return;
    setBusy(true);
    try { await lockWith(token.trim(), "set up for the first time"); } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  const login = async (e) => {
    e.preventDefault(); setErr("");
    if (!guard()) return;
    setBusy(true);
    const tok = await openVault(admin.vault, a);
    if (!tok) setErr(wrong("Wrong passcode.")); else enter(tok);
    setBusy(false);
  };
  const useRecovery = async (e) => {
    e.preventDefault(); setErr("");
    if (!checkNew()) return;
    setBusy(true);
    try {
      if (!guard()) { setBusy(false); return; }
      const tok = await openVault(admin.recovery, cleanKey(rkey));
      if (!tok) throw new Error(wrong("That recovery key isn't right. Check the email you saved it in."));
      await lockWith(tok, "reset with the emailed recovery key");
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  const verifyToken = async (e) => {
    e.preventDefault(); setErr("");
    if (!guard()) return;
    setBusy(true);
    try { await testConnection({ ...loadSettings(), token: token.trim() }); verified.current = token.trim(); setInfo("Token verified. Choose a new passcode."); setMode("newpass"); }
    catch (e2) { setErr(/401|rejected/.test(e2.message) ? wrong(e2.message) : e2.message); }
    setBusy(false);
  };
  const saveNew = async (e) => {
    e.preventDefault(); setErr(""); if (!checkNew()) return;
    setBusy(true);
    try { await lockWith(verified.current, "reset with the GitHub token"); } catch (e2) { setErr(e2.message); }
    setBusy(false);
  };
  const back = (m) => () => { setErr(""); setMode(m); };
  const warn = !vaultSupported() && <p className="adm-err">This page isn't in a secure context. Open it on https:// or http://localhost.</p>;

  return (
    <div className="adm-root"><div className="adm-gate">
      {mode === "loading" && <form onSubmit={(e) => e.preventDefault()}><h1>Portfolio <span style={{ color: "#ff3355" }}>Admin</span></h1><p className="adm-sub">Checking…</p></form>}
      {mode === "setup" && (
        <form onSubmit={setup}>
          <h1>Set up <span style={{ color: "#ff3355" }}>admin</span></h1>
          <p className="adm-sub">First time: create the admin passcode. It will work on every device, and only people you give it to can use it.
            Your GitHub token (which can write to this site's repo) is needed once so only <b>you</b> can create it.</p>
          {!reach && <p className="adm-err">Couldn't reach GitHub just now. Check your connection and try again.</p>}
          {warn}
          <Field label="GitHub token" type="password" value={token} onChange={setToken} hint="Best: a fine-grained token limited to this one repo, with Contents: Read and write." />
          <Field label="New admin passcode" type="password" value={a} onChange={setA} hint={`At least ${MIN_PASS} characters. Because the locked key lives in a public repo, make it long and unguessable — or let us suggest one.`} />
          <Field label="Repeat passcode" type="password" value={b} onChange={setB} />
          <button type="button" className="adm-btn" style={{ width: "100%", marginBottom: 12 }} onClick={suggest}>Suggest a strong passcode</button>
          {shown && <div className="adm-note">Your passcode: <b style={{ wordBreak: "break-all" }}>{shown}</b><br />Save it in a password manager now — it can't be shown again.</div>}
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }} disabled={busy}>{busy ? "Setting up…" : "Create admin passcode"}</button>
        </form>
      )}
      {mode === "login" && (
        <form onSubmit={login}>
          <h1>Portfolio <span style={{ color: "#ff3355" }}>Admin</span></h1>
          <p className="adm-sub">Enter the admin passcode to continue.</p>
          {warn}
          <Field label="Passcode" type="password" value={a} onChange={setA} />
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }} disabled={busy}>{busy ? "Unlocking…" : "Unlock"}</button>
          <button type="button" className="adm-link" onClick={back("forgot")}>Forgot passcode?</button>
        </form>
      )}
      {mode === "forgot" && (
        <form onSubmit={(e) => e.preventDefault()}>
          <h1>Reset passcode</h1>
          <p className="adm-sub">Pick a way to prove it's you.</p>
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%", marginBottom: 10 }} disabled={!admin.recovery} onClick={back("recovery")}>Use my emailed recovery key</button>
          {!admin.recovery && <p className="adm-sub" style={{ marginTop: -4 }}>No recovery key was set up. (Admin → Security → “Email me a recovery key”.)</p>}
          <button className="adm-btn" style={{ width: "100%" }} onClick={back("token")}>Verify with my GitHub token</button>
          <button type="button" className="adm-link" onClick={back("login")}>← Back</button>
        </form>
      )}
      {mode === "recovery" && (
        <form onSubmit={useRecovery}>
          <h1>Recovery key</h1>
          <p className="adm-sub">Open the email titled “Your portfolio admin recovery key”, paste the key, then choose a new passcode.</p>
          <Field label="Recovery key" value={rkey} onChange={setRkey} placeholder="ABCDE-FGHJK-LMNPQ-RSTUV" />
          <Field label="New passcode" type="password" value={a} onChange={setA} />
          <Field label="Repeat new passcode" type="password" value={b} onChange={setB} />
          <button type="button" className="adm-btn" style={{ width: "100%", marginBottom: 12 }} onClick={suggest}>Suggest a strong passcode</button>
          {shown && <div className="adm-note">Your passcode: <b style={{ wordBreak: "break-all" }}>{shown}</b><br />Save it in a password manager now.</div>}
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }} disabled={busy}>{busy ? "Checking…" : "Set new passcode"}</button>
          <button type="button" className="adm-link" onClick={back("forgot")}>← Back</button>
        </form>
      )}
      {mode === "token" && (
        <form onSubmit={verifyToken}>
          <h1>Verify with GitHub</h1>
          <p className="adm-sub">Paste the GitHub token you use to publish. It is only checked with GitHub.</p>
          <Field label="GitHub token" type="password" value={token} onChange={setToken} />
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }} disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
          <button type="button" className="adm-link" onClick={back("forgot")}>← Back</button>
        </form>
      )}
      {mode === "newpass" && (
        <form onSubmit={saveNew}>
          <h1>New passcode</h1>
          <p className="adm-sub">{info}</p>
          <Field label="Passcode" type="password" value={a} onChange={setA} hint={`At least ${MIN_PASS} characters.`} />
          <Field label="Repeat passcode" type="password" value={b} onChange={setB} />
          <button type="button" className="adm-btn" style={{ width: "100%", marginBottom: 12 }} onClick={suggest}>Suggest a strong passcode</button>
          {shown && <div className="adm-note">Your passcode: <b style={{ wordBreak: "break-all" }}>{shown}</b><br />Save it in a password manager now.</div>}
          {err && <p className="adm-err">{err}</p>}
          <button className="adm-btn pri" style={{ width: "100%" }} disabled={busy}>{busy ? "Saving…" : "Save passcode"}</button>
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

const LAYOUTS = [
  ["text", "Writing (paragraphs, bullets, links)"], ["cards", "Cards (icon + title + text)"], ["tags", "Tags / chips"], ["timeline", "Timeline"],
  ["stats", "Numbers / stats"], ["links", "Link buttons"], ["gallery", "Photo gallery"],
];
const newSection = (name) => ({ id: Math.random().toString(36).slice(2, 8), title: name, eyebrow: "", heading: name, type: "text", icon: "Sparkles", showInMenu: true, items: [], tags: [], text: "" });

function ItemEditor({ type, it, u, icon }) {
  const imgRef = useRef();
  if (type === "timeline") return (<>
    <div className="adm-grid"><Field label="Title" value={it.title} onChange={(v) => u({ ...it, title: v })} /><Field label="When" value={it.period} onChange={(v) => u({ ...it, period: v })} placeholder="2024 – Present" /></div>
    <Field label="Description" area value={it.text} onChange={(v) => u({ ...it, text: v })} />
  </>);
  if (type === "stats") return (<div className="adm-grid"><Field label="Number / value" value={it.value} onChange={(v) => u({ ...it, value: v })} placeholder="40%" /><Field label="Label" value={it.label} onChange={(v) => u({ ...it, label: v })} placeholder="faster delivery" /></div>);
  if (type === "links") return (<div className="adm-grid"><Field label="Title" value={it.title} onChange={(v) => u({ ...it, title: v })} /><Field label="URL" value={it.url} onChange={(v) => u({ ...it, url: v })} placeholder="https://" /></div>);
  if (type === "gallery") return (<>
    <div className="adm-photo">
      {it.image ? <img src={assetPreview(it.image)} alt="" style={{ width: 130, height: 90 }} /> : <div className="adm-noimg">No photo yet</div>}
      <div>
        <input ref={imgRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) u({ ...it, image: await resizeImage(f, 1200) }); }} />
        <button className="adm-btn" onClick={() => imgRef.current.click()}>{it.image ? "Change photo" : "Choose photo"}</button>
      </div>
    </div>
    <Field label="Caption (optional)" value={it.caption} onChange={(v) => u({ ...it, caption: v })} />
  </>);
  return (<>
    <div className="adm-grid"><Field label="Title" value={it.title} onChange={(v) => u({ ...it, title: v })} /><Select label="Icon" value={it.icon || icon || "Star"} onChange={(v) => u({ ...it, icon: v })} options={ICON_NAMES} /></div>
    <Field label="Description (optional)" area value={it.text} onChange={(v) => u({ ...it, text: v })} />
    <Field label="Link (optional)" value={it.link} onChange={(v) => u({ ...it, link: v })} placeholder="https://" />
  </>);
}
const assetPreview = (p) => (String(p).startsWith("/uploads/") ? rawAsset(p) : p);
const blankItem = (type, icon) => ({ cards: { title: "New item", text: "", icon: icon || "Star", link: "" }, timeline: { title: "New entry", period: "", text: "" }, stats: { value: "", label: "" }, links: { title: "New link", url: "" }, gallery: { image: "", caption: "" } }[type] || { title: "New item" });
const itemTitle = (type, it) => (type === "stats" ? `${it.value || ""} ${it.label || ""}`.trim() : type === "gallery" ? it.caption || (it.image ? "Photo" : "(no photo)") : it.title);

const BUILTIN_SECTIONS = [["about", "About"], ["education", "Education"], ["certifications", "Certifications"], ["skills", "Skills"], ["projects", "Projects"]];

function SectionsTab({ c, set }) {
  const [name, setName] = useState(""), [open, setOpen] = useState(null);
  const L = c.layout, toggle = (key, id) => set({ ...c, layout: { ...L, [key]: L[key].includes(id) ? L[key].filter((x) => x !== id) : [...L[key], id] } });
  const add = () => { const n = name.trim(); if (!n) return; set({ ...c, sections: [...c.sections, newSection(n)] }); setOpen(c.sections.length); setName(""); };
  return (
    <>
      <h2>Your own sections</h2>
      <p className="adm-sub">
        Type any name you like — Volunteering, My Story, Open Source, Travel, anything — and press <b>Add</b>. Then write whatever you want inside it.
        It shows on your site before Contact and appears in the top-right menu automatically; delete it and it disappears from both.
      </p>
      <div className="adm-chipadd" style={{ marginBottom: 14 }}>
        <input className="adm-in" value={name} placeholder="Type a section name…" onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button className="adm-btn pri" onClick={add}>+ Add section</button>
      </div>
      <Collection open={open} setOpen={setOpen} items={c.sections} onChange={(v) => set({ ...c, sections: v })} blank={() => newSection("New section")}
        title={(x) => x.title || x.heading} sub={(x) => (x.showInMenu === false ? "not in menu" : "in menu")} addLabel="Add an untitled section"
        render={(x, u) => (<>
          <div className="adm-grid">
            <Field label="Menu name" value={x.title} onChange={(v) => u({ ...x, title: v })} hint="Shown in the top-right menu" />
            <Field label="Heading on the page" value={x.heading} onChange={(v) => u({ ...x, heading: v })} />
            <Field label="Small label above the heading (optional)" value={x.eyebrow} onChange={(v) => u({ ...x, eyebrow: v })} />
            <Select label="Show in the top-right menu" value={x.showInMenu === false ? "No" : "Yes"} onChange={(v) => u({ ...x, showInMenu: v === "Yes" })} options={["Yes", "No"]} />
            <Select label="Menu icon" value={x.icon || "Sparkles"} onChange={(v) => u({ ...x, icon: v })} options={ICON_NAMES} />
            <Select label="How it looks" value={x.type || "text"} onChange={(v) => u({ ...x, type: v })} options={LAYOUTS} />
          </div>
          {(x.type || "text") === "text" && (
            <Field label="Write here" area value={x.text} onChange={(v) => u({ ...x, text: v })}
              hint="Blank line = new paragraph · “- ” starts a bullet · “# ” makes a subheading · **bold** · [link text](https://…)" />
          )}
          {x.type === "tags" && <Chips label="Tags" items={x.tags} onChange={(v) => u({ ...x, tags: v })} placeholder="Type and press Enter" />}
          {x.type && x.type !== "text" && x.type !== "tags" && (
            <Collection items={x.items || []} onChange={(v) => u({ ...x, items: v })} blank={() => blankItem(x.type, x.icon)}
              title={(it) => itemTitle(x.type, it)} addLabel="Add an item"
              render={(it, iu) => <ItemEditor type={x.type} it={it} u={iu} icon={x.icon} />} />
          )}
        </>)} />
      <hr className="adm-sep" />
      <h2>Page sections &amp; menu</h2>
      <p className="adm-sub">Hide any built-in section, or keep it out of the top-right menu. Numbers close up automatically.</p>
      {BUILTIN_SECTIONS.map(([id, label]) => (
        <div className="adm-card" key={id}>
          <div className="adm-card-head" style={{ cursor: "default" }}>
            <b>{label}</b>
            <label className="adm-check" style={{ margin: 0 }}><input type="checkbox" checked={!L.hide.includes(id)} onChange={() => toggle("hide", id)} /> On the page</label>
            <label className="adm-check" style={{ margin: 0 }}><input type="checkbox" checked={!L.noMenu.includes(id) && !L.hide.includes(id)} disabled={L.hide.includes(id)} onChange={() => toggle("noMenu", id)} /> In the menu</label>
          </div>
        </div>
      ))}
    </>
  );
}

function PublishTab({ c, set, live, onPublished }) {
  const [s, setS] = useState(loadSettings), [log, setLog] = useState([]), [busy, setBusy] = useState(false), [st, setSt] = useState(null);
  const fileRef = useRef();
  const say = (t, k) => setLog((l) => [...l, { t, k }]);
  const upd = (k) => (v) => { const n = { ...s, [k]: v }; setS(n); saveSettings(n); setS(loadSettings()); };
  const [hookText, setHookText] = useState(s.deployHook);
  // only a real Netlify / Vercel hook is ever stored; anything else is shown with a warning and not saved
  const onHook = (v) => { setHookText(v); if (v.trim() === "" || safeHook(v)) { saveSettings({ deployHook: safeHook(v) }); setS(loadSettings()); } };
  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { logEvent("publish_fail", e.message); say(e.message, "bad"); } setBusy(false); };
  const onLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.protocol === "file:";

  // After publishing: confirm GitHub has it, then watch the deployed site catch up.
  const watch = async (stamp) => {
    setSt({ gh: "…", site: onLocal ? "n/a" : "waiting" });
    for (let i = 0; i < 24; i++) {
      const r = await checkLive(s);
      const gh = r.repo === stamp ? "ok" : "…";
      const site = onLocal ? "n/a" : r.site === stamp ? "ok" : "waiting";
      setSt({ gh, site });
      if (gh === "ok" && site !== "waiting") return;
      await new Promise((res) => setTimeout(res, 8000));
    }
    setSt((x) => ({ ...x, site: "slow" }));
  };

  return (
    <>
      <h2>Publish to your live site</h2>
      <div className="adm-note">
        Publishing saves your content into your GitHub repo. Visitors see it within about 30 seconds because the site reads it straight from GitHub,
        and Netlify / Vercel also redeploys from the new commit (that's what updates your photo and resume files).
      </div>
      <div className="adm-target">Publishing to <b>{s.owner}/{s.repo}</b> · branch <b>{s.branch}</b></div>
      <Field label="Netlify / Vercel deploy hook (optional)" value={hookText} onChange={onHook}
        hint="Netlify: Site configuration → Build & deploy → Build hooks → Add. Must be an https://api.netlify.com/… (or api.vercel.com) URL. Treat it like a password." />
      {hookText.trim() !== "" && !safeHook(hookText) && <p className="adm-err">That isn't a valid Netlify/Vercel deploy hook URL, so it won't be used or saved.</p>}
      <label className="adm-check"><input type="checkbox" checked={s.advanced} onChange={(e) => upd("advanced")(e.target.checked)} /> Advanced: publish to a different repo</label>
      {s.advanced && (
        <div className="adm-grid">
          <Field label="GitHub username" value={s.owner} onChange={upd("owner")} />
          <Field label="Repository" value={s.repo} onChange={upd("repo")} />
          <Field label="Branch" value={s.branch} onChange={upd("branch")} />
          <Field label="Content file" value={s.path} onChange={upd("path")} />
        </div>
      )}
      <Field label="GitHub token (signed in)" type="password" value={s.token} onChange={upd("token")} />
      <div className="adm-row">
        <button className="adm-btn" disabled={busy} onClick={() => run(async () => say(await testConnection(s), "good"))}>Test connection</button>
        <button className="adm-btn pri" disabled={busy} onClick={() => run(async () => {
          setLog([]); setSt(null);
          const out = await publish(c, s, (t) => say(t));
          set(out); onPublished(out); logEvent("publish_ok");
          say("Saved to GitHub. Your site updates in about 30 seconds.", "good");
          watch(out.meta.updatedAt);
        })}>{busy ? "Working…" : "Publish now"}</button>
        <button className="adm-btn" disabled={busy} onClick={() => run(async () => { const r = await checkLive(s); say(`GitHub has: ${r.repo || "nothing published yet"}` + (onLocal ? "" : ` · deployed site has: ${r.site || "nothing yet"}`)); })}>Check live status</button>
      </div>
      {st && (
        <div className="adm-status">
          <div>GitHub repo: <b className={st.gh === "ok" ? "good" : ""}>{st.gh === "ok" ? "updated ✓" : "checking…"}</b></div>
          <div>Netlify / live site: <b className={st.site === "ok" ? "good" : ""}>{
            st.site === "ok" ? "deployed ✓" : st.site === "n/a" ? "open the admin on your live site to see this" : st.site === "slow" ? "still deploying — check Netlify → Deploys" : "deploying…"
          }</b></div>
        </div>
      )}
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
        Puts your <b>live</b> portfolio back to the original default: the original bio, skills, education, certifications, projects, links, photo and resume (extra sections are removed).
        A backup of what is live right now downloads first, and your email settings are kept.
      </p>
      <button className="adm-btn danger" disabled={busy} onClick={() => run(async () => {
        if (!window.confirm("Reset the WHOLE live website to the default portfolio?\n\nA backup of the current live content will download first.")) return;
        setLog([]); setSt(null);
        try { downloadJson(live, "portfolio-live-backup.json"); say("Backup of the current live content downloaded."); } catch (_) { /* best effort */ }
        const out = await publish({ ...DEFAULT_CONTENT, admin: c.admin }, s, (t) => say(t));
        set(out); onPublished(out); logEvent("live_site_reset");
        say("Done. Your live website is being reset to the default portfolio.", "good");
        watch(out.meta.updatedAt);
      })}>Reset live website to default</button>
    </>
  );
}

function SecurityTab({ c, set }) {
  const m = c.admin, up = (k) => (v) => set({ ...c, admin: { ...m, [k]: v } });
  const [cur, setCur] = useState(""), [n1, setN1] = useState(""), [n2, setN2] = useState("");
  const [tkPass, setTkPass] = useState(""), [tkNew, setTkNew] = useState("");
  const [msg, setMsg] = useState(null), [busy, setBusy] = useState(false);
  const say = (t, k) => setMsg({ t, k });
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { say(e.message, "bad"); } setBusy(false); };
  const mail = async (subject, message, code) => { if (mailReady(m)) { try { await sendMail(m, { subject, message, code }); return true; } catch (_) { return false; } } return false; };

  const changePass = () => run(async () => {
    const s = loadSettings(), { admin } = await fetchRemoteAdmin();
    const tok = admin.vault ? await openVault(admin.vault, cur) : null;
    if (!tok) throw new Error("Your current passcode is wrong.");
    const prob = passcodeProblem(n1); if (prob) throw new Error(prob);
    if (n1 !== n2) throw new Error("The new passcodes don't match.");
    await saveVaults({ ...s, token: tok }, { vault: await seal(tok, n1) });
    logEvent("passcode_changed");
    setCur(""); setN1(""); setN2("");
    const sent = await mail(changedMail("changed").subject, changedMail("changed from the admin panel").message);
    say("Passcode changed on every device." + (sent ? " A notice was emailed to you." : mailReady(m) ? " (The notice email failed.)" : ""), "good");
  });

  const sendRecovery = () => run(async () => {
    if (!mailReady(m)) throw new Error("Fill in and save the email settings below first.");
    const s = loadSettings();
    if (!s.token) throw new Error("Sign in again first.");
    const key = newRecoveryKey();
    await saveVaults(s, { recovery: await seal(s.token, key) });
    logEvent("recovery_key_sent");
    await sendMail(m, { subject: "Your portfolio admin recovery key", code: key, message: `Your recovery key is ${key}. Keep this email safe. If you ever forget the admin passcode, choose “Forgot passcode → Use my emailed recovery key” and paste it.` });
    say("Recovery key emailed. Keep that email — it's your way back in if you forget the passcode.", "good");
  });

  const replaceToken = () => run(async () => {
    const { admin } = await fetchRemoteAdmin();
    const old = admin.vault ? await openVault(admin.vault, tkPass) : null;
    if (!old) throw new Error("The admin passcode is wrong.");
    const nt = tkNew.trim();
    const s = { ...loadSettings(), token: nt };
    await testConnection(s);
    // the old token is needed only if the new one cannot write yet; the new one is what we store from now on
    await saveVaults(s, { vault: await seal(nt, tkPass), recovery: null });
    saveSettings({ token: nt }); setTkPass(""); setTkNew(""); logEvent("token_replaced");
    say("GitHub token replaced for every device." + (admin.recovery ? " The old recovery key no longer works — send a new one below." : "") + " Remember to delete the old token on GitHub.", "good");
  });

  return (
    <>
      <h2>Security</h2>
      <div className="adm-note">
        <b>How access works:</b> one admin passcode opens this editor on <b>any device</b>. Nobody can create a passcode of their own, and nothing goes live without the publishing key the passcode unlocks.
        Give the passcode only to people you trust.
      </div>
      <h3 style={{ fontSize: ".95rem", margin: "6px 0 10px" }}>Change passcode</h3>
      <div className="adm-grid">
        <Field label="Current passcode" type="password" value={cur} onChange={setCur} />
        <span />
        <Field label="New passcode" type="password" value={n1} onChange={setN1} hint={`At least ${MIN_PASS} characters`} />
        <Field label="Repeat new passcode" type="password" value={n2} onChange={setN2} />
      </div>
      <button className="adm-btn pri" disabled={busy} onClick={changePass}>Change passcode</button>
      {msg && <div className="adm-log" style={{ minHeight: 0 }}><div className={msg.k}>{msg.t}</div></div>}
      <hr className="adm-sep" />
      <h3 style={{ fontSize: ".95rem", margin: "6px 0 6px" }}>Email: alerts &amp; recovery key</h3>
      <div className="adm-note">
        Uses <b>EmailJS</b> (free): connect your Gmail, then create a template whose <b>To</b> address is your email and whose body has
        <code> {"{{subject}}"} </code>and<code> {"{{message}}"}</code>. Paste the three IDs, press <b>Save &amp; test</b>, then <b>Publish</b>.
        You'll get an email whenever the passcode changes, and <b>Email me a recovery key</b> sends you a key that gets you back in if you forget the passcode.
      </div>
      <div className="adm-grid">
        <Field label="EmailJS Service ID" value={m.serviceId} onChange={up("serviceId")} placeholder="service_xxxxxxx" />
        <Field label="EmailJS Template ID" value={m.templateId} onChange={up("templateId")} placeholder="template_xxxxxxx" />
      </div>
      <Field label="EmailJS Public Key" value={m.publicKey} onChange={up("publicKey")} />
      <div className="adm-row">
        <button className="adm-btn" disabled={busy} onClick={() => run(async () => {
          saveMailCfg(m); await sendMail(m, { subject: "Portfolio admin test email", message: "If you can read this, admin emails are working." });
          say("Test email sent. Check your inbox (and spam). Press Publish so the settings work on other devices.", "good");
        })}>Save &amp; send test email</button>
        <button className="adm-btn pri" disabled={busy} onClick={sendRecovery}>Email me a recovery key</button>
      </div>
      <hr className="adm-sep" />
      <h3 style={{ fontSize: ".95rem", margin: "6px 0 6px" }}>Replace GitHub token</h3>
      <p className="adm-sub">Tokens can expire, and replacing one cuts off anyone who has used your passcode before. Create a new fine-grained token on GitHub (this repo, Contents: Read and write), paste it here, then delete the old one.</p>
      <div className="adm-grid">
        <Field label="Admin passcode" type="password" value={tkPass} onChange={setTkPass} />
        <Field label="New GitHub token" type="password" value={tkNew} onChange={setTkNew} />
      </div>
      <button className="adm-btn" disabled={busy} onClick={replaceToken}>Replace token</button>
      <hr className="adm-sep" />
      <h3 style={{ fontSize: ".95rem", margin: "6px 0 6px" }}>Activity on this device</h3>
      <p className="adm-sub">A private log of sign-ins, wrong attempts and publishes on this device. The full history of every change to your live site is on GitHub:
        {" "}<a href={`https://github.com/${loadSettings().owner}/${loadSettings().repo}/commits/${loadSettings().branch}`} target="_blank" rel="noopener noreferrer" style={{ color: "#ff3355" }}>view commit history ↗</a>.
        Turn on GitHub's email alerts, Dependabot and secret scanning for the repo (Settings → Code security).</p>
      <div className="adm-log" style={{ maxHeight: 220, overflow: "auto" }}>
        {readLog().length ? readLog().map((e, i) => <div key={i} className={/fail|locked/.test(e.type) ? "bad" : ""}>{new Date(e.t).toLocaleString()} · {e.type}{e.detail ? " · " + e.detail : ""}</div>) : "Nothing yet."}
      </div>
      <button className="adm-btn" style={{ marginTop: 8 }} onClick={() => { clearLog(); setMsg(null); }}>Clear log</button>
      <hr className="adm-sep" />
      <button className="adm-btn danger" onClick={() => {
        if (!window.confirm("Sign out and remove this session's key? You'll need the passcode to come back.")) return;
        sessionStorage.removeItem(SESSION_KEY); clearSettings(); window.location.reload();
      }}>Sign out now</button>
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
    case "sections": return { ...c, sections: [], layout: { hide: [], noMenu: [] } };
    default: return c;
  }
}

const TABS = [["profile", "Profile"], ["links", "Links"], ["about", "About"], ["skills", "Skills"], ["education", "Education"], ["certs", "Certifications"], ["projects", "Projects"], ["sections", "Sections"], ["security", "Security"], ["publish", "Publish"]];

const SECTION_OF = { profile: "hero", links: "contact", about: "about", skills: "skills", education: "education", certs: "certifications", projects: "projects", sections: "sections" };
const targetId = (tab, c) => (tab === "sections" ? (c.sections[0] ? `sec-${c.sections[0].id}` : "projects") : SECTION_OF[tab]);
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
    const last = c.sections[c.sections.length - 1], w = frame.current && frame.current.contentWindow;
    if (tab === "sections" && last && w) w.postMessage({ type: "portfolio-scroll", id: `sec-${last.id}` }, "*");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.sections.length]);
  useEffect(() => {
    const id = targetId(tab, c), w = frame.current && frame.current.contentWindow;
    if (id && w) w.postMessage({ type: "portfolio-scroll", id }, "*");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {tab === "sections" && <SectionsTab {...props} />}
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

const IDLE_MS = 30 * 60 * 1000; // sign out after 30 minutes without activity

export default function Admin() {
  const [ok, setOk] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1" && !!loadSettings().token);
  const last = useRef(Date.now());
  const lock = () => { sessionStorage.removeItem(SESSION_KEY); clearToken(); setOk(false); };

  useEffect(() => {
    if (!ok) return;
    const bump = () => { last.current = Date.now(); };
    const evs = ["pointerdown", "keydown", "scroll"];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => { if (Date.now() - last.current > IDLE_MS) { logEvent("auto_lock"); lock(); } }, 30000);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); };
  }, [ok]);

  if (!ok) return <Gate onOk={() => { last.current = Date.now(); setOk(true); }} />;
  return <Panel onLock={lock} />;
}
