// Passcode emails go through EmailJS (a free service that can send mail from a static site).
export const MAIL_KEY = "portfolio-admin-mail";
export const loadMailCfg = () => { try { return JSON.parse(localStorage.getItem(MAIL_KEY) || "null"); } catch (_) { return null; } };
export const saveMailCfg = (c) => { try { localStorage.setItem(MAIL_KEY, JSON.stringify(c)); } catch (_) {} };
export const mailReady = (c) => !!(c && c.serviceId && c.templateId && c.publicKey);

const SENT_KEY = "portfolio-admin-mailsent";
// at most 5 emails per hour from this device, so the form can never be used to spam you
function rateOk() {
  let a = []; try { a = JSON.parse(localStorage.getItem(SENT_KEY) || "[]"); } catch (_) {}
  a = a.filter((t) => Date.now() - t < 3600000);
  if (a.length >= 5) return false;
  a.push(Date.now()); try { localStorage.setItem(SENT_KEY, JSON.stringify(a)); } catch (_) {}
  return true;
}

export async function sendMail(cfg, { subject, message, code }) {
  if (!mailReady(cfg)) throw new Error("Email is not set up yet (Admin → Security).");
  if (!rateOk()) throw new Error("Too many emails from this device. Try again in an hour.");
  const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: cfg.serviceId, template_id: cfg.templateId, user_id: cfg.publicKey,
      template_params: { subject, message, code: code || "", time: new Date().toLocaleString(), site: window.location.origin },
    }),
  });
  if (!r.ok) throw new Error("The email service said: " + (await r.text()).slice(0, 140));
}

export const changedMail = (how) => ({
  subject: "Your portfolio admin passcode was changed",
  message: `Your portfolio admin passcode was ${how} on ${new Date().toLocaleString()}. If this was not you, change your passcode again and create a new GitHub token (the old one can be deleted).`,
});
