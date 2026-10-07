const ITEMS = ["Full-Stack Developer", "Java · Spring Boot", "React · Vite", "Open to Work"];

export default function Marquee() {
  const loop = [...ITEMS, ...ITEMS, ...ITEMS];
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
