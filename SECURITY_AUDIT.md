# Security audit — Keshri's portfolio

What was checked, what was changed, and what is still **your** job. "Done" means it is in this project and was tested.

| # | Area | Status | Details |
|---|------|--------|---------|
| 1 | Hide API keys / secrets | **Done** | No keys, tokens or passwords found in any file (pattern scan). The only secrets the site handles: your GitHub token (locked in the repo with your passcode, session-only in the browser), your Netlify deploy hook (this browser only, validated), and EmailJS public key (public by design). |
| 2 | Environment variables | **Done** | The app reads no env vars except Vite's `BASE_URL`. `.gitignore` now blocks `.env`, `.env.*`, `*.pem`, `*.key`. Reminder: any `VITE_…` variable becomes public in the built site. |
| 3 | Protect admin routes | **Done (with a caveat)** | `/#/admin` shows a gate until the passcode unlocks it; it is `noindex`. A front-end gate alone is not a security boundary: the real boundary is that **nothing can be published without your GitHub token**. |
| 4 | Authentication | **Done** | Passcode ≥ 12 chars with a weak-pattern check and a strong-passcode generator; PBKDF2-SHA256 (600k) + AES-GCM; first setup requires your GitHub token so nobody else can create the passcode; attempts throttled (5 free, then 30 s … 15 min); auto sign-out after 30 min idle; token kept only for the tab session. |
| 5 | Access control | **Done** | Visitors: read-only. Editing/publishing: only with a token that can write to the repo. Helpers: add as GitHub collaborators or share the passcode, and revoke by *Replace GitHub token*. There are no other user roles to manage. |
| 6 | Sanitize forms | **Done** | Contact form: length caps, control characters stripped, single-line fields can't smuggle line breaks, address validated. Admin fields: length caps; all content is sanitized when loaded and again before publishing. |
| 7 | XSS | **Done** | React escapes text; no `dangerouslySetInnerHTML`; the single `innerHTML` (spider panel) is built from constants and escaped values, and saved spider settings are whitelisted by type; links restricted to `http(s)`/site paths; CSP. Tested with hostile content (`<script>`, `<img onerror>`, `javascript:` links, `data:` URLs): nothing ran, with and without the headers. |
| 8 | Rate limiting | **Partial** | A static site has no server to rate-limit. Added client-side lockout for passcode guesses and a 5-emails/hour limit. These slow casual abuse only; against a determined attacker the defence is the strong passcode + slow key derivation. For server-side limits use your host's WAF/CDN (e.g. Cloudflare). |
| 9 | Secure API endpoints | **Not applicable** | This project has no backend API. It calls only GitHub and EmailJS. (If your separate Spring Boot backend is in use, it needs its own audit — see the checklist below.) |
| 10 | Logging & monitoring | **Partial** | Private activity log in Admin → Security (sign-ins, wrong attempts, publishes). Every change is a commit on GitHub (tamper-proof history). **You must switch on**: Dependabot alerts, secret scanning + push protection, GitHub email alerts, Netlify deploy notifications. Optional Action template: `security/github-actions-security.yml`. |
| 11 | Security headers | **Done** | In `netlify.toml`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP. Tested against a production-style build: **0 CSP violations** across the site, spider and admin. After deploying, check with securityheaders.com. |
| 12 | Debug mode | **Done** | Production builds only; no source maps (`build.sourcemap: false`); no `console`/`debugger` in the source; test hooks exist only when `import.meta.env.DEV`. |
| 13 | Update dependencies | **Not done — you must run it** | This environment has no internet, so `npm audit` / updates could not run. Run: `npm audit`, `npm outdated`, `npm update` (then `npm run build` and test). Dependabot is configured (`.github/dependabot.yml`) to open PRs for you. |
| 14 | HTTPS | **Done (verify in Netlify)** | HSTS + `upgrade-insecure-requests` + all external URLs are https. In Netlify: Domain management → HTTPS → *Force HTTPS* must be on. The admin's encryption needs a secure page (https or localhost). |
| 15 | Exposed files | **Done** | Public folder: `photo.jpg`, `resume.pdf`, `favicon.svg`, `spider-logo.svg`, `content.json` — all intended to be public. `scripts/`, `security/`, docs are not deployed. No source maps. **`content.json` contains your encrypted access vault (public by design) — see Residual risks.** |
| 16 | Secure database | **Not applicable here** | This site has no database. |
| 17 | Hash passwords properly | **Done** | No password is ever stored. The passcode only derives a key (PBKDF2-SHA256, 600,000 rounds, random salt) that unlocks an AES-256-GCM vault. An old unsalted SHA-256 passcode hash from earlier versions of this panel is deleted from the browser on first visit. |
| 18 | Git history for leaked secrets | **Not done — you must run it** | I cannot see your repository's history. Run `sh scripts/security-check.sh` in your repo (tested: it finds a secret that was committed and later deleted). If anything is found: **revoke/rotate it on the provider's site** — deleting it from later commits is not enough. |
| 19 | Full audit | **Done** | This report: secret scan, dangerous-API scan, link-safety scan, header/CSP test, XSS test, authentication/lockout/idle tests. |

## Residual risks (read these)
1. **The access vault is public.** To make one passcode work on every device, your GitHub token is stored in `public/content.json`,
   encrypted. Anyone can download it and try passcodes offline (each try costs ~0.3 s of computing, but an attacker can use many computers).
   A weak passcode could therefore expose the token. **Use the generated passcode or 5+ random words**, use a **fine-grained token limited to this one repo**,
   and rotate it (Security → Replace GitHub token) if you ever suspect a problem. If you prefer no public vault at all, the safer alternative is a small
   private backend that holds the token — ask and it can be built.
2. **Anything that can run script in the admin page could read the session token.** The CSP, input sanitizing and no-`innerHTML` rules are there to prevent that; keep dependencies updated.
3. **The live site reads content from raw.githubusercontent.com** (so edits show in ~30 s). That host is trusted by the CSP only for data and images, not scripts.
4. **Third-party fonts** (Google Fonts, Fontshare) load without integrity checks. To remove that dependency, self-host the fonts.
5. **Client-side checks can be bypassed in a visitor's own browser.** That only affects that visitor's own copy — it cannot change your live site.

## Separate Spring Boot + PostgreSQL backend (if you still use it)
Not part of this repo, so not audited. Checklist: store passwords with BCrypt/Argon2; JWT secret and DB URL only in environment variables (never in git);
short-lived tokens; restrict CORS to your site; add rate limiting (e.g. Bucket4j) on login; disable Actuator/Swagger in production; `spring.jpa.show-sql=false`;
`server.error.include-stacktrace=never`; DB not publicly reachable (private network / allow-list); least-privilege DB user; HTTPS only; dependency scanning.
Send me that repo and I will audit it properly.
