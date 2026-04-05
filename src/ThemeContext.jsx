import { createContext, useContext, useState, useEffect } from "react";

const dark = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceAlt: "#1a2235",
  border: "#1e2d4a",
  borderActive: "#3b82f6",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMuted: "#374151",
  bit0: "#1e293b",
  bit1: "#3b82f6",
  bit1Glow: "rgba(59,130,246,0.35)",
  accent: "#3b82f6",
  accentAlt: "#06b6d4",
  green: "#10b981",
  orange: "#f59e0b",
  pink: "#ec4899",
  purple: "#8b5cf6",
  red: "#ef4444",
  yellow: "#eab308",
  cyan: "#06b6d4",
};

const light = {
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  border: "#cbd5e1",
  borderActive: "#3b82f6",
  text: "#0f172a",
  textDim: "#64748b",
  textMuted: "#94a3b8",
  bit0: "#e2e8f0",
  bit1: "#3b82f6",
  bit1Glow: "rgba(59,130,246,0.25)",
  accent: "#2563eb",
  accentAlt: "#0891b2",
  green: "#059669",
  orange: "#d97706",
  pink: "#db2777",
  purple: "#7c3aed",
  red: "#dc2626",
  yellow: "#ca8a04",
  cyan: "#0891b2",
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("btb-theme") || "dark"; }
    catch { return "dark"; }
  });

  useEffect(() => {
    try { localStorage.setItem("btb-theme", mode); } catch {}
  }, [mode]);

  const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));
  const palette = mode === "dark" ? dark : light;

  return (
    <ThemeContext.Provider value={{ mode, palette, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
