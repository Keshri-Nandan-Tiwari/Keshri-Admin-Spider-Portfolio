import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { School } from "lucide-react";
import { useContent, useSectionNumber } from "../ContentContext";
import { getIcon } from "../icons";
import TiltCard from "./TiltCard";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
// Slides in from the left with a slight rotation settle.
const item = {
  hidden: { opacity: 0, x: -70, rotate: -4 },
  show: { opacity: 1, x: 0, rotate: 0, transition: { type: "spring", stiffness: 90, damping: 14 } },
};

export default function Education() {
  const secNum = useSectionNumber("education");
  const { EDUCATION } = useContent();
  const [hot, setHot] = useState(null);

  // Tap anywhere outside a card to let it settle.
  useEffect(() => {
    const away = (e) => {
      if (!e.target.closest || !e.target.closest(".edu-slot")) setHot(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  return (
    <section id="education" style={{ background: "var(--bg-alt)" }}>
      <div className="container">
        <div className="section-head">
          <span className="section-num">{secNum}</span>
          <span className="eyebrow">Education</span>
          <h2>Where it started.</h2>
        </div>

        <motion.div
          className="edu-list"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {EDUCATION.map((e) => {
            const Icon = getIcon(e.icon, School);
            return (
              <motion.div
                key={e.school}
                variants={item}
                className={`edu-slot${hot === e.school ? " is-hot" : ""}`}
                onPointerMove={(ev) => {
                  // the soft spotlight follows the pointer while the card is open
                  if (hot !== e.school) return;
                  const r = ev.currentTarget.getBoundingClientRect();
                  ev.currentTarget.style.setProperty("--mx", ((ev.clientX - r.left) / r.width) * 100 + "%");
                  ev.currentTarget.style.setProperty("--my", ((ev.clientY - r.top) / r.height) * 100 + "%");
                }}
                onClick={(ev) => {
                  const r = ev.currentTarget.getBoundingClientRect();
                  ev.currentTarget.style.setProperty("--mx", ((ev.clientX - r.left) / r.width) * 100 + "%");
                  ev.currentTarget.style.setProperty("--my", ((ev.clientY - r.top) / r.height) * 100 + "%");
                  setHot(hot === e.school ? null : e.school);
                }}
              >
                <TiltCard className="card edu-card">
                  <div className="edu-icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h4>{e.school}</h4>
                    <p className="edu-place">{e.place}</p>
                    <p className="edu-degree">{e.degree}</p>
                    <span className="edu-period">{e.period}</span>
                    {e.score && <span className="edu-score">{e.score}</span>}
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
