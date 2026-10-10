# Security

## How this site is protected
- **Static site, no server of your own.** There is no database, no login server and no secret key in the code.
  Visitors can only *read* your site.
- **Only the owner can change it.** Changes are saved to your GitHub repo, which only your GitHub token can write to.
  The admin panel (`/#/admin`) opens with one passcode; your publishing key is stored locked (AES-256-GCM, key from
  PBKDF2-SHA256 with 600,000 rounds) and only lives in the browser tab while you are signed in.
  Wrong guesses are slowed down, you are signed out after 30 minutes idle, and every publish is a commit you can see on GitHub.
- **Untrusted input everywhere.** Everything read from `content.json` or typed in the editor is length-limited and its links
  are restricted to `http(s)`; React escapes all text; no `dangerouslySetInnerHTML` is used.
- **Browser protections** (`netlify.toml`): Content-Security-Policy, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.

## If something goes wrong
1. **Token leaked or a helper should lose access:** GitHub → Settings → Developer settings → delete the token, create a new
   fine-grained one (this repo only, Contents: Read and write), then Admin → Security → *Replace GitHub token*.
2. **Forgot the passcode:** use the emailed recovery key, or "Verify with my GitHub token" on the sign-in screen.
3. **Site content looks wrong:** GitHub → the repo → `public/content.json` → History → restore an earlier version, or Admin → Publish → *Reset the whole live website*.

## Keep it healthy
- Run `sh scripts/security-check.sh` now and then (secrets in files and in git history, tracked sensitive files, packages).
- Turn on, in the repo's Settings → Code security: **Dependabot alerts**, **secret scanning + push protection**, and email alerts.
- Use a **fine-grained token** limited to this one repo. Never use a classic token for the admin panel.
- Never put secrets in `VITE_…` variables: anything with that prefix is baked into the public website.

## Reporting a problem
Open a private security advisory on the repo (Security tab → Report a vulnerability).
