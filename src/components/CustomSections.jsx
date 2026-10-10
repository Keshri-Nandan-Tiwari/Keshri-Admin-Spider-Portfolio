import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContent, assetUrl, useSectionNumber } from "../ContentContext";
import { getIcon } from "../icons";
import TiltCard from "./TiltCard";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 90, damping: 16 } },
};

// Your own writing: blank line = new paragraph, "- " = bullet, "# " = subheading, **bold**, [text](https://link)
function inline(text, key) {
  const out = []; const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g; let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] ? <strong key={`${key}b${i++}`}>{m[1]}</strong> : <a key={`${key}a${i++}`} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function parse(text) {
  const out = []; let para = [], list = [];
  const flushP = () => { if (para.length) { out.push({ t: "p", lines: para }); para = []; } };
  const flushL = () => { if (list.length) { out.push({ t: "ul", items: list }); list = []; } };
  for (const raw of String(text || "").replace(/\r/g, "").split("\n")) {
    const l = raw.trimEnd();
    if (!l.trim()) { flushP(); flushL(); continue; }
    const h = l.match(/^#{1,3}\s+(.*)/), li = l.match(/^\s*[-*•]\s+(.*)/);
    if (h) { flushP(); flushL(); out.push({ t: "h", text: h[1] }); }
    else if (li) { flushP(); list.push(li[1]); }
    else { flushL(); para.push(l); }
  }
  flushP(); flushL();
  return out;
}
function RichText({ text }) {
  return (
    <div className="custom-text">
      {parse(text).map((b, i) =>
        b.t === "h" ? <h3 key={i}>{inline(b.text, i)}</h3>
        : b.t === "ul" ? <ul key={i}>{b.items.map((x, j) => <li key={j}>{inline(x, `${i}-${j}`)}</li>)}</ul>
        : <p key={i}>{b.lines.map((x, j) => <span key={j}>{j > 0 && <br />}{inline(x, `${i}-${j}`)}</span>)}</p>
      )}
    </div>
  );
}

function Section({ s }) {
  const n = useSectionNumber(`sec-${s.id}`);
  const [active, setActive] = useState(null);
  useEffect(() => {
    const away = (e) => { if (!e.target.closest || !e.target.closest(".cert-slot")) setActive(null); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, []);
  const type = s.type || "cards";
  return (
    <section id={`sec-${s.id}`}>
      <div className="container">
        <div className="section-head">
          <span className="section-num">{n}</span>
          {s.eyebrow && <span className="eyebrow">{s.eyebrow}</span>}
          <h2>{s.heading || s.title}</h2>
        </div>

        {type === "text" && <RichText text={s.text} />}

        {type === "tags" && (
          <motion.div className="custom-tags" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            {(s.tags || []).map((t, i) => (
              <motion.span key={t + i} variants={item} className="custom-chip">{t}</motion.span>
            ))}
          </motion.div>
        )}

        {type === "cards" && (
          <motion.div className="custom-grid" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
            {(s.items || []).map((c, i) => {
              const Icon = getIcon(c.icon);
              const key = `${c.title}-${i}`;
              return (
                <motion.div key={key} variants={item} className={`cert-slot${active === key ? " is-active" : ""}`} onClick={() => setActive(active === key ? null : key)}>
                  <TiltCard className="card custom-card">
                    <div className="edu-icon"><Icon size={18} /></div>
                    <div>
                      <h5>{c.title}</h5>
                      {c.text && <p>{c.text}</p>}
                      {c.link && (
                        <a className="cert-link" href={c.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          Learn more ↗
                        </a>
                      )}
                    </div>
                  </TiltCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
        {type === "timeline" && (
          <motion.div className="custom-timeline" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
            {(s.items || []).map((t, i) => (
              <motion.div key={i} variants={item} className="custom-tl-item">
                <span className="custom-tl-dot" />
                <div className="card custom-tl-card">
                  <div className="custom-tl-when">{t.period}</div>
                  <h5>{t.title}</h5>
                  {t.text && <p>{t.text}</p>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {type === "stats" && (
          <motion.div className="custom-stats" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            {(s.items || []).map((t, i) => (
              <motion.div key={i} variants={item} className="card custom-stat">
                <div className="custom-stat-value">{t.value}</div>
                <div className="custom-stat-label">{t.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {type === "links" && (
          <motion.div className="custom-links" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
            {(s.items || []).map((t, i) => (
              <motion.a key={i} variants={item} className="custom-link" href={t.url} target="_blank" rel="noopener noreferrer">
                {t.title} <span>↗</span>
              </motion.a>
            ))}
          </motion.div>
        )}

        {type === "gallery" && (
          <motion.div className="custom-gallery" variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
            {(s.items || []).filter((t) => t.image).map((t, i) => (
              <motion.figure key={i} variants={item} className="custom-shot">
                <img
                  src={assetUrl(t.image)}
                  alt={t.caption || ""}
                  loading="lazy"
                  onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = "1"; e.currentTarget.src = t.image; } }}
                />
                {t.caption && <figcaption>{t.caption}</figcaption>}
              </motion.figure>
            ))}
          </motion.div>
        )}

      </div>
    </section>
  );
}

export default function CustomSections() {
  const { SECTIONS } = useContent();
  return <>{SECTIONS.map((s) => <Section key={s.id} s={s} />)}</>;
}
