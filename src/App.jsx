import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import BuildAByte from "./BuildAByte";
import HexEditorSim from "./HexEditorSim";
import MemoryGrid from "./MemoryGrid";
import FileAnatomy from "./FileAnatomy";

function Home() {
  return (
    <div style={{
      background: "#0a0e17", minHeight: "100vh", padding: "60px 20px",
      fontFamily: "'DM Sans', sans-serif", color: "#e2e8f0", textAlign: "center",
    }}>
      <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Beneath the Bits</h1>
      <p style={{ color: "#64748b", marginBottom: "40px" }}>Episode 1 Experiments</p>
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/build-a-byte" style={{
          padding: "20px 32px", background: "#111827", border: "1px solid #1e2d4a",
          borderRadius: "12px", color: "#3b82f6", textDecoration: "none", fontSize: "18px",
        }}>
          1 → Build-a-Byte
        </Link>
        <Link to="/hex-editor" style={{
          padding: "20px 32px", background: "#111827", border: "1px solid #1e2d4a",
          borderRadius: "12px", color: "#f59e0b", textDecoration: "none", fontSize: "18px",
        }}>
          2 → Hex Editor
        </Link>
        <Link to="/memory-grid" style={{
          padding: "20px 32px", background: "#111827", border: "1px solid #1e2d4a",
          borderRadius: "12px", color: "#1aa93d", textDecoration: "none", fontSize: "18px",
        }}>
          3 → Memory Grid
        </Link>
        <Link to="/file-anatomy" style={{
          padding: "20px 32px", background: "#111827", border: "1px solid #1e2d4a",
          borderRadius: "12px", color: "#9d246e", textDecoration: "none", fontSize: "18px",
        }}>
          4 → File Anatomy
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/build-a-byte" element={<BuildAByte />} />
        <Route path="/hex-editor" element={<HexEditorSim />} />
        <Route path="/memory-grid" element={<MemoryGrid />} />
        <Route path="/file-anatomy" element={<FileAnatomy />} />
      </Routes>
    </BrowserRouter>
  );
}