import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { useContent, useSectionNumber } from "../ContentContext";
import { getIcon } from "../icons";
import TiltCard from "./TiltCard";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
// Pops in from nothing with a springy overshoot bounce.
const item = {
  hidden: { opacity: 0, scale: 0.4, rotate: 8 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 12 } },
};

export default function Certifications() {
  const secNum = useSectionNumber("certifications");
  const { CERTIFICATIONS } = useContent();
  const [active, setActive] = useState(null);

  // Tap anywhere outside a card to settle it back down.
  useEffect(() => {
    const away = (e) => {
      if (!e.target.closest || !e.target.closest(".cert-slot")) setActive(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  return (
    <section id="certifications">
      <div className="container">
        <div className="section-head">
          <span className="section-num">{secNum}</span>
          <span className="eyebrow">Certifications</span>
          <h2>Proof of the work.</h2>
        </div>

        <motion.div
          className="cert-grid"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {CERTIFICATIONS.map((c) => (
            <motion.div
              key={c.title}
              variants={item}
              className={`cert-slot${active === c.title ? " is-active" : ""}`}
              onClick={() => setActive(active === c.title ? null : c.title)}
            >
              <TiltCard className="card cert-card">
                <div className="edu-icon">
                  {(() => { const Icon = getIcon(c.icon, Award); return <Icon size={18} />; })()}
                </div>
                <div>
                  <h5>{c.title}</h5>
                  <p>{c.org}</p>
                  {c.link && (
                    <a className="cert-link" href={c.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      View credential ↗
                    </a>
                  )}
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
