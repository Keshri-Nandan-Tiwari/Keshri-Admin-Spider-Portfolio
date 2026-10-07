import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Palette } from "lucide-react";
import { THEMES, useTheme } from "../ThemeContext";

export default function Nav() {
  const { theme, setTheme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-left">
          <div className="theme-icon-wrap">
            <button
              className="theme-icon-btn"
              onClick={() => setPickerOpen((o) => !o)}
              aria-label="Choose theme"
              title="Choose theme"
            >
              <Palette size={18} />
            </button>
            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  className="theme-picker-pop"
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                >
                  {Object.values(THEMES).map((t) => (
                    <button
                      key={t.id}
                      className={`theme-dot ${theme === t.id ? "active" : ""}`}
                      style={{ background: t.swatch }}
                      onClick={() => {
                        setTheme(t.id);
                        setPickerOpen(false);
                      }}
                      title={t.label}
                      aria-label={t.label}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="brand-crazy">
            <span className="brand-crazy-a">Keshri</span>
            <span className="brand-crazy-b">Portfolio</span>
          </div>
        </div>

        <div className="nav-links nav-mobile-hide">
          <a href="#about">About</a>
          <a href="#education">Education</a>
          <a href="#skills">Skills</a>
          <a href="#projects">Projects</a>
          <a href="#contact">Contact</a>
        </div>
      </div>
    </nav>
  );
}
