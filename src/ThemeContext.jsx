import { createContext, useContext, useEffect, useState } from "react";

export const THEMES = {
  black: { id: "black", label: "Obsidian", swatch: "#e0263f" },
  blue: { id: "blue", label: "Midnight", swatch: "#3b82f6" },
  orange: { id: "orange", label: "Ember", swatch: "#ff8c1a" },
  white: { id: "white", label: "Silver", swatch: "#e8e8ea" },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Theme only ever changes when the user explicitly clicks a swatch below.
  const [theme, setTheme] = useState(() => localStorage.getItem("kt-theme") || "black");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kt-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
