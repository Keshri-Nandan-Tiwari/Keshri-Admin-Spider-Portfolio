// Slows down repeated wrong guesses on this device (5 free tries, then 30 s, 1 min, 2 min, 5 min, 15 min).
// This is a speed bump for casual guessing. The real protection against a determined attacker is the strong
// passcode + the slow key derivation in vault.js (nobody can try guesses faster than their own computer allows).
const KEY = "portfolio-admin-attempts";
const STEPS = [0, 0, 0, 0, 0, 30, 60, 120, 300, 900];
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; } };
export const lockedFor = () => Math.max(0, (read().until || 0) - Date.now());
export function recordFail() {
  const n = (read().n || 0) + 1, secs = STEPS[Math.min(n, STEPS.length - 1)];
  try { localStorage.setItem(KEY, JSON.stringify({ n, until: secs ? Date.now() + secs * 1000 : 0 })); } catch (_) {}
  return secs * 1000;
}
export const recordOk = () => { try { localStorage.removeItem(KEY); } catch (_) {} };
export const fmtWait = (ms) => (ms >= 60000 ? Math.ceil(ms / 60000) + " min" : Math.ceil(ms / 1000) + " s");
