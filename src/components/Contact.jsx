import { motion } from "framer-motion";
import { Mail, Phone, ArrowRight, Link2 } from "lucide-react";
import { FaLinkedin, FaGithub, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { useContent } from "../ContentContext";

// Rows only appear when you have filled the field in, so removing a link in the admin panel hides its row.
const buildContacts = (PROFILE, LINKS) =>
  [
    PROFILE.email && { icon: Mail, label: "Email", href: `mailto:${PROFILE.email}`, brand: "email" },
    PROFILE.linkedin && { icon: FaLinkedin, label: "LinkedIn", href: PROFILE.linkedin, brand: "linkedin" },
    PROFILE.github && { icon: FaGithub, label: "GitHub", href: PROFILE.github, brand: "github" },
    PROFILE.instagram && { icon: FaInstagram, label: "Instagram", href: PROFILE.instagram, brand: "instagram" },
    PROFILE.x && { icon: FaXTwitter, label: "X", href: PROFILE.x, brand: "x" },
    PROFILE.phone && { icon: Phone, label: "Phone", href: `tel:${PROFILE.phone}`, brand: "phone" },
    ...(LINKS || []).filter((l) => l.url).map((l) => ({ icon: Link2, label: l.label || l.url, href: l.url, brand: "link" })),
  ].filter(Boolean);

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
// Rows swing in from below with a little overshoot, like they're dropping into place.
const item = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 14 } },
};

export default function Contact() {
  const { PROFILE, LINKS } = useContent();
  const DIRECT_CONTACT = buildContacts(PROFILE, LINKS);
  return (
    <section id="contact" style={{ background: "var(--bg-alt)" }}>
      <div className="container">
        <div className="contact-head">
          <span className="contact-eyebrow">// Get in touch</span>
          <h2 className="contact-heading">
            Let's Build Something
            <br />
            <span className="contact-heading-accent">Amazing Together</span>
          </h2>
          <p className="contact-sub">
            I'm seeking internships, full-time roles, and freelance projects. Whether you have an
            opportunity or just want to say hi — my inbox is open!
          </p>
        </div>

        <div className="contact-columns">
          <motion.div
            className="direct-contact"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <span className="contact-col-label">Direct contact</span>
            {DIRECT_CONTACT.map((c) => (
              <motion.a
                key={c.label + c.href}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`direct-contact-row brand-${c.brand}`}
                variants={item}
                whileHover={{ x: 6 }}
              >
                <span className="dc-icon">
                  <c.icon size={18} />
                </span>
                <span className="dc-label-only">{c.label}</span>
              </motion.a>
            ))}
          </motion.div>

          <motion.form
            className="send-message"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.target;
              window.location.href = `mailto:${PROFILE.email}?subject=${encodeURIComponent(
                f.subject.value || "Portfolio contact"
              )}&body=${encodeURIComponent(
                `${f.message.value}\n\n— ${f.name.value} (${f.email.value})`
              )}`;
            }}
          >
            <span className="contact-col-label">Send a message</span>

            <label htmlFor="c-name">Your name</label>
            <input id="c-name" name="name" placeholder="John Doe" required />

            <label htmlFor="c-email">Your email</label>
            <input id="c-email" name="email" type="email" placeholder="john@example.com" required />

            <label htmlFor="c-subject">Subject</label>
            <input id="c-subject" name="subject" placeholder="Let's collaborate!" />

            <label htmlFor="c-message">Message</label>
            <textarea id="c-message" name="message" placeholder="Tell me about your project..." required />

            <button type="submit" className="btn-send">
              <ArrowRight size={16} /> Send Message
            </button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
