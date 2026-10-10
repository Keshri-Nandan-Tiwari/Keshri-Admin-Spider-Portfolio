# Keshri Nandan Tiwari — Portfolio

A fresh React + Vite portfolio: intro loader (Ready to begin? → HELLO! → I am KESHRI →
a metallic zipper opens left to right, revealing the site),
a full-screen animated 3D background (rotating wireframe shapes + starfield), a
looping "about me" facts widget, and exactly three themes — Obsidian (black),
Midnight (blue), Crimson (red).

## Run it locally (Termux)

```bash
# unzip and enter the project
unzip portfolio.zip
cd portfolio

# install once (needs internet the first time only, to download packages)
npm install

# start it, exposed on your local network too
npm run dev -- --host
```

You'll see something like:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

Open the `Local` link directly in Chrome on the same phone — that's the full
site. Use the `Network` link to view it from another device on the same Wi-Fi.

To stop the server: `Ctrl+C` in that Termux session.

## What's still placeholder

- **Your photo** — the hero currently shows an auto-generated initials avatar
  (`hero-photo-wrap` in `src/components/Hero.jsx`). Drop your real photo into
  `public/` (e.g. `public/photo.jpg`) and change the `src` there.
- **Background removal** — you mentioned removing a "DNA" graphic from your
  photo's background. Send me the actual photo (not a screenshot) and I'll
  clean it up and drop it straight into this same project.
- **Contact form** — currently opens the visitor's email app pre-filled
  (`mailto:`), so it works with zero backend. If you want it to submit
  silently to your inbox instead, that needs a small backend or a service
  like Formspree — say the word and I'll wire it in.

## Structure

```
portfolio/
├── src/
│   ├── data/content.js      ← all text content in one place — edit here first
│   ├── components/          ← Loader, Scene3D, Hero, LoopingFacts, etc.
│   ├── ThemeContext.jsx     ← the 3-theme switcher
│   ├── App.jsx
│   ├── App.css
│   └── index.css            ← theme color tokens (black / blue / red)
└── index.html
```

## Deploy

Same as before — build and drag the `dist/` folder to Netlify, or connect
the repo and set build command `npm run build`, publish directory `dist`.

## Admin panel

Open **`/#/admin`** on your site (or use **Admin** at the end of the top-right menu, or press **Ctrl/Cmd + Shift + A**).

**Access:** one admin passcode, which works on every device. The first time, you create it with your GitHub token
(a fine-grained token limited to this repo, Contents: Read and write is best). The token is stored in this repo locked
with the passcode (AES-256, PBKDF2), so only people you give the passcode to can open the editor and publish.
Nobody can create a passcode of their own. Use a long passcode (10+ characters).

**Forgot it?** Use the recovery key you emailed yourself (Security → Email me a recovery key), or verify with your GitHub token.
To lock someone out completely, use Security → Replace GitHub token (and delete the old token on GitHub).

**What you can manage:** profile, bio, photo, resume, contact details and extra links, About lines, skills, education
(with optional score), certifications, projects, and **any extra sections you like** (cards, tags, text, timeline, numbers,
link buttons, photo galleries) that can also appear in the top-right menu.

**Publishing:** saves `public/content.json` (and any new photos/resume) to the repo configured in `src/siteConfig.js`.
The live site reads that file straight from GitHub (updates in about 30 seconds) and Netlify/Vercel redeploys from the commit.
Optionally paste a Netlify build hook in the Publish tab to force a rebuild every time.

## Security
See `SECURITY.md` (how it is protected, what to do if something goes wrong) and `SECURITY_AUDIT.md` (the full audit).
Run `sh scripts/security-check.sh` regularly to scan your files and git history for leaked secrets.
