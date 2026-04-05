import { useState, useRef, useEffect } from "react";
import ExperimentHeader from "./ExperimentHeader";

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

function toHex(v) { return v.toString(16).toUpperCase().padStart(2, "0"); }
function toBin(v) { return v.toString(2).padStart(8, "0"); }
function toPrintable(v) { return v >= 32 && v <= 126 ? String.fromCharCode(v) : "·"; }

// ── Offset gutter ──
function OffsetColumn({ count }) {
  const rows = Math.ceil(count / 16) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{
          fontFamily: MONO, fontSize: "13px", color: P.textMuted,
          height: "28px", display: "flex", alignItems: "center",
          letterSpacing: "0.05em",
        }}>
          {(i * 16).toString(16).toUpperCase().padStart(8, "0")}
        </div>
      ))}
    </div>
  );
}

// ── Single hex byte ──
function HexByte({ value, index, isHovered, onHover, onLeave }) {
  return (
    <span
      onMouseEnter={() => onHover(index)}
      onMouseLeave={onLeave}
      style={{
        fontFamily: MONO,
        fontSize: "14px",
        fontWeight: 600,
        color: isHovered ? P.accent : P.text,
        background: isHovered ? `${P.accent}22` : "transparent",
        borderRadius: "3px",
        padding: "3px 4px",
        cursor: "default",
        transition: "all 0.1s",
        display: "inline-block",
        width: "26px",
        textAlign: "center",
      }}
    >
      {toHex(value)}
    </span>
  );
}

// ── Hex grid ──
function HexGrid({ bytes, hoveredIdx, onHover, onLeave }) {
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16));
  }
  if (rows.length === 0) rows.push([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{
          display: "flex", gap: "4px", height: "28px", alignItems: "center", flexWrap: "nowrap",
        }}>
          {row.map((b, ci) => {
            const idx = ri * 16 + ci;
            return (
              <span key={idx}>
                <HexByte
                  value={b}
                  index={idx}
                  isHovered={hoveredIdx === idx}
                  onHover={onHover}
                  onLeave={onLeave}
                />
                {ci === 7 && <span style={{ width: "8px", display: "inline-block" }} />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── ASCII column ──
function AsciiColumn({ bytes, hoveredIdx, onHover, onLeave }) {
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16));
  }
  if (rows.length === 0) rows.push([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{
          display: "flex", height: "28px", alignItems: "center",
          fontFamily: MONO, fontSize: "13px",
        }}>
          {row.map((b, ci) => {
            const idx = ri * 16 + ci;
            const ch = toPrintable(b);
            const isHov = hoveredIdx === idx;
            return (
              <span
                key={idx}
                onMouseEnter={() => onHover(idx)}
                onMouseLeave={onLeave}
                style={{
                  color: ch === "·" ? P.textMuted : isHov ? P.green : P.accentAlt,
                  background: isHov ? `${P.green}22` : "transparent",
                  borderRadius: "2px",
                  padding: "2px 1px",
                  cursor: "default",
                  width: "11px",
                  textAlign: "center",
                  display: "inline-block",
                  transition: "all 0.1s",
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Detail inspector panel ──
function ByteInspector({ byte, index }) {
  if (byte == null) return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "20px", textAlign: "center", color: P.textDim, fontFamily: SANS, fontSize: "13px",
    }}>
      Hover over any byte to inspect it
    </div>
  );

  const bits = toBin(byte);
  const ch = toPrintable(byte);
  const isPrintable = byte >= 32 && byte <= 126;

  return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "16px 20px",
    }}>
      <div style={{
        fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px",
      }}>
        🔍 Byte Inspector — Offset 0x{index.toString(16).toUpperCase().padStart(2, "0")}
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {/* Binary */}
        <div style={{ flex: "1 1 160px" }}>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Binary</div>
          <div style={{ fontFamily: MONO, fontSize: "20px", letterSpacing: "0.15em" }}>
            {bits.split("").map((b, i) => (
              <span key={i} style={{ color: b === "1" ? P.accent : P.textMuted }}>{b}</span>
            ))}
          </div>
        </div>
        {/* Decimal */}
        <div style={{ flex: "0 0 70px" }}>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Decimal</div>
          <div style={{ fontFamily: MONO, fontSize: "20px", color: P.green, fontWeight: 700 }}>{byte}</div>
        </div>
        {/* Hex */}
        <div style={{ flex: "0 0 60px" }}>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Hex</div>
          <div style={{ fontFamily: MONO, fontSize: "20px", color: P.orange, fontWeight: 700 }}>0x{toHex(byte)}</div>
        </div>
        {/* ASCII */}
        <div style={{ flex: "0 0 80px" }}>
          <div style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Character</div>
          <div style={{
            fontFamily: MONO, fontSize: "20px", fontWeight: 700,
            color: isPrintable ? P.pink : P.textMuted,
          }}>
            {isPrintable ? `"${ch}"` : ch === "·" ? "non-printable" : ch}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Encoding selector ──
function EncodingPicker({ encoding, onChange }) {
  const options = ["UTF-8", "ASCII (7-bit)", "Latin-1"];
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <span style={{ fontFamily: SANS, fontSize: "11px", color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Encoding:</span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            fontFamily: MONO, fontSize: "11px", padding: "4px 10px", borderRadius: "4px",
            border: `1px solid ${encoding === opt ? P.accent : P.border}`,
            background: encoding === opt ? `${P.accent}22` : "transparent",
            color: encoding === opt ? P.accent : P.textDim,
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Stats bar ──
function StatsBar({ bytes, text }) {
  return (
    <div style={{
      display: "flex", gap: "20px", flexWrap: "wrap",
      fontFamily: MONO, fontSize: "12px", color: P.textDim,
    }}>
      <span><span style={{ color: P.accent }}>{text.length}</span> characters</span>
      <span><span style={{ color: P.orange }}>{bytes.length}</span> bytes</span>
      <span><span style={{ color: P.green }}>{bytes.length * 8}</span> bits</span>
      {text.length !== bytes.length && (
        <span style={{ color: P.pink }}>⚡ Multi-byte characters detected</span>
      )}
    </div>
  );
}

// ── Preset snippets ──
const PRESETS = [
  { label: "Hello", text: "Hello" },
  { label: "Hello World!", text: "Hello World!" },
  { label: "ABC abc 123", text: "ABC abc 123" },
  { label: "Emoji 🌍", text: "Hello 🌍" },
  { label: "日本語", text: "日本語" },
  { label: "Mixed", text: "Café ☕ naïve" },
  { label: "Escape chars", text: "Line1\nLine2\tTabbed" },
];

// ── Main App ──
export default function HexEditorSim() {
  const [text, setText] = useState("Hello");
  const [encoding, setEncoding] = useState("UTF-8");
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const textareaRef = useRef(null);

  // Encode text to bytes
  const bytes = (() => {
    try {
      if (encoding === "UTF-8") {
        return Array.from(new TextEncoder().encode(text));
      } else if (encoding === "ASCII (7-bit)") {
        return Array.from(text).map(c => {
          const code = c.charCodeAt(0);
          return code > 127 ? 63 : code; // '?' for non-ASCII
        });
      } else {
        // Latin-1
        return Array.from(text).map(c => {
          const code = c.charCodeAt(0);
          return code > 255 ? 63 : code;
        });
      }
    } catch { return []; }
  })();

  return (
    <div style={{
      background: P.bg, minHeight: "100vh", padding: "24px 16px",
      fontFamily: SANS, color: P.text,
    }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <ExperimentHeader number={4} />
          <h1 style={{
            fontFamily: SANS, fontSize: "28px", fontWeight: 800,
            color: P.text, margin: "0 0 6px 0", letterSpacing: "-0.02em",
          }}>
            Hex Editor Simulator
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: P.textDim, margin: 0 }}>
            Type anything. See the raw bytes your computer actually stores.
          </p>
        </div>

        {/* Input area */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "12px",
          padding: "16px", marginBottom: "12px",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "10px", flexWrap: "wrap", gap: "8px",
          }}>
            <div style={{
              fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              ✏️ Your Text
            </div>
            <EncodingPicker encoding={encoding} onChange={setEncoding} />
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder="Type something here..."
            style={{
              width: "100%", minHeight: "60px", maxHeight: "120px", resize: "vertical",
              fontFamily: MONO, fontSize: "16px", lineHeight: 1.6,
              background: P.surfaceAlt, color: P.text,
              border: `1px solid ${P.border}`, borderRadius: "8px",
              padding: "12px 14px", outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => e.target.style.borderColor = P.accent}
            onBlur={(e) => e.target.style.borderColor = P.border}
          />

          {/* Presets */}
          <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: SANS, fontSize: "11px", color: P.textDim, alignSelf: "center",
              marginRight: "4px",
            }}>Try:</span>
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setText(p.text)}
                style={{
                  fontFamily: MONO, fontSize: "11px", padding: "4px 10px", borderRadius: "4px",
                  border: `1px solid ${P.border}`, background: P.surfaceAlt, color: P.textDim,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = P.accent; e.target.style.color = P.accent; }}
                onMouseLeave={(e) => { e.target.style.borderColor = P.border; e.target.style.color = P.textDim; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "8px",
          padding: "10px 16px", marginBottom: "12px",
        }}>
          <StatsBar bytes={bytes} text={text} />
        </div>

        {/* Hex viewer */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "12px",
          padding: "16px", marginBottom: "12px", overflowX: "auto",
        }}>
          <div style={{
            fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px",
          }}>
            ⬡ Hex View — What your computer actually stores
          </div>

          {bytes.length === 0 ? (
            <div style={{
              fontFamily: MONO, fontSize: "14px", color: P.textMuted,
              padding: "20px", textAlign: "center",
            }}>
              Start typing to see bytes appear...
            </div>
          ) : (
            <div style={{ display: "flex", gap: "16px" }}>
              <OffsetColumn count={bytes.length} />
              <HexGrid
                bytes={bytes}
                hoveredIdx={hoveredIdx}
                onHover={setHoveredIdx}
                onLeave={() => setHoveredIdx(null)}
              />
              <div style={{
                width: "1px", background: P.border, alignSelf: "stretch", flexShrink: 0,
              }} />
              <AsciiColumn
                bytes={bytes}
                hoveredIdx={hoveredIdx}
                onHover={setHoveredIdx}
                onLeave={() => setHoveredIdx(null)}
              />
            </div>
          )}
        </div>

        {/* Byte inspector */}
        <div style={{ marginBottom: "12px" }}>
          <ByteInspector
            byte={hoveredIdx !== null ? bytes[hoveredIdx] : null}
            index={hoveredIdx ?? 0}
          />
        </div>

        {/* Encoding insight */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "16px 20px", marginBottom: "24px",
        }}>
          <div style={{
            fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px",
          }}>
            💡 What you're seeing
          </div>
          <div style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, lineHeight: 1.7 }}>
            {encoding === "UTF-8" && (
              <>
                <strong style={{ color: P.text }}>UTF-8</strong> uses 1 byte for English letters (A = 0x41), 
                2 bytes for accented characters (é = 0xC3 0xA9), 
                3 bytes for CJK characters, and 4 bytes for emoji.
                {text.length !== bytes.length && (
                  <span style={{ color: P.pink }}> Your text has multi-byte characters — notice how the byte count is higher than the character count!</span>
                )}
              </>
            )}
            {encoding === "ASCII (7-bit)" && (
              <>
                <strong style={{ color: P.text }}>ASCII</strong> maps each character to a single byte (0–127 only). 
                Characters outside this range are replaced with <span style={{ color: P.orange }}>? (0x3F)</span>. 
                This is why ASCII can't handle emoji or non-English scripts.
              </>
            )}
            {encoding === "Latin-1" && (
              <>
                <strong style={{ color: P.text }}>Latin-1 (ISO 8859-1)</strong> extends ASCII to 256 characters, 
                adding Western European accented letters. Still one byte per character, 
                but anything beyond (emoji, CJK) becomes <span style={{ color: P.orange }}>?</span>.
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", padding: "16px", borderTop: `1px solid ${P.border}`,
        }}>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: 1.6 }}>
            Every text file on your computer is just a sequence of these bytes.
            <br />
            <span style={{ color: P.accent }}>The hex editor reveals what's really on disk</span> — no interpretation, no formatting, just raw data.
          </p>
        </div>
      </div>
    </div>
  );
}