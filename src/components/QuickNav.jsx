import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, X, User, GraduationCap, Award, Wrench, FolderGit2, Mail } from "lucide-react";

const LINKS = [
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
