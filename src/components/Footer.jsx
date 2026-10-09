import { FaGithub, FaLinkedin, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { Mail, Link2 } from "lucide-react";
import { useContent } from "../ContentContext";

export default function Footer() {
  const { PROFILE, LINKS } = useContent();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-big">
          LET'S <span className="hl">CONNECT</span>
        </div>

        <div className="footer-social">
          {PROFILE.github && (
            <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub size={18} />
            </a>
          )}
          {PROFILE.linkedin && (
            <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedin size={18} />
            </a>
          )}
          {PROFILE.instagram && (
            <a href={PROFILE.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram size={18} />
            </a>
          )}
          {PROFILE.x && (
            <a href={PROFILE.x} target="_blank" rel="noopener noreferrer" aria-label="X">
              <FaXTwitter size={18} />
            </a>
          )}
          {PROFILE.email && (
            <a href={`mailto:${PROFILE.email}`} aria-label="Email">
              <Mail size={18} />
            </a>
          )}
          {(LINKS || []).filter((l) => l.url).map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" aria-label={l.label || "Link"}>
              <Link2 size={18} />
            </a>
          ))}
        </div>

        <p className="credit">© 2026 {PROFILE.name}. Built with React, Three.js &amp; Framer Motion.</p>
      </div>
    </footer>
  );
}
