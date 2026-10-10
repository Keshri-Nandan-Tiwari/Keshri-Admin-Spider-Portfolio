#!/bin/sh
# Quick security check you can run anywhere (Termux, Linux, macOS):
#     sh scripts/security-check.sh
# It looks for leaked secrets in your files AND in your whole git history, for sensitive files that are tracked,
# and (if npm is available and online) for vulnerable / outdated packages.
# --history-only : only the git-history part (used by the optional GitHub Action)

PATTERN='ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|gh[ousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|sk_(live|test)_[0-9a-zA-Z]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(api|secret|private|access)[_-]?(key|token)[" :=]+[A-Za-z0-9/+_.-]{20,}'
FAIL=0
HIST_ONLY=0
[ "$1" = "--history-only" ] && HIST_ONLY=1

say() { printf '\n== %s ==\n' "$1"; }

if [ "$HIST_ONLY" = "0" ]; then
  say "1. Secrets in your current files"
  if grep -rnEI "$PATTERN" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude=package-lock.json --exclude=security-check.sh --exclude=SECURITY_AUDIT.md 2>/dev/null; then
    echo "!! Possible secret(s) above. Revoke them on the provider's website, then remove them from the files."; FAIL=1
  else echo "OK: nothing that looks like a key or token."; fi
fi

say "2. Secrets anywhere in git history"
if git rev-parse --git-dir >/dev/null 2>&1; then
  HITS=$(git log --all --pretty=format:'%h %ad %s' --date=short -G"$PATTERN" -- . ':(exclude)scripts/security-check.sh' ':(exclude)SECURITY_AUDIT.md' ':(exclude)package-lock.json' 2>/dev/null)
  if [ -n "$HITS" ]; then
    echo "!! These commits added or removed something that looks like a secret:"; echo "$HITS"
    echo "   Inspect one with:  git show <commit>   — then REVOKE that secret (deleting it from later commits is not enough)."; FAIL=1
  else echo "OK: no key-like text found in any commit."; fi
else echo "(not a git repository — skipped)"; fi

if [ "$HIST_ONLY" = "0" ]; then
  say "3. Sensitive files tracked by git"
  if git rev-parse --git-dir >/dev/null 2>&1; then
    BAD=$(git ls-files | grep -Ei '(^|/)\.env($|\.)|\.pem$|\.key$|id_rsa|\.p12$|\.pfx$|secrets?\.(json|ya?ml)$' | grep -v '\.env\.example$')
    if [ -n "$BAD" ]; then echo "!! Tracked sensitive file(s):"; echo "$BAD"; FAIL=1; else echo "OK: none."; fi
    grep -q '^\.env' .gitignore 2>/dev/null && echo "OK: .env is ignored by git." || { echo "!! .gitignore does not ignore .env"; FAIL=1; }
    grep -q 'node_modules' .gitignore 2>/dev/null && echo "OK: node_modules is ignored." || { echo "!! .gitignore does not ignore node_modules"; FAIL=1; }
  fi

  say "4. Build output"
  if [ -d dist ]; then
    MAPS=$(find dist -name '*.map' | head -3)
    [ -n "$MAPS" ] && { echo "!! Source maps in dist/ (they expose your source):"; echo "$MAPS"; FAIL=1; } || echo "OK: no source maps in dist/."
  else echo "(no dist/ folder yet — run: npm run build)"; fi

  say "5. Packages (needs npm and internet)"
  if command -v npm >/dev/null 2>&1 && [ -f package.json ]; then
    npm audit --audit-level=moderate || FAIL=1
    echo; echo "Outdated packages (for information):"; npm outdated || true
  else echo "(npm not available — skipped)"; fi
fi

echo
if [ "$FAIL" = "0" ]; then echo "RESULT: no problems found."; else echo "RESULT: please fix the items marked !!"; fi
exit $FAIL
