import { useState, useEffect } from "react";
import {
  Code2, ServerCog, LayoutPanelLeft, Database, Cloud, Wrench, BrainCircuit, Sparkles,
} from "lucide-react";
import { SKILL_GROUPS } from "../data/content";
import Coverflow from "./Coverflow";

const ICONS = { Code2, ServerCog, LayoutPanelLeft, Database, Cloud, Wrench, BrainCircuit, Sparkles };

export default function Skills() {
  const [open, setOpen] = useState(null);

  // Tap anywhere that isn't a chip to let the open one settle back.
  useEffect(() => {
    const away = (e) => {
      if (!e.target.closest || !e.target.closest(".skill-chip")) setOpen(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);

  return (
    <section id="skills">
      <div className="container">
        <div className="section-head">
          <span className="section-num">04</span>
          <span className="eyebrow">Toolbox</span>
          <h2>What I build with.</h2>
        </div>
      </div>

      <Coverflow>
        {SKILL_GROUPS.map((g) => {
          const Icon = ICONS[g.icon];
          return (
            <div className={`card skill-group-card${open && open.startsWith(g.title + "::") ? " has-open" : ""}`} key={g.title}>
              <div className="skill-group-head">
                <div className="edu-icon">
                  <Icon size={22} />
                </div>
                <h4>{g.title}</h4>
              </div>
              <div>
                {g.items.map((s) => (
                  <span
                    className={`skill-chip${open === g.title + "::" + s ? " is-open" : ""}`}
                    key={s}
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpen(open === g.title + "::" + s ? null : g.title + "::" + s)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen(open === g.title + "::" + s ? null : g.title + "::" + s);
                      }
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </Coverflow>

      <p className="skill-scroll-hint">← swipe, or just watch it scroll →</p>
    </section>
  );
}
