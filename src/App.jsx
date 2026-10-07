import { useState } from "react";
import "./index.css";
import "./App.css";
import { ThemeProvider } from "./ThemeContext";
import Loader from "./components/Loader";
import BackgroundLayer from "./components/BackgroundLayer";
import PageFrame from "./components/PageFrame";
import CursorGlow from "./components/CursorGlow";
import Nav from "./components/Nav";
import ScrollProgress from "./components/ScrollProgress";
import QuickNav from "./components/QuickNav";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import LoopingFacts from "./components/LoopingFacts";
import Education from "./components/Education";
import Certifications from "./components/Certifications";
import Skills from "./components/Skills";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import SpiderWalker from "./SpiderWalker";

export default function App() {
  const [loading, setLoading] = useState(true);

  return (
    <ThemeProvider>
      {loading && <Loader onFinish={() => setLoading(false)} />}
      <BackgroundLayer />
      <PageFrame />
      <div className="grain-overlay" />
      <CursorGlow />
      <ScrollProgress />
      <Nav />
      <QuickNav />
      <Hero />
      <Marquee />
      <LoopingFacts />
      <Education />
      <Certifications />
      <Skills />
      <Projects />
      <Contact />
      <Footer />
      {!loading && <SpiderWalker defaults={{ web: true, lights: 0 }} />}
    </ThemeProvider>
  );
}
