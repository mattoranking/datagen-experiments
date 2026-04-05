import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ThemeProvider, useTheme } from "./ThemeContext";
import BuildAByte from "./BuildAByte";
import HexEditorSim from "./HexEditorSim";
import MemoryGrid from "./MemoryGrid";
import FileAnatomy from "./FileAnatomy";
import FourBitMachine from "./FourBitMachine";
import BitOps from "./BitOps";
import BusExplorer from "./BusExplorer";
import CpuArchitecture from "./CpuArchitecture";

function Home() {
  const { mode, palette: P, toggle } = useTheme();
  return (
    <div style={{
      background: P.bg, minHeight: "100vh", padding: "60px 20px",
      fontFamily: "'DM Sans', sans-serif", color: P.text, textAlign: "center",
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
        <button
          onClick={toggle}
          aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
          style={{
            background: "none", border: `1px solid ${P.textDim}`, borderRadius: "6px",
            padding: "4px 12px", cursor: "pointer", fontSize: "16px",
            color: P.textDim, lineHeight: 1,
          }}
        >
          {mode === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
      <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Beneath the Bits</h1>
      <p style={{ color: P.textDim, marginBottom: "40px" }}>Episode 1 Experiments</p>
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/bit-ops" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#e51278", textDecoration: "none", fontSize: "18px",
        }}>
          1 → Bit Operations
        </Link>
        <Link to="/fourbit-machine" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#0feff3", textDecoration: "none", fontSize: "18px",
        }}>
          2 → 4 Bit Machine
        </Link>
        <Link to="/cpu-architecture" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#def515", textDecoration: "none", fontSize: "18px",
        }}>
          3 → Cpu Architecture
        </Link>
        <Link to="/bus-explorer" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#06b6d4", textDecoration: "none", fontSize: "18px",
        }}>
          4 → Bus Explorer
        </Link>
        <Link to="/build-a-byte" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#3b82f6", textDecoration: "none", fontSize: "18px",
        }}>
          5 → Build-a-Byte
        </Link>
        <Link to="/hex-editor" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#f59e0b", textDecoration: "none", fontSize: "18px",
        }}>
          6 → Hex Editor
        </Link>
        <Link to="/memory-grid" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#1aa93d", textDecoration: "none", fontSize: "18px",
        }}>
          7 → Memory Grid
        </Link>
        <Link to="/file-anatomy" style={{
          padding: "20px 32px", background: P.surface, border: `1px solid ${P.border}`,
          borderRadius: "12px", color: "#9d246e", textDecoration: "none", fontSize: "18px",
        }}>
          8 → File Anatomy
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fourbit-machine" element={<FourBitMachine />} />
        <Route path="/bit-ops" element={<BitOps />} />
        <Route path="/cpu-architecture" element={<CpuArchitecture />} />
        <Route path="/bus-explorer" element={<BusExplorer />} />
        <Route path="/build-a-byte" element={<BuildAByte />} />
        <Route path="/hex-editor" element={<HexEditorSim />} />
        <Route path="/memory-grid" element={<MemoryGrid />} />
        <Route path="/file-anatomy" element={<FileAnatomy />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}