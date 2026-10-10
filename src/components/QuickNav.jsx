import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, X, User, GraduationCap, Award, Wrench, FolderGit2, Mail, Settings } from "lucide-react";
import { useContent } from "../ContentContext";
import { getIcon } from "../icons";

const BASE_LINKS = [
  { href: "#hero", label: "Home", icon: User },
  { href: "#about", label: "About", icon: User },
  { href: "#education", label: "Education", icon: GraduationCap },
  { href: "#certifications", label: "Certifications", icon: Award },
  { href: "#skills", label: "Skills", icon: Wrench },
  { href: "#projects", label: "Projects", icon: FolderGit2 },
  { href: "#contact", label: "Contact", icon: Mail },
];

export default function QuickNav() {
  const [open, setOpen] = useState(false);
  const { SECTIONS, LAYOUT } = useContent();
  // The menu follows the page: hidden sections disappear, and every section you add shows up here automatically.
  const base = BASE_LINKS.filter((l) => { const id = l.href.slice(1); return !LAYOUT.hide.includes(id) && !LAYOUT.noMenu.includes(id); });
  const extra = SECTIONS.filter((s) => s.showInMenu !== false && !LAYOUT.noMenu.includes(`sec-${s.id}`)).map((s) => ({ href: `#sec-${s.id}`, label: s.title || s.heading || "Section", icon: getIcon(s.icon) }));
  const LINKS = [...base.slice(0, -1), ...extra, base[base.length - 1]];

  return (
    <div className="quicknav">
      <button className="quicknav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Jump to section">
        {open ? <X size={18} /> : <Compass size={18} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="quicknav-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                <l.icon size={15} /> {l.label}
              </a>
            ))}
            {/* hidden only inside the admin panel's own prototype frame */}
            {window.name !== "portfolio-preview" && (
              <a className="quicknav-admin" href="#/admin" onClick={() => setOpen(false)}>
                <Settings size={15} /> Admin
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
