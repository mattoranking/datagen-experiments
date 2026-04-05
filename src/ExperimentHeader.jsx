import { Link } from "react-router-dom";
import { useTheme } from "./ThemeContext";

const MONO = "'IBM Plex Mono', 'Fira Code', monospace";

export default function ExperimentHeader({ number }) {
  const { mode, toggle } = useTheme();

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
      <Link to="/" style={{
        fontFamily: MONO, fontSize: "11px", color: "#3b82f6",
        textTransform: "uppercase", letterSpacing: "0.2em",
        textDecoration: "none",
      }}>
        Episode 1 · Experiment {number}
      </Link>
      <button
        onClick={toggle}
        aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
        style={{
          background: "none", border: "1px solid #64748b", borderRadius: "6px",
          padding: "2px 8px", cursor: "pointer", fontSize: "14px",
          color: "#64748b", lineHeight: 1,
        }}
      >
        {mode === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  );
}
