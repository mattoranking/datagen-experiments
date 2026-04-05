import { useState, useCallback } from "react";
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
  yellow: "#eab308",
  cyan: "#06b6d4",
};

function toBin(v, w = 8) { return ((v & ((1 << w) - 1)) >>> 0).toString(2).padStart(w, "0"); }
function toHex(v) { return "0x" + ((v & 0xFF) >>> 0).toString(16).toUpperCase().padStart(2, "0"); }

// ── Operations ──
const OPS = {
  and:    { label: "AND",          symbol: "&",  color: P.green,  type: "binary",  desc: "Each result bit is 1 only if BOTH input bits are 1. Used for masking — extracting specific bits from a value.",  truthHeader: "A & B" },
  or:     { label: "OR",           symbol: "|",  color: P.accent, type: "binary",  desc: "Each result bit is 1 if EITHER input bit is 1 (or both). Used for setting specific bits to 1 without touching others.", truthHeader: "A | B" },
  xor:    { label: "XOR",          symbol: "^",  color: P.orange, type: "binary",  desc: "Each result bit is 1 if the inputs DIFFER. Same inputs give 0. XOR with itself always gives 0 — used in checksums, encryption, and swapping values without a temp variable.", truthHeader: "A ^ B" },
  not:    { label: "NOT",          symbol: "~",  color: P.pink,   type: "unary",   desc: "Every bit flips: 0 becomes 1 and 1 becomes 0. This is the first step of two's complement negation. Also called the bitwise complement." },
  shl:    { label: "Shift left",   symbol: "<<", color: P.cyan,   type: "shift",   desc: "Every bit moves left by N positions. Zeroes fill in from the right. Each shift left DOUBLES the value — it's multiplication by 2." },
  shr:    { label: "Shift right",  symbol: ">>", color: P.purple,  type: "shift",   desc: "Every bit moves right by N positions. Zeroes fill in from the left. Each shift right HALVES the value (integer division by 2). Shifted-out bits are lost." },
  rotl:   { label: "Rotate left",  symbol: "ROL",color: P.yellow,  type: "shift",   desc: "Like shift left, but bits that fall off the left side wrap around to the right. No data is lost — the bits just rotate around like a carousel." },
  rotr:   { label: "Rotate right", symbol: "ROR",color: P.yellow,  type: "shift",   desc: "Like shift right, but bits that fall off the right side wrap around to the left. Used in cryptographic algorithms and hash functions." },
};

// ── Bit display row ──
function BitRow({ bits, label, color, highlight }) {
  const P = useTheme().palette;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim, width: "56px", textAlign: "right", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: "3px" }}>
        {bits.split("").map((b, i) => (
          <div key={i} style={{
            width: "32px", height: "36px", borderRadius: "5px",
            border: `1.5px solid ${b === "1" ? color : P.border}`,
            background: b === "1" ? `${color}18` : P.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
            boxShadow: highlight && highlight[i] ? `0 0 8px ${color}44` : "none",
          }}>
            <span style={{
              fontFamily: MONO, fontSize: "18px", fontWeight: 700,
              color: b === "1" ? color : P.textMuted,
            }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Toggleable bit row ──
function ToggleBitRow({ bits, label, color, onToggle }) {
  const P = useTheme().palette;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim, width: "56px", textAlign: "right", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: "3px" }}>
        {bits.map((b, i) => (
          <div key={i} onClick={() => onToggle(i)} style={{
            width: "32px", height: "36px", borderRadius: "5px",
            border: `1.5px solid ${b === 1 ? color : P.border}`,
            background: b === 1 ? `${color}18` : P.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s", userSelect: "none",
          }}>
            <span style={{
              fontFamily: MONO, fontSize: "18px", fontWeight: 700,
              color: b === 1 ? color : P.textMuted,
            }}>{b}</span>
          </div>
        ))}
      </div>
      <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim, marginLeft: "4px" }}>
        = {bits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0)} ({toHex(bits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0))})
      </span>
    </div>
  );
}

// ── Truth table for binary ops ──
function TruthTable({ op }) {
  const P = useTheme().palette;
  const info = OPS[op];
  const rows = [
    { a: 0, b: 0 },
    { a: 0, b: 1 },
    { a: 1, b: 0 },
    { a: 1, b: 1 },
  ];

  function calc(a, b) {
    if (op === "and") return a & b;
    if (op === "or")  return a | b;
    if (op === "xor") return a ^ b;
    return 0;
  }

  return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "8px",
      padding: "12px 16px", display: "inline-block",
    }}>
      <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
        Truth table
      </div>
      <div style={{ fontFamily: MONO, fontSize: "13px", lineHeight: "28px" }}>
        <div style={{ display: "flex", gap: "16px", borderBottom: `1px solid ${P.border}`, paddingBottom: "4px", marginBottom: "4px" }}>
          <span style={{ width: "24px", color: P.accent, textAlign: "center" }}>A</span>
          <span style={{ width: "24px", color: P.orange, textAlign: "center" }}>B</span>
          <span style={{ width: "50px", color: info.color, textAlign: "center" }}>{info.truthHeader}</span>
        </div>
        {rows.map((r, i) => {
          const result = calc(r.a, r.b);
          return (
            <div key={i} style={{ display: "flex", gap: "16px" }}>
              <span style={{ width: "24px", textAlign: "center", color: r.a ? P.accent : P.textMuted }}>{r.a}</span>
              <span style={{ width: "24px", textAlign: "center", color: r.b ? P.orange : P.textMuted }}>{r.b}</span>
              <span style={{ width: "50px", textAlign: "center", color: result ? info.color : P.textMuted, fontWeight: 700 }}>{result}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shift visualizer ──
function ShiftVisual({ bits, amount, op, color }) {
  const P = useTheme().palette;
  const originalBin = toBin(bits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0));
  const val = bits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0);

  let result;
  if (op === "shl")  result = (val << amount) & 0xFF;
  if (op === "shr")  result = (val >>> amount) & 0xFF;
  if (op === "rotl") result = ((val << amount) | (val >>> (8 - amount))) & 0xFF;
  if (op === "rotr") result = ((val >>> amount) | (val << (8 - amount))) & 0xFF;

  const resultBin = toBin(result);
  const isRotate = op === "rotl" || op === "rotr";
  const direction = op === "shl" || op === "rotl" ? "left" : "right";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <BitRow bits={originalBin} label="Before" color={P.accent} />

      {/* Arrow showing direction */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ width: "56px" }} />
        <div style={{
          display: "flex", gap: "3px", alignItems: "center",
          fontFamily: MONO, fontSize: "14px", color,
        }}>
          {direction === "left" ? (
            <>
              {isRotate && <span style={{ fontSize: "11px", color: P.yellow }}>wrap</span>}
              <span>{"<".repeat(Math.min(amount, 4))}--- shift {amount}</span>
            </>
          ) : (
            <>
              <span>shift {amount} ---{">"}</span>
              {isRotate && <span style={{ fontSize: "11px", color: P.yellow }}>wrap</span>}
            </>
          )}
        </div>
      </div>

      <BitRow bits={resultBin} label="After" color={color} />

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
        <span style={{ width: "56px" }} />
        <span style={{ fontFamily: MONO, fontSize: "12px", color: P.textDim }}>
          {val} {OPS[op].symbol} {amount} = {result}
          {(op === "shl" && amount > 0) && <span style={{ color: P.cyan }}>{" "}({val} x {Math.pow(2, amount)} = {val * Math.pow(2, amount)}{val * Math.pow(2, amount) > 255 ? `, truncated to ${result}` : ""})</span>}
          {(op === "shr" && amount > 0) && <span style={{ color: P.purple }}>{" "}({val} / {Math.pow(2, amount)} = {Math.floor(val / Math.pow(2, amount))})</span>}
        </span>
      </div>
    </div>
  );
}

// ── Use cases panel ──
function UseCases({ op }) {
  const P = useTheme().palette;
  const cases = {
    and: [
      { title: "Masking bits", code: "value & 0x0F", explain: "Extracts the lower 4 bits (lower nibble). The mask 00001111 zeroes out everything above." },
      { title: "Checking a flag", code: "flags & 0x04", explain: "Tests if bit 2 is set. Result is non-zero only if that specific bit is 1." },
      { title: "Even/odd check", code: "n & 1", explain: "If the lowest bit is 1, the number is odd. If 0, it's even. Faster than modulo." },
    ],
    or: [
      { title: "Setting a flag", code: "flags | 0x04", explain: "Forces bit 2 to 1 without changing any other bits." },
      { title: "Combining permissions", code: "READ | WRITE", explain: "Merges permission bits together. Each flag occupies its own bit position." },
    ],
    xor: [
      { title: "Toggle a bit", code: "flags ^ 0x04", explain: "Flips bit 2: if it was 1 it becomes 0, if 0 it becomes 1." },
      { title: "Swap without temp", code: "a^=b; b^=a; a^=b", explain: "XOR trick to swap two values without a temporary variable." },
      { title: "Detect changes", code: "old ^ new", explain: "Result has 1s wherever the two values differ. Used in change detection and checksums." },
    ],
    not: [
      { title: "Two's complement step 1", code: "~value + 1 = -value", explain: "Flipping all bits then adding 1 gives the negative. This is how CPUs negate numbers." },
      { title: "Clearing with mask", code: "value & ~mask", explain: "NOT the mask, then AND. Clears specific bits while keeping the rest." },
    ],
    shl: [
      { title: "Multiply by power of 2", code: "n << 3", explain: "Shift left 3 = multiply by 8. Much faster than actual multiplication on hardware." },
      { title: "Building a byte", code: "1 << bitPos", explain: "Creates a value with only one bit set at a specific position. Used to build flag masks." },
    ],
    shr: [
      { title: "Divide by power of 2", code: "n >> 2", explain: "Shift right 2 = integer divide by 4. Used everywhere in graphics and signal processing." },
      { title: "Extract upper nibble", code: "(byte >> 4) & 0x0F", explain: "Shifts upper 4 bits down, then masks. This is how hex display works internally." },
    ],
    rotl: [
      { title: "Cryptography", code: "ROL in SHA-256", explain: "Hash functions use rotations because they mix bits without losing any — every input bit affects the output." },
    ],
    rotr: [
      { title: "Hash functions", code: "ROR in SHA-512", explain: "Right rotations spread bit influence across the word. Combined with XOR and shifts, they create avalanche effects." },
    ],
  };

  const items = cases[op] || [];
  if (items.length === 0) return null;

  return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "14px 18px",
    }}>
      <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
        Real-world uses
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <code style={{
              fontFamily: MONO, fontSize: "12px", color: OPS[op].color,
              background: `${OPS[op].color}12`, padding: "3px 8px", borderRadius: "4px",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {c.code}
            </code>
            <div>
              <div style={{ fontFamily: SANS, fontSize: "13px", color: P.text, fontWeight: 500 }}>{c.title}</div>
              <div style={{ fontFamily: SANS, fontSize: "12px", color: P.textDim, marginTop: "2px" }}>{c.explain}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──
export default function BitwiseOps() {
  const P = useTheme().palette;
  const [aBits, setABits] = useState([1, 0, 1, 1, 0, 1, 0, 1]); // 0xB5 = 181
  const [bBits, setBBits] = useState([1, 1, 0, 0, 1, 0, 1, 0]); // 0xCA = 202
  const [op, setOp] = useState("and");
  const [shiftAmt, setShiftAmt] = useState(1);

  const toggleA = useCallback((i) => {
    setABits(prev => { const n = [...prev]; n[i] = n[i] === 0 ? 1 : 0; return n; });
  }, []);
  const toggleB = useCallback((i) => {
    setBBits(prev => { const n = [...prev]; n[i] = n[i] === 0 ? 1 : 0; return n; });
  }, []);

  const aVal = aBits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0);
  const bVal = bBits.reduce((a, b, i) => a + b * Math.pow(2, 7 - i), 0);

  const info = OPS[op];

  // Compute result
  let result;
  if (op === "and")  result = aVal & bVal;
  if (op === "or")   result = aVal | bVal;
  if (op === "xor")  result = aVal ^ bVal;
  if (op === "not")  result = (~aVal) & 0xFF;
  if (op === "shl")  result = (aVal << shiftAmt) & 0xFF;
  if (op === "shr")  result = (aVal >>> shiftAmt) & 0xFF;
  if (op === "rotl") result = ((aVal << shiftAmt) | (aVal >>> (8 - shiftAmt))) & 0xFF;
  if (op === "rotr") result = ((aVal >>> shiftAmt) | (aVal << (8 - shiftAmt))) & 0xFF;

  const resultBin = toBin(result);

  // Highlight bits that changed
  const aBin = toBin(aVal);
  const highlight = resultBin.split("").map((b, i) => b !== aBin[i]);

  return (
    <div style={{ background: P.bg, minHeight: "100vh", padding: "24px 16px", fontFamily: SANS, color: P.text }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <ExperimentHeader number={1} />
          <h1 style={{ fontFamily: SANS, fontSize: "28px", fontWeight: 800, color: P.text, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            Bitwise Operations Lab
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: P.textDim, margin: 0 }}>
            The fundamental operations computers perform on individual bits. Toggle inputs, pick an operation, see the result.
          </p>
        </div>

        {/* Operation selector */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "12px 16px", marginBottom: "12px",
        }}>
          <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            Operation
          </div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {Object.entries(OPS).map(([key, o]) => (
              <button key={key} onClick={() => setOp(key)} style={{
                fontFamily: MONO, fontSize: "12px", padding: "6px 12px", borderRadius: "6px",
                border: `1px solid ${op === key ? o.color : P.border}`,
                background: op === key ? `${o.color}22` : "transparent",
                color: op === key ? o.color : P.textDim,
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {o.label} ({o.symbol})
              </button>
            ))}
          </div>
        </div>

        {/* Input A */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "12px",
          padding: "16px", marginBottom: "8px",
        }}>
          <ToggleBitRow bits={aBits} label="A" color={P.accent} onToggle={toggleA} />
        </div>

        {/* Input B (only for binary ops) */}
        {info.type === "binary" && (
          <div style={{
            background: P.surface, border: `1px solid ${P.border}`, borderRadius: "12px",
            padding: "16px", marginBottom: "8px",
          }}>
            <ToggleBitRow bits={bBits} label="B" color={P.orange} onToggle={toggleB} />
          </div>
        )}

        {/* Shift amount (for shift/rotate ops) */}
        {info.type === "shift" && (
          <div style={{
            background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
            padding: "12px 16px", marginBottom: "8px",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim }}>Shift by:</span>
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button key={n} onClick={() => setShiftAmt(n)} style={{
                fontFamily: MONO, fontSize: "14px", width: "32px", height: "32px", borderRadius: "6px",
                border: `1px solid ${shiftAmt === n ? info.color : P.border}`,
                background: shiftAmt === n ? `${info.color}22` : "transparent",
                color: shiftAmt === n ? info.color : P.textDim,
                cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {n}
              </button>
            ))}
          </div>
        )}

        {/* Operation symbol */}
        <div style={{ textAlign: "center", padding: "6px 0" }}>
          <span style={{
            fontFamily: MONO, fontSize: "18px", fontWeight: 700, color: info.color,
            background: `${info.color}15`, padding: "4px 16px", borderRadius: "6px",
          }}>
            {info.symbol}{info.type === "shift" ? ` ${shiftAmt}` : ""}
          </span>
        </div>

        {/* Result */}
        <div style={{
          background: P.surface, border: `1px solid ${info.color}44`, borderRadius: "12px",
          padding: "16px", marginBottom: "12px",
        }}>
          {info.type === "shift" ? (
            <ShiftVisual bits={aBits} amount={shiftAmt} op={op} color={info.color} />
          ) : (
            <>
              {info.type === "binary" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                  <BitRow bits={aBin} label="A" color={P.accent} />
                  <BitRow bits={toBin(bVal)} label="B" color={P.orange} />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "56px", borderTop: `1px solid ${P.border}` }} />
                    <div style={{ flex: 1, borderTop: `1px solid ${P.border}` }} />
                  </div>
                </div>
              )}
              {info.type === "unary" && (
                <div style={{ marginBottom: "8px" }}>
                  <BitRow bits={aBin} label="A" color={P.accent} />
                  <div style={{ height: "6px" }} />
                </div>
              )}
              <BitRow bits={resultBin} label="Result" color={info.color} highlight={highlight} />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                <span style={{ width: "56px" }} />
                <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim }}>
                  {info.type === "binary"
                    ? `${aVal} ${info.symbol} ${bVal} = ${result} (${toHex(result)})`
                    : `${info.symbol}${aVal} = ${result} (${toHex(result)})`
                  }
                </span>
              </div>
            </>
          )}
        </div>

        {/* Description */}
        <div style={{
          background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "14px 18px", marginBottom: "12px",
        }}>
          <div style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, lineHeight: 1.7 }}>
            <strong style={{ color: info.color }}>{info.label} ({info.symbol})</strong>{" \u2014 "}{info.desc}
          </div>
        </div>

        {/* Truth table for binary ops */}
        {info.type === "binary" && (
          <div style={{ marginBottom: "12px" }}>
            <TruthTable op={op} />
          </div>
        )}

        {/* Use cases */}
        <div style={{ marginBottom: "12px" }}>
          <UseCases op={op} />
        </div>

        {/* Quick presets */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "12px 16px", marginBottom: "24px",
        }}>
          <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            Try these combinations
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { label: "Mask lower nibble", a: [1,0,1,1,0,1,0,1], b: [0,0,0,0,1,1,1,1], op: "and" },
              { label: "Set bit 7", a: [0,0,1,1,0,1,0,1], b: [1,0,0,0,0,0,0,0], op: "or" },
              { label: "XOR same value", a: [1,0,1,0,1,0,1,0], b: [1,0,1,0,1,0,1,0], op: "xor" },
              { label: "NOT 0xFF", a: [1,1,1,1,1,1,1,1], b: bBits, op: "not" },
              { label: "Shift x2", a: [0,0,0,0,0,1,0,1], b: bBits, op: "shl" },
              { label: "All ones", a: [1,1,1,1,1,1,1,1], b: [1,1,1,1,1,1,1,1], op: "and" },
            ].map(({ label, a, b, op: presetOp }) => (
              <button key={label} onClick={() => { setABits(a); setBBits(b); setOp(presetOp); setShiftAmt(1); }} style={{
                fontFamily: MONO, fontSize: "11px", padding: "5px 10px", borderRadius: "4px",
                border: `1px solid ${P.border}`, background: P.surfaceAlt, color: P.textDim,
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px", borderTop: `1px solid ${P.border}` }}>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: 1.6 }}>
            These 8 operations are the complete toolkit for bit manipulation.
            <br />
            <span style={{ color: P.accent }}>Every complex operation your CPU performs is built from combinations of these primitives.</span>
          </p>
        </div>
      </div>
    </div>
  );
}