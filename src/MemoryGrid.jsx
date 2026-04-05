import { useState, useMemo } from "react";
import ExperimentHeader from "./ExperimentHeader";
import { useTheme } from "./ThemeContext";

const MONO = "'IBM Plex Mono', 'Fira Code', monospace";
const SANS = "'DM Sans', 'Segoe UI', sans-serif";

const P = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceAlt: "#1a2235",
  border: "#1e2d4a",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMuted: "#374151",
  accent: "#3b82f6",
  accentAlt: "#06b6d4",
  green: "#10b981",
  orange: "#f59e0b",
  pink: "#ec4899",
  purple: "#8b5cf6",
  red: "#ef4444",
};

function toHex(v, pad = 2) { return v.toString(16).toUpperCase().padStart(pad, "0"); }
function toBin(v) { return v.toString(2).padStart(8, "0"); }

// ── Data types with distinct colors ──
const DATA_TYPES = {
  empty:  { color: P.textMuted, bg: "transparent", label: "Empty" },
  string: { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", label: "String (UTF-8)" },
  null:   { color: "#6366f1", bg: "rgba(99,102,241,0.08)", label: "Null terminator" },
  uint8:  { color: "#10b981", bg: "rgba(16,185,129,0.08)", label: "Uint8 number" },
  uint16: { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", label: "Uint16 (2 bytes)" },
  uint32: { color: "#ec4899", bg: "rgba(236,72,153,0.08)", label: "Uint32 (4 bytes)" },
  float:  { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)", label: "Float32 (4 bytes)" },
  rgb:    { color: "#06b6d4", bg: "rgba(6,182,212,0.08)", label: "RGB pixel" },
};

// ── Preset memory layouts ──
function makePresets() {
  const TOTAL = 64; // 4 rows of 16

  function blank() {
    return Array.from({ length: TOTAL }, (_, i) => ({
      address: i,
      value: 0x00,
      type: "empty",
      group: null,
      groupLabel: null,
    }));
  }

  // 1) "Hello" string in memory
  function helloString() {
    const mem = blank();
    const str = "Hello";
    const bytes = Array.from(new TextEncoder().encode(str));
    bytes.forEach((b, i) => {
      mem[i] = { ...mem[i], value: b, type: "string", group: "str1", groupLabel: `"${str}"` };
    });
    mem[bytes.length] = { ...mem[bytes.length], value: 0x00, type: "null", group: "str1", groupLabel: "\\0 (end)" };
    return { mem, title: '"Hello" in memory', desc: 'A string is just bytes in a row, ending with a null terminator (0x00) so the computer knows where it stops.' };
  }

  // 2) Two strings side by side
  function twoStrings() {
    const mem = blank();
    const s1 = "Hi";
    const s2 = "Bye";
    const b1 = Array.from(new TextEncoder().encode(s1));
    const b2 = Array.from(new TextEncoder().encode(s2));
    let offset = 0;
    b1.forEach((b, i) => {
      mem[offset + i] = { ...mem[offset + i], value: b, type: "string", group: "str1", groupLabel: `"${s1}"` };
    });
    offset += b1.length;
    mem[offset] = { ...mem[offset], value: 0x00, type: "null", group: "str1", groupLabel: "\\0" };
    offset += 1;

    // gap
    offset = 8;
    b2.forEach((b, i) => {
      mem[offset + i] = { ...mem[offset + i], value: b, type: "string", group: "str2", groupLabel: `"${s2}"` };
    });
    offset += b2.length;
    mem[offset] = { ...mem[offset], value: 0x00, type: "null", group: "str2", groupLabel: "\\0" };

    return { mem, title: 'Two strings in memory', desc: 'Each string occupies its own region. The gap between them (addresses 0x03–0x07) is unused memory — still holding zeroes.' };
  }

  // 3) Numbers in memory
  function numbers() {
    const mem = blank();
    // uint8 at 0x00
    mem[0] = { ...mem[0], value: 42, type: "uint8", group: "n1", groupLabel: "42 (uint8)" };
    // uint16 at 0x02–0x03 (little-endian)
    const val16 = 1000;
    mem[2] = { ...mem[2], value: val16 & 0xFF, type: "uint16", group: "n2", groupLabel: "1000 (uint16 LE)" };
    mem[3] = { ...mem[3], value: (val16 >> 8) & 0xFF, type: "uint16", group: "n2", groupLabel: "1000 (uint16 LE)" };
    // uint32 at 0x04–0x07 (little-endian)
    const val32 = 70000;
    mem[4] = { ...mem[4], value: val32 & 0xFF, type: "uint32", group: "n3", groupLabel: "70000 (uint32 LE)" };
    mem[5] = { ...mem[5], value: (val32 >> 8) & 0xFF, type: "uint32", group: "n3", groupLabel: "70000 (uint32 LE)" };
    mem[6] = { ...mem[6], value: (val32 >> 16) & 0xFF, type: "uint32", group: "n3", groupLabel: "70000 (uint32 LE)" };
    mem[7] = { ...mem[7], value: (val32 >> 24) & 0xFF, type: "uint32", group: "n3", groupLabel: "70000 (uint32 LE)" };
    // float32 at 0x08–0x0B
    const fbuf = new ArrayBuffer(4);
    new Float32Array(fbuf)[0] = 3.14;
    const fbytes = new Uint8Array(fbuf);
    for (let i = 0; i < 4; i++) {
      mem[8 + i] = { ...mem[8 + i], value: fbytes[i], type: "float", group: "n4", groupLabel: "3.14 (float32)" };
    }
    return { mem, title: 'Numbers in memory', desc: 'Different number types take different amounts of space. A uint8 needs 1 byte, a uint16 needs 2, a uint32 needs 4. Notice little-endian byte order — the smallest byte comes first.' };
  }

  // 4) RGB pixel
  function pixels() {
    const mem = blank();
    const colors = [
      { r: 255, g: 0, b: 0, label: "Red pixel" },
      { r: 0, g: 255, b: 0, label: "Green pixel" },
      { r: 0, g: 0, b: 255, label: "Blue pixel" },
      { r: 255, g: 165, b: 0, label: "Orange pixel" },
      { r: 128, g: 0, b: 128, label: "Purple pixel" },
    ];
    colors.forEach((c, ci) => {
      const off = ci * 3;
      mem[off]     = { ...mem[off],     value: c.r, type: "rgb", group: `px${ci}`, groupLabel: c.label };
      mem[off + 1] = { ...mem[off + 1], value: c.g, type: "rgb", group: `px${ci}`, groupLabel: c.label };
      mem[off + 2] = { ...mem[off + 2], value: c.b, type: "rgb", group: `px${ci}`, groupLabel: c.label };
    });
    return { mem, title: '5 pixels in memory', desc: 'Each pixel is 3 bytes: Red, Green, Blue. Five pixels = 15 bytes. An image is just a long row of these triplets — a 1920×1080 photo is ~6 million bytes of RGB values.' };
  }

  // 5) Mixed data
  function mixed() {
    const mem = blank();
    // string "OK" at 0x00
    mem[0] = { ...mem[0], value: 0x4F, type: "string", group: "s1", groupLabel: '"OK"' };
    mem[1] = { ...mem[1], value: 0x4B, type: "string", group: "s1", groupLabel: '"OK"' };
    mem[2] = { ...mem[2], value: 0x00, type: "null", group: "s1", groupLabel: "\\0" };
    // uint16 = 512 at 0x04
    mem[4] = { ...mem[4], value: 0x00, type: "uint16", group: "n1", groupLabel: "512 (uint16)" };
    mem[5] = { ...mem[5], value: 0x02, type: "uint16", group: "n1", groupLabel: "512 (uint16)" };
    // RGB at 0x08
    mem[8]  = { ...mem[8],  value: 0, type: "rgb", group: "px1", groupLabel: "Black pixel" };
    mem[9]  = { ...mem[9],  value: 0, type: "rgb", group: "px1", groupLabel: "Black pixel" };
    mem[10] = { ...mem[10], value: 0, type: "rgb", group: "px1", groupLabel: "Black pixel" };
    mem[11] = { ...mem[11], value: 255, type: "rgb", group: "px2", groupLabel: "White pixel" };
    mem[12] = { ...mem[12], value: 255, type: "rgb", group: "px2", groupLabel: "White pixel" };
    mem[13] = { ...mem[13], value: 255, type: "rgb", group: "px2", groupLabel: "White pixel" };
    // float at 0x10
    const fbuf = new ArrayBuffer(4);
    new Float32Array(fbuf)[0] = -9.81;
    const fb = new Uint8Array(fbuf);
    for (let i = 0; i < 4; i++) {
      mem[16 + i] = { ...mem[16 + i], value: fb[i], type: "float", group: "f1", groupLabel: "-9.81 (gravity)" };
    }
    return { mem, title: 'Mixed data in memory', desc: 'This is what real memory looks like — strings, numbers, pixels, and floats all sharing the same space. The computer has no idea what\'s what — YOUR PROGRAM tells it how to interpret each region.' };
  }

  return [helloString(), twoStrings(), numbers(), pixels(), mixed()];
}

// ── Custom input to write into memory ──
function useCustomInput(baseMem) {
  const [input, setInput] = useState("");

  const mem = useMemo(() => {
    if (!input) return null;
    const cells = baseMem.map(c => ({ ...c }));
    const bytes = Array.from(new TextEncoder().encode(input));
    bytes.forEach((b, i) => {
      if (i < cells.length) {
        cells[i] = { ...cells[i], value: b, type: "string", group: "custom", groupLabel: `"${input}"` };
      }
    });
    if (bytes.length < cells.length) {
      cells[bytes.length] = { ...cells[bytes.length], value: 0x00, type: "null", group: "custom", groupLabel: "\\0" };
    }
    return cells;
  }, [input, baseMem]);

  return { input, setInput, mem };
}

// ── Memory Cell ──
function MemCell({ cell, isHovered, onHover, onLeave }) {
  const P = useTheme().palette;
  const dt = DATA_TYPES[cell.type] || DATA_TYPES.empty;
  const isEmpty = cell.type === "empty";

  return (
    <div
      onMouseEnter={() => onHover(cell.address)}
      onMouseLeave={onLeave}
      style={{
        width: "56px",
        height: "56px",
        borderRadius: "6px",
        border: `1.5px solid ${isHovered ? dt.color : isEmpty ? P.border : `${dt.color}44`}`,
        background: isHovered ? `${dt.color}18` : dt.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "default",
        transition: "all 0.12s ease",
        position: "relative",
        boxShadow: isHovered ? `0 0 12px ${dt.color}33` : "none",
      }}
    >
      {/* Address label */}
      <div style={{
        position: "absolute",
        top: "2px",
        left: "4px",
        fontFamily: MONO,
        fontSize: "8px",
        color: isEmpty ? P.textMuted : `${dt.color}88`,
        letterSpacing: "0.05em",
      }}>
        {toHex(cell.address)}
      </div>

      {/* Hex value */}
      <div style={{
        fontFamily: MONO,
        fontSize: "16px",
        fontWeight: 700,
        color: isEmpty ? P.textMuted : dt.color,
        lineHeight: 1,
        marginTop: "4px",
      }}>
        {toHex(cell.value)}
      </div>

      {/* Decimal value small */}
      <div style={{
        fontFamily: MONO,
        fontSize: "9px",
        color: isEmpty ? `${P.textMuted}88` : `${dt.color}99`,
        marginTop: "2px",
      }}>
        {cell.value}
      </div>
    </div>
  );
}

// ── Inspector panel ──
function CellInspector({ cell }) {
  const P = useTheme().palette;
  if (!cell) return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "20px", textAlign: "center", color: P.textDim, fontFamily: SANS, fontSize: "13px",
    }}>
      Hover over any memory cell to inspect it
    </div>
  );

  const dt = DATA_TYPES[cell.type] || DATA_TYPES.empty;
  const bits = toBin(cell.value);
  const isPrintable = cell.value >= 32 && cell.value <= 126;

  return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "16px 20px",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "12px", flexWrap: "wrap", gap: "8px",
      }}>
        <div style={{
          fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          🔍 Address 0x{toHex(cell.address)}
        </div>
        <div style={{
          fontFamily: MONO, fontSize: "11px", padding: "3px 10px", borderRadius: "4px",
          background: `${dt.color}18`, color: dt.color, border: `1px solid ${dt.color}44`,
        }}>
          {dt.label}
        </div>
      </div>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Binary</div>
          <div style={{ fontFamily: MONO, fontSize: "18px", letterSpacing: "0.12em" }}>
            {bits.split("").map((b, i) => (
              <span key={i} style={{ color: b === "1" ? P.accent : P.textMuted }}>{b}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Hex</div>
          <div style={{ fontFamily: MONO, fontSize: "18px", color: P.orange, fontWeight: 700 }}>0x{toHex(cell.value)}</div>
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Decimal</div>
          <div style={{ fontFamily: MONO, fontSize: "18px", color: P.green, fontWeight: 700 }}>{cell.value}</div>
        </div>
        <div>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Character</div>
          <div style={{ fontFamily: MONO, fontSize: "18px", fontWeight: 700, color: isPrintable ? P.pink : P.textMuted }}>
            {isPrintable ? `"${String.fromCharCode(cell.value)}"` : cell.value === 0 ? "NUL" : "·"}
          </div>
        </div>
        {cell.type === "rgb" && (
          <div>
            <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Color channel</div>
            <div style={{
              width: "36px", height: "24px", borderRadius: "4px",
              background: `rgb(${cell.value}, ${cell.value}, ${cell.value})`,
              border: `1px solid ${P.border}`,
            }} />
          </div>
        )}
      </div>

      {cell.groupLabel && (
        <div style={{
          marginTop: "12px", paddingTop: "10px", borderTop: `1px solid ${P.border}`,
          fontFamily: SANS, fontSize: "12px", color: P.textDim,
        }}>
          Part of: <span style={{ color: dt.color, fontWeight: 600 }}>{cell.groupLabel}</span>
        </div>
      )}
    </div>
  );
}

// ── Legend ──
function Legend({ mem }) {
  const P = useTheme().palette;
  const types = new Set(mem.filter(c => c.type !== "empty").map(c => c.type));
  if (types.size === 0) return null;

  return (
    <div style={{
      display: "flex", gap: "14px", flexWrap: "wrap",
      fontFamily: MONO, fontSize: "11px",
    }}>
      {[...types].map(t => {
        const dt = DATA_TYPES[t];
        return (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "10px", height: "10px", borderRadius: "2px",
              background: dt.color, opacity: 0.8,
            }} />
            <span style={{ color: dt.color }}>{dt.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ──
export default function MemoryGrid() {
  const P = useTheme().palette;
  const presets = useMemo(() => makePresets(), []);
  const [presetIdx, setPresetIdx] = useState(0);
  const [hoveredAddr, setHoveredAddr] = useState(null);
  const [mode, setMode] = useState("preset"); // "preset" or "custom"

  const baseMem = presets[0].mem;
  const { input, setInput, mem: customMem } = useCustomInput(baseMem);

  const current = mode === "custom" && customMem ? customMem : presets[presetIdx].mem;
  const hoveredCell = hoveredAddr !== null ? current[hoveredAddr] : null;

  // Build rows of 16
  const rows = [];
  for (let i = 0; i < current.length; i += 16) {
    rows.push(current.slice(i, i + 16));
  }

  return (
    <div style={{
      background: P.bg, minHeight: "100vh", padding: "24px 16px",
      fontFamily: SANS, color: P.text,
    }}>
      <div style={{ maxWidth: "1020px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <ExperimentHeader number={7} />
          <h1 style={{
            fontFamily: SANS, fontSize: "28px", fontWeight: 800,
            color: P.text, margin: "0 0 6px 0", letterSpacing: "-0.02em",
          }}>
            Memory Grid
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: P.textDim, margin: 0 }}>
            See how data actually lives in your computer's RAM — addressed cells, each holding one byte.
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: "flex", gap: "8px", marginBottom: "16px", justifyContent: "center",
        }}>
          <button
            onClick={() => setMode("preset")}
            style={{
              fontFamily: MONO, fontSize: "12px", padding: "8px 20px", borderRadius: "6px",
              border: `1px solid ${mode === "preset" ? P.accent : P.border}`,
              background: mode === "preset" ? `${P.accent}22` : P.surface,
              color: mode === "preset" ? P.accent : P.textDim,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            📦 Preset Examples
          </button>
          <button
            onClick={() => setMode("custom")}
            style={{
              fontFamily: MONO, fontSize: "12px", padding: "8px 20px", borderRadius: "6px",
              border: `1px solid ${mode === "custom" ? P.green : P.border}`,
              background: mode === "custom" ? `${P.green}22` : P.surface,
              color: mode === "custom" ? P.green : P.textDim,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            ✏️ Type Your Own
          </button>
        </div>

        {/* Preset selector */}
        {mode === "preset" && (
          <div style={{
            background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
            padding: "14px 16px", marginBottom: "12px",
          }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
              {presets.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPresetIdx(i)}
                  style={{
                    fontFamily: MONO, fontSize: "11px", padding: "6px 12px", borderRadius: "5px",
                    border: `1px solid ${presetIdx === i ? P.accent : P.border}`,
                    background: presetIdx === i ? `${P.accent}22` : "transparent",
                    color: presetIdx === i ? P.accent : P.textDim,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {p.title}
                </button>
              ))}
            </div>
            <p style={{
              fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: 1.6,
            }}>
              {presets[presetIdx].desc}
            </p>
          </div>
        )}

        {/* Custom input */}
        {mode === "custom" && (
          <div style={{
            background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
            padding: "14px 16px", marginBottom: "12px",
          }}>
            <div style={{
              fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px",
            }}>
              Type anything to see it stored in memory
            </div>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 60))}
              placeholder="Type here..."
              style={{
                width: "100%", fontFamily: MONO, fontSize: "16px",
                background: P.surfaceAlt, color: P.text,
                border: `1px solid ${P.border}`, borderRadius: "6px",
                padding: "10px 14px", outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = P.green}
              onBlur={e => e.target.style.borderColor = P.border}
            />
            {input && (
              <div style={{
                fontFamily: MONO, fontSize: "11px", color: P.textDim, marginTop: "6px",
              }}>
                {new TextEncoder().encode(input).length} bytes + 1 null terminator = {new TextEncoder().encode(input).length + 1} bytes in memory
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "8px",
          padding: "10px 16px", marginBottom: "12px",
        }}>
          <Legend mem={current} />
        </div>

        {/* The grid */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "14px",
          padding: "20px 16px", marginBottom: "12px", overflowX: "auto",
        }}>
          {/* Column headers */}
          <div style={{
            display: "flex", gap: "4px", marginBottom: "8px", paddingLeft: "60px",
          }}>
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} style={{
                width: "56px", textAlign: "center",
                fontFamily: MONO, fontSize: "10px", color: P.textMuted,
              }}>
                +{toHex(i, 1)}
              </div>
            ))}
          </div>

          {/* Memory rows */}
          {rows.map((row, ri) => (
            <div key={ri} style={{
              display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px",
            }}>
              {/* Row address */}
              <div style={{
                width: "52px", flexShrink: 0, textAlign: "right", paddingRight: "8px",
                fontFamily: MONO, fontSize: "11px", color: P.textMuted,
              }}>
                0x{toHex(ri * 16)}
              </div>

              {/* Cells */}
              {row.map((cell) => (
                <MemCell
                  key={cell.address}
                  cell={cell}
                  isHovered={hoveredAddr === cell.address}
                  onHover={setHoveredAddr}
                  onLeave={() => setHoveredAddr(null)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Inspector */}
        <div style={{ marginBottom: "24px" }}>
          <CellInspector cell={hoveredCell} />
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", padding: "16px", borderTop: `1px solid ${P.border}`,
        }}>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: 1.6 }}>
            Every byte in memory has an address. Your program decides what each byte means.
            <br />
            <span style={{ color: P.accent }}>The same byte 0x41 could be the letter "A", the number 65, or part of a colour</span> — context is everything.
          </p>
        </div>
      </div>
    </div>
  );
}