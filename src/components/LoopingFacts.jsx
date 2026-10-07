import { FACTS } from "../data/content";
import ImportanceLoop from "./ImportanceLoop";

export default function LoopingFacts() {
  return (
    <section id="about">
      <div className="container">
        <div className="section-head">
          <span className="section-num">01</span>
          <span className="eyebrow">A little about me</span>
          <h2>One fact at a time.</h2>
        </div>

        <ImportanceLoop items={FACTS} />
      </div>
    </section>
  );
}
