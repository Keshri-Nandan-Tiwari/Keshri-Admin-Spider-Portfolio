// A small private activity log kept on THIS device (sign-ins, failed attempts, publishes, passcode changes).
// The full, tamper-proof history of every change to your site is your repo's commit history on GitHub.
const KEY = "portfolio-admin-log";
export const logEvent = (type, detail = "") => {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    a.unshift({ t: new Date().toISOString(), type, detail: String(detail).slice(0, 120) });
    localStorage.setItem(KEY, JSON.stringify(a.slice(0, 100)));
  } catch (_) { /* storage unavailable */ }
};
export const readLog = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (_) { return []; } };
export const clearLog = () => { try { localStorage.removeItem(KEY); } catch (_) {} };
