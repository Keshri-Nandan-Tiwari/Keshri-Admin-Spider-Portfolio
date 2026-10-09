import { useContent } from "../ContentContext";

export default function Marquee() {
  const { MARQUEE } = useContent();
  if (!MARQUEE.length) return null;
  const loop = [...MARQUEE, ...MARQUEE, ...MARQUEE];
  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {loop.map((item, i) => (
          <span className="marquee-item" key={i}>
            <b>✦</b> {item}
          </span>
        ))}
      </div>
    </div>
  );
}
