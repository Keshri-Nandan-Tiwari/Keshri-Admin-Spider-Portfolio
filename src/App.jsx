import { lazy, Suspense, useEffect, useState } from "react";
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
import { ContentProvider } from "./ContentContext";

const Admin = lazy(() => import("./admin/Admin"));

// The admin panel's prototype frame is named "portfolio-preview"; it stays in preview mode
// even after you click a section link (which changes the hash).
const inPrototype = () => window.name === "portfolio-preview";
const readRoute = () => {
  const h = window.location.hash;
  if (h.startsWith("#/admin")) return "admin";
  return h.startsWith("#/preview") || inPrototype() ? "preview" : "site";
};

function Site({ preview }) {
  const [loading, setLoading] = useState(!preview);

  // Ctrl/Cmd + Shift + A opens the admin panel
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") { e.preventDefault(); window.location.hash = "#/admin"; } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  // the admin prototype asks the preview to scroll to the section being edited
  useEffect(() => {
    if (!preview) return;
    const f = (e) => {
      if (e.source !== window.parent || !e.data || e.data.type !== "portfolio-scroll") return;
      const el = document.getElementById(e.data.id);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: "smooth" });
    };
    window.addEventListener("message", f);
    return () => window.removeEventListener("message", f);
  }, [preview]);

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
      {!loading && !(preview && inPrototype()) && <SpiderWalker defaults={{ web: true, lights: 0 }} />}
      {preview && !inPrototype() && (
        <div className="adm-preview-bar">
          Preview of your unpublished edits <a href="#/admin">Back to admin</a>
        </div>
      )}
    </ThemeProvider>
  );
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const f = () => setRoute(readRoute());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);

  if (route === "admin") {
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    );
  }
  return (
    <ContentProvider preview={route === "preview"}>
      <Site key={route} preview={route === "preview"} />
    </ContentProvider>
  );
}
