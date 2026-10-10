import { useContent, useSectionNumber } from "../ContentContext";
import ImportanceLoop from "./ImportanceLoop";

export default function LoopingFacts() {
  const secNum = useSectionNumber("about");
  const { FACTS } = useContent();
  return (
    <section id="about">
      <div className="container">
        <div className="section-head">
          <span className="section-num">{secNum}</span>
          <span className="eyebrow">A little about me</span>
          <h2>One fact at a time.</h2>
        </div>

        <ImportanceLoop items={FACTS} />
      </div>
    </section>
  );
}
