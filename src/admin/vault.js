// The admin passcode protects your publishing key. The key (your GitHub token) is stored in your repo,
// locked with AES-256-GCM using a key derived from the passcode (PBKDF2, 600,000 rounds).
// Anyone with the passcode can open the editor on any device; nobody can set up their own.
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => { let s = ""; new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b))); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const MIN_PASS = 12;

const WEAK = ["password", "passcode", "qwerty", "letmein", "welcome", "iloveyou", "admin", "123456", "abcdef", "portfolio", "keshri", "github", "netlify"];
// returns a message when the passcode is too guessable, or "" when it is fine
export function passcodeProblem(p) {
  const s = String(p || "");
  if (s.length < MIN_PASS) return `Use at least ${MIN_PASS} characters. This passcode protects your publishing key, so longer is better.`;
  const low = s.toLowerCase();
  if (WEAK.some((w) => low.includes(w))) return "That passcode contains a very common word or pattern. Pick something less guessable (or use “Suggest a strong passcode”).";
  if (/^(.)\1+$/.test(s) || /^[0-9]+$/.test(s)) return "Digits-only or repeated characters are too easy to guess.";
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length;
  if (s.length < 16 && classes < 3) return "Under 16 characters, mix upper-case, lower-case, numbers and symbols. Or use a longer phrase.";
  return "";
}

// ~120 bits of randomness: strong enough to protect a key stored in a public repo. Save it in a password manager.
export function generatePasscode() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(24));
  const s = [...r].map((x) => alpha[x % alpha.length]).join("");
  return s.match(/.{6}/g).join("-");
}
export const vaultSupported = () => !!(window.crypto && window.crypto.subtle);

async function deriveKey(pass, salt, iter) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function seal(secret, pass, iter = 600000) {
  if (!vaultSupported()) throw new Error("This page isn't in a secure context. Open it on https:// or http://localhost.");
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt, iter);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(secret));
  return { v: 1, i: iter, s: b64(salt), n: b64(iv), c: b64(ct) };
}

// returns the secret, or null when the passcode is wrong
export async function open(vault, pass) {
  try {
    const key = await deriveKey(pass, unb64(vault.s), vault.i);
    return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(vault.n) }, key, unb64(vault.c)));
  } catch (_) { return null; }
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newRecoveryKey = () => {
  const r = crypto.getRandomValues(new Uint8Array(20));
  const s = [...r].map((x) => ALPHA[x % ALPHA.length]).join("");
  return s.match(/.{5}/g).join("-");
};
export const cleanKey = (k) => String(k || "").toUpperCase().replace(/[^A-Z0-9]/g, "").match(/.{1,5}/g)?.join("-") || "";
