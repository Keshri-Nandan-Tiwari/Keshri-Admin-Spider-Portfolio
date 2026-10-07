import { FaGithub, FaLinkedin, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { Mail } from "lucide-react";
import { PROFILE } from "../data/content";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-big">
          LET'S <span className="hl">CONNECT</span>
        </div>

        <div className="footer-social">
          <a href={PROFILE.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <FaGithub size={18} />
          </a>
          <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <FaLinkedin size={18} />
          </a>
          <a href={PROFILE.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram size={18} />
          </a>
          <a href={PROFILE.x} target="_blank" rel="noopener noreferrer" aria-label="X">
            <FaXTwitter size={18} />
          </a>
          <a href={`mailto:${PROFILE.email}`} aria-label="Email">
            <Mail size={18} />
          </a>
        </div>

        <p className="credit">© 2026 {PROFILE.name}. Built with React, Three.js &amp; Framer Motion.</p>
      </div>
    </footer>
  );
}
