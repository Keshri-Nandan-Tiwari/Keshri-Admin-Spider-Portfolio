import { motion } from "framer-motion";

const SWEEP = 1.3; // the line loading in, left -> right
const HOLD = 0.25; // sits fully lit for a beat
const SPLIT = 1.35; // the halves travel apart, staying lit most of the way
const TOTAL = SWEEP + HOLD + SPLIT;
const T2 = (SWEEP + HOLD) / TOTAL;

// Only two elements ever exist here — the top panel's glowing bottom edge
// and the bottom panel's glowing top edge. They sit perfectly overlapped
// (reading as one line) while the sweep plays, then separate together with
// their panels. Nothing else is drawn, so there's never a stray third line.
export default function LineReveal() {
  return (
    <div className="line-stage">
      <motion.div
        className="line-panel line-panel-top"
        initial={{ y: "0%" }}
        animate={{ y: ["0%", "0%", "-115%"], transition: { duration: TOTAL, times: [0, T2, 1], ease: "easeInOut" } }}
      >
        <motion.div
          className="line-panel-edge"
          style={{ transformOrigin: "left center" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1, transition: { duration: SWEEP, ease: "easeInOut" } }}
        />
      </motion.div>
      <motion.div
        className="line-panel line-panel-bottom"
        initial={{ y: "0%" }}
        animate={{ y: ["0%", "0%", "115%"], transition: { duration: TOTAL, times: [0, T2, 1], ease: "easeInOut" } }}
      >
        <motion.div
          className="line-panel-edge"
          style={{ transformOrigin: "left center" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1, transition: { duration: SWEEP, ease: "easeInOut" } }}
        />
      </motion.div>
    </div>
  );
}
