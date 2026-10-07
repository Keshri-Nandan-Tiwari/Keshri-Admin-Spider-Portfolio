import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LineReveal from "./LineReveal";
import LoaderSpider from "./LoaderSpider";

const STAGES = ["ready", "hello", "name", "shatter", "zipper", "done"];
const STAGE_DURATIONS = { ready: 1500, hello: 2000, name: 3300, shatter: 750, zipper: 2900 };

// KESHRI split into letters for the shatter effect
const LETTERS = "KESHRI".split("");

export default function Loader({ onFinish }) {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = STAGES[stageIndex];
  const advance = useCallback(() => setStageIndex((i) => i + 1), []);

  useEffect(() => {
    if (stage === "done") {
      onFinish();
      return;
    }
    const t = setTimeout(advance, STAGE_DURATIONS[stage]);
    return () => clearTimeout(t);
  }, [stage, advance, onFinish]);

  const skip = () => setStageIndex(STAGES.length - 1);

  const readyWords = ["Ready", "to", "begin?"];
  const isZipper = stage === "zipper";
  const showContent = !isZipper;

  return (
    <AnimatePresence>
      {stage !== "done" && (
        <div className="loader" data-spider-ignore>
          {showContent && (
            <div className="loader-backdrop">
              <div className="loader-stage">
                <AnimatePresence mode="wait">
                  {stage === "ready" && (
                    <motion.div key="ready" className="loader-ready" exit={{ opacity: 0, y: -20, transition: { duration: 0.35 } }}>
                      {readyWords.map((w, i) => (
                        <motion.span
                          key={w}
                          style={{ display: "inline-block", marginRight: "0.28em" }}
                          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { delay: i * 0.18, duration: 0.5 } }}
                        >
                          {w}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}

                  {stage === "hello" && (
                    <motion.div
                      key="hello"
                      initial={{ opacity: 0, y: -120, scale: 1.3 }}
                      animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 240, damping: 15 } }}
                      exit={{ opacity: 0, y: 40, scale: 0.9, transition: { duration: 0.3 } }}
                      className="loader-hello"
                    >
                      HELLO!
                    </motion.div>
                  )}

                  {(stage === "name" || stage === "shatter") && (
                    <motion.div key="name" className={`loader-imkeshri ${stage === "name" ? "keshri-invite" : ""}`}>
                      <motion.span
                        style={{ display: "inline-block", marginRight: "0.4em" }}
                        initial={{ opacity: 0, y: -140, rotate: -6 }}
                        animate={{ opacity: 1, y: 0, rotate: 0, transition: { duration: 0.6, type: "spring", stiffness: 220, damping: 16 } }}
                      >
                        I
                      </motion.span>
                      <motion.span
                        style={{ display: "inline-block", marginRight: "0.4em" }}
                        initial={{ opacity: 0, y: -140, rotate: -6 }}
                        animate={{ opacity: 1, y: 0, rotate: 0, transition: { delay: 0.26, duration: 0.6, type: "spring", stiffness: 220, damping: 16 } }}
                      >
                        am
                      </motion.span>
                      <span style={{ display: "inline-block", position: "relative" }}>
                        {stage === "shatter" &&
                          Array.from({ length: 14 }).map((_, p) => (
                            <motion.span
                              key={`p-${p}`}
                              className="loader-shatter-spark"
                              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                              animate={{
                                opacity: 0,
                                x: Math.cos((p / 14) * Math.PI * 2) * (window.innerWidth * (0.35 + (p % 3) * 0.15)),
                                y: Math.sin((p / 14) * Math.PI * 2) * (window.innerHeight * (0.3 + (p % 4) * 0.12)),
                                scale: 0.2,
                                transition: { duration: 0.85, ease: "easeOut" },
                              }}
                            />
                          ))}
                        {LETTERS.map((l, i) => (
                          <motion.span
                            key={i}
                            className="loader-keshri-letter"
                            style={{ display: "inline-block" }}
                            initial={{ opacity: 0, y: -140, rotate: -6 }}
                            animate={
                              stage === "shatter"
                                ? {
                                    opacity: 0,
                                    y: (i % 2 === 0 ? -1 : 1) * (window.innerHeight * (0.45 + i * 0.06)),
                                    x: (i - LETTERS.length / 2) * (window.innerWidth * 0.09),
                                    rotate: (i % 2 === 0 ? -1 : 1) * (280 + i * 90),
                                    scale: 0.15,
                                    transition: { duration: 0.85, ease: "easeIn" },
                                  }
                                : {
                                    opacity: 1,
                                    y: 0,
                                    rotate: 0,
                                    transition: { delay: 0.52 + i * 0.05, duration: 0.5, type: "spring", stiffness: 260, damping: 15 },
                                  }
                            }
                          >
                            {l}
                          </motion.span>
                        ))}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="loader-dots">
                {STAGES.slice(0, 3).map((s, i) => (
                  <span key={s} className={`loader-dot ${i <= stageIndex ? "active" : ""}`} />
                ))}
              </div>

              {stage !== "shatter" && (
                <button className="loader-skip" onClick={skip}>
                  Skip →
                </button>
              )}
            </div>
          )}

          {/* Bright loading line sweeps left to right, then the two halves
              split apart — top up, bottom down — staying lit while they move. */}
          {isZipper && <LineReveal />}

          <LoaderSpider stage={stage} />
        </div>
      )}
    </AnimatePresence>
  );
}
