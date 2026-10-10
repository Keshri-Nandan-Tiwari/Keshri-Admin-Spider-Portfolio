import { motion } from "framer-motion";
import { useContent, useSectionNumber } from "../ContentContext";
import TiltCard from "./TiltCard";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.13 } } };
// Rises up out of the page with a flip, like it's being unveiled.
const item = {
  hidden: { opacity: 0, y: 90, rotateX: -55, scale: 0.9 },
  show: { opacity: 1, y: 0, rotateX: 0, scale: 1, transition: { type: "spring", stiffness: 85, damping: 13 } },
};

export default function Projects() {
  const secNum = useSectionNumber("projects");
  const { PROJECTS } = useContent();
  return (
    <section id="projects">
      <div className="container">
        <div className="section-head">
          <span className="section-num">{secNum}</span>
          <span className="eyebrow">Selected work</span>
          <h2>Things I've shipped.</h2>
        </div>

        <motion.div
          className="projects-grid"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
        >
          {PROJECTS.map((p) => (
            <motion.div key={p.title} variants={item}>
              <TiltCard className="card project-card">
                <span className="project-tag">{p.tag}</span>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                {p.metric && (
                  <p style={{ color: "var(--highlight)", fontWeight: 700, fontSize: "0.85rem", marginBottom: 14 }}>
                    {p.metric}
                  </p>
                )}
                <div className="project-stack">
                  {(p.stack || []).map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                {(p.link || p.github) && (
                  <div className="project-links">
                    {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Live ↗</a>}
                    {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Code ↗</a>}
                  </div>
                )}
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
