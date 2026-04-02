import { Link } from "react-router-dom";

const MONO = "'IBM Plex Mono', 'Fira Code', monospace";

export default function ExperimentHeader({ number }) {
  return (
    <Link to="/" style={{
      fontFamily: MONO, fontSize: "11px", color: "#3b82f6",
      textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px",
      textDecoration: "none", display: "block",
    }}>
      Episode 1 · Experiment {number}
    </Link>
  );
}
