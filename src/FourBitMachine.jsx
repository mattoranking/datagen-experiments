import { useState, useMemo, useCallback } from "react";
import ExperimentHeader from "./ExperimentHeader";
import { useTheme } from "./ThemeContext";

const MONO = "'IBM Plex Mono', 'Fira Code', monospace";
const SANS = "'DM Sans', 'Segoe UI', sans-serif";

function toBin4(v) {
  return ((v & 0xF) >>> 0).toString(2).padStart(4, "0");
}

function toUnsigned(bits) {
  return bits.reduce((acc, b, i) => acc + b * Math.pow(2, 3 - i), 0);
}

function toSignMag(bits) {
  const sign = bits[0] === 1 ? -1 : 1;
  const mag = bits[1] * 4 + bits[2] * 2 + bits[3] * 1;
  return { value: sign * mag, sign: bits[0], mag };
}

function toTwosComp(bits) {
  const unsigned = toUnsigned(bits);
  return unsigned >= 8 ? unsigned - 16 : unsigned;
}

function addBinary4(a, b) {
  const sum = (a + b) & 0xF;
  const carry = (a + b) > 15 ? 1 : 0;
  const fullSum = a + b;
  return { sum, carry, fullSum, bits: toBin4(sum).split("").map(Number) };
}

// ── Bit Toggle ──
function Bit4({ value, index, onToggle, weight, color }) {
  const P = useTheme().palette;
  const isOn = value === 1;
  return (
    <div
      onClick={() => onToggle(index)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", userSelect: "none" }}
    >
      <div style={{ fontFamily: MONO, fontSize: "10px", color: P.textDim }}>
        2<sup>{3 - index}</sup>={weight}
      </div>
      <div style={{
        width: "56px", height: "64px", borderRadius: "8px",
        border: `2px solid ${isOn ? color : P.border}`,
        background: isOn ? `${color}22` : P.surface,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        <span style={{
          fontFamily: MONO, fontSize: "28px", fontWeight: 700,
          color: isOn ? color : P.textMuted,
        }}>{value}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: "10px", color: isOn ? color : P.textMuted }}>
        bit {3 - index}
      </div>
    </div>
  );
}

// ── Value display row ──
function ValRow({ label, value, color, extra }) {
  const P = useTheme().palette;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 14px", background: P.surfaceAlt, borderRadius: "6px",
      marginBottom: "6px",
    }}>
      <span style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {extra && <span style={{ fontFamily: MONO, fontSize: "12px", color: P.textDim }}>{extra}</span>}
        <span style={{ fontFamily: MONO, fontSize: "20px", fontWeight: 700, color }}>{value}</span>
      </div>
    </div>
  );
}

// ── Mode selector tab ──
function ModeTab({ label, active, onClick, color }) {
  const P = useTheme().palette;
  return (
    <button onClick={onClick} style={{
      fontFamily: MONO, fontSize: "12px", padding: "8px 16px", borderRadius: "6px",
      border: `1px solid ${active ? color : P.border}`,
      background: active ? `${color}22` : P.surface,
      color: active ? color : P.textDim,
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      {label}
    </button>
  );
}

// ── Two's complement step-by-step ──
function TwosCompSteps({ bits }) {
  const P = useTheme().palette;
  const original = bits.join("");
  const flipped = bits.map(b => b === 0 ? 1 : 0);
  const flippedStr = flipped.join("");
  const flippedVal = toUnsigned(flipped);
  const plusOne = (flippedVal + 1) & 0xF;
  const resultBits = toBin4(plusOne).split("").map(Number);
  const tcValue = toTwosComp(bits);

  return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "14px 18px",
    }}>
      <div style={{
        fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px",
      }}>
        How to negate in two's complement
      </div>
      <div style={{ fontFamily: MONO, fontSize: "14px", lineHeight: 2.2, color: P.text }}>
        <div>
          <span style={{ color: P.textDim }}>Start:{"    "}</span>
          {original.split("").map((b, i) => (
            <span key={i} style={{ color: b === "1" ? P.accent : P.textMuted }}>{b}</span>
          ))}
          <span style={{ color: P.textDim }}> = {toTwosComp(bits)} (original)</span>
        </div>
        <div>
          <span style={{ color: P.textDim }}>Flip:{"     "}</span>
          {flippedStr.split("").map((b, i) => (
            <span key={i} style={{ color: b === "1" ? P.orange : P.textMuted }}>{b}</span>
          ))}
          <span style={{ color: P.textDim }}> (invert every bit)</span>
        </div>
        <div>
          <span style={{ color: P.textDim }}>Add 1:{"    "}</span>
          {toBin4(plusOne).split("").map((b, i) => (
            <span key={i} style={{ color: b === "1" ? P.green : P.textMuted }}>{b}</span>
          ))}
          <span style={{ color: P.textDim }}> = {toTwosComp(resultBits)} (negated!)</span>
        </div>
      </div>
      {tcValue !== 0 && (
        <div style={{ fontFamily: SANS, fontSize: "12px", color: P.green, marginTop: "6px" }}>
          Check: {tcValue} + ({toTwosComp(resultBits)}) = {tcValue + toTwosComp(resultBits)} (should be 0)
        </div>
      )}
    </div>
  );
}

// ── Addition demo ──
function AdditionDemo({ bits }) {
  const P = useTheme().palette;
  const [bBits, setBBits] = useState([0, 0, 1, 0]); // default: 2
  const aVal = toUnsigned(bits);
  const bVal = toUnsigned(bBits);
  const { sum, carry, fullSum, bits: resultBits } = addBinary4(aVal, bVal);
  const aTc = toTwosComp(bits);
  const bTc = toTwosComp(bBits);
  const sumTc = toTwosComp(resultBits);

  const toggleB = useCallback((idx) => {
    setBBits(prev => {
      const n = [...prev];
      n[idx] = n[idx] === 0 ? 1 : 0;
      return n;
    });
  }, []);

  return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "14px 18px",
    }}>
      <div style={{
        fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px",
      }}>
        Binary addition (set B below)
      </div>

      {/* B value toggles */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim, width: "24px" }}>B:</span>
        {bBits.map((b, i) => (
          <div key={i} onClick={() => toggleB(i)} style={{
            width: "36px", height: "36px", borderRadius: "6px",
            border: `1.5px solid ${b === 1 ? P.orange : P.border}`,
            background: b === 1 ? `${P.orange}22` : P.surface,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            <span style={{ fontFamily: MONO, fontSize: "18px", fontWeight: 700, color: b === 1 ? P.orange : P.textMuted }}>{b}</span>
          </div>
        ))}
        <span style={{ fontFamily: MONO, fontSize: "13px", color: P.orange, marginLeft: "8px" }}>
          = {bVal} unsigned / {bTc} signed
        </span>
      </div>

      {/* The addition */}
      <div style={{ fontFamily: MONO, fontSize: "16px", lineHeight: 2, color: P.text }}>
        <div>
          <span style={{ color: P.textDim }}>{"  "}</span>
          {bits.map((b, i) => <span key={i} style={{ color: b === 1 ? P.accent : P.textMuted }}>{b}</span>)}
          <span style={{ color: P.textDim }}> (A = {aVal})</span>
        </div>
        <div>
          <span style={{ color: P.textDim }}>+ </span>
          {bBits.map((b, i) => <span key={i} style={{ color: b === 1 ? P.orange : P.textMuted }}>{b}</span>)}
          <span style={{ color: P.textDim }}> (B = {bVal})</span>
        </div>
        <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: "4px" }}>
          {carry === 1 && <span style={{ color: P.red }}>1</span>}
          <span style={{ color: P.textDim }}>{carry === 0 ? " " : ""}</span>
          {resultBits.map((b, i) => <span key={i} style={{ color: b === 1 ? P.green : P.textMuted }}>{b}</span>)}
          <span style={{ color: P.textDim }}> (Result = {sum})</span>
        </div>
      </div>

      {/* Overflow check */}
      {carry === 1 && (
        <div style={{
          marginTop: "10px", padding: "8px 12px", borderRadius: "6px",
          background: `${P.red}15`, border: `1px solid ${P.red}44`,
          fontFamily: SANS, fontSize: "12px", color: P.red,
        }}>
          Overflow! The true sum is {fullSum} ({toBin4(fullSum >> 0).padStart(5, (fullSum >> 4) ? "1" : "0")}), but the 5th bit is lost. The 4-bit result wraps to {sum}.
        </div>
      )}

      {/* Two's complement interpretation */}
      <div style={{
        marginTop: "10px", fontFamily: SANS, fontSize: "12px", color: P.textDim, lineHeight: 1.6,
      }}>
        As signed (two's complement): ({aTc}) + ({bTc}) = {sumTc}
        {carry === 0 && aTc + bTc === sumTc && (
          <span style={{ color: P.green }}> — correct!</span>
        )}
        {(aTc + bTc !== sumTc && carry === 0) && (
          <span style={{ color: P.red }}> — signed overflow (result doesn't fit in 4 bits)</span>
        )}
      </div>
    </div>
  );
}

// ── Full range table ──
function RangeTable({ mode }) {
  const P = useTheme().palette;
  const rows = Array.from({ length: 16 }, (_, i) => {
    const bits = toBin4(i).split("").map(Number);
    const unsigned = i;
    const signMag = toSignMag(bits);
    const tc = toTwosComp(bits);
    return { bits, unsigned, signMag, tc, index: i };
  });

  return (
    <div style={{
      background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
      padding: "14px 18px", maxHeight: "320px", overflowY: "auto",
    }}>
      <div style={{
        fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
        textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px",
      }}>
        All 16 possible values
      </div>
      <div style={{ fontFamily: MONO, fontSize: "12px", lineHeight: "26px" }}>
        {/* Header */}
        <div style={{ display: "flex", gap: "10px", borderBottom: `1px solid ${P.border}`, paddingBottom: "4px", marginBottom: "4px" }}>
          <span style={{ width: "52px", color: P.textDim }}>Binary</span>
          <span style={{ width: "54px", color: P.accent, textAlign: "right" }}>Unsigned</span>
          {mode === "signmag" && <span style={{ width: "60px", color: P.orange, textAlign: "right" }}>Sign-mag</span>}
          {mode === "twoscomp" && <span style={{ width: "60px", color: P.green, textAlign: "right" }}>Two's comp</span>}
          {mode === "all" && (
            <>
              <span style={{ width: "60px", color: P.orange, textAlign: "right" }}>Sign-mag</span>
              <span style={{ width: "60px", color: P.green, textAlign: "right" }}>Two's comp</span>
            </>
          )}
        </div>
        {rows.map(r => (
          <div key={r.index} style={{ display: "flex", gap: "10px", opacity: 1 }}>
            <span style={{ width: "52px", color: P.text }}>
              {r.bits.map((b, i) => <span key={i} style={{ color: b === 1 ? P.accent : P.textMuted }}>{b}</span>)}
            </span>
            <span style={{ width: "54px", textAlign: "right", color: P.accent }}>{r.unsigned}</span>
            {(mode === "signmag" || mode === "all") && (
              <span style={{
                width: "60px", textAlign: "right",
                color: r.signMag.value === 0 && r.signMag.sign === 1 ? P.red : P.orange,
              }}>
                {r.signMag.value === 0 && r.signMag.sign === 1 ? "-0" : r.signMag.value}
                {r.signMag.value === 0 && r.signMag.sign === 1 ? " (!)" : ""}
              </span>
            )}
            {(mode === "twoscomp" || mode === "all") && (
              <span style={{ width: "60px", textAlign: "right", color: P.green }}>{r.tc}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──
export default function FourBitMachine() {
  const P = useTheme().palette;
  const [bits, setBits] = useState([0, 1, 0, 1]); // default: 5
  const [mode, setMode] = useState("unsigned");

  const toggleBit = useCallback((idx) => {
    setBits(prev => {
      const n = [...prev];
      n[idx] = n[idx] === 0 ? 1 : 0;
      return n;
    });
  }, []);

  const unsigned = toUnsigned(bits);
  const signMag = toSignMag(bits);
  const tc = toTwosComp(bits);

  const modeColor = mode === "unsigned" ? P.accent
    : mode === "signmag" ? P.orange
    : mode === "twoscomp" ? P.green
    : mode === "addition" ? P.pink
    : P.purple;

  return (
    <div style={{ background: P.bg, minHeight: "100vh", padding: "24px 16px", fontFamily: SANS, color: P.text }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <ExperimentHeader number={2} />
          <h1 style={{ fontFamily: SANS, fontSize: "28px", fontWeight: 800, color: P.text, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            The 4-Bit Machine
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: P.textDim, margin: 0 }}>
            4 bits. 16 values. Three ways to interpret them. Toggle bits and see how computers really do maths.
          </p>
        </div>

        {/* Bit toggles */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "14px",
          padding: "24px 16px 20px", marginBottom: "12px",
        }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            {bits.map((bit, i) => (
              <Bit4 key={i} value={bit} index={i} onToggle={toggleBit} weight={Math.pow(2, 3 - i)} color={modeColor} />
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "14px", fontFamily: MONO, fontSize: "22px", letterSpacing: "0.2em" }}>
            {bits.map((b, i) => <span key={i} style={{ color: b === 1 ? modeColor : P.textMuted }}>{b}</span>)}
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{
          display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap",
        }}>
          <ModeTab label="Unsigned" active={mode === "unsigned"} onClick={() => setMode("unsigned")} color={P.accent} />
          <ModeTab label="Sign-magnitude" active={mode === "signmag"} onClick={() => setMode("signmag")} color={P.orange} />
          <ModeTab label="Two's complement" active={mode === "twoscomp"} onClick={() => setMode("twoscomp")} color={P.green} />
          <ModeTab label="Addition" active={mode === "addition"} onClick={() => setMode("addition")} color={P.pink} />
          <ModeTab label="All 16 values" active={mode === "all"} onClick={() => setMode("all")} color={P.purple} />
        </div>

        {/* Values */}
        <div style={{ marginBottom: "12px" }}>
          {(mode === "unsigned" || mode === "addition") && (
            <ValRow label="Unsigned" value={unsigned} color={P.accent} extra={`0 to 15 range`} />
          )}
          {mode === "signmag" && (
            <>
              <ValRow
                label="Sign-magnitude"
                value={signMag.value === 0 && signMag.sign === 1 ? "-0 (!)" : signMag.value}
                color={signMag.value === 0 && signMag.sign === 1 ? P.red : P.orange}
                extra={`sign=${signMag.sign} mag=${signMag.mag}`}
              />
              <ValRow label="Unsigned (for comparison)" value={unsigned} color={P.accent} />
            </>
          )}
          {mode === "twoscomp" && (
            <>
              <ValRow label="Two's complement" value={tc} color={P.green} extra={`-8 to +7 range`} />
              <ValRow label="Unsigned (for comparison)" value={unsigned} color={P.accent} />
            </>
          )}
        </div>

        {/* Mode-specific content */}
        {mode === "unsigned" && (
          <div style={{
            background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
            padding: "14px 18px", marginBottom: "12px",
          }}>
            <div style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, lineHeight: 1.7 }}>
              <strong style={{ color: P.text }}>Unsigned</strong> treats all 4 bits as a positive value.
              Range: 0 (0000) to 15 (1111). No negatives possible.
              {unsigned === 15 && <span style={{ color: P.red }}> You're at the maximum! Adding 1 more would overflow back to 0.</span>}
            </div>
          </div>
        )}

        {mode === "signmag" && (
          <div style={{
            background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
            padding: "14px 18px", marginBottom: "12px",
          }}>
            <div style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, lineHeight: 1.7 }}>
              <strong style={{ color: P.text }}>Sign-magnitude</strong> uses the leftmost bit as a sign flag (0=positive, 1=negative).
              The remaining 3 bits hold the magnitude. Range: -7 to +7.
              {signMag.value === 0 && signMag.sign === 1 && (
                <span style={{ color: P.red }}> Problem: this is "negative zero" — a wasted pattern! 0000 and 1000 both mean zero.</span>
              )}
              <br />The bigger problem: normal binary addition gives wrong results with sign-magnitude.
            </div>
          </div>
        )}

        {mode === "twoscomp" && (
          <>
            <TwosCompSteps bits={bits} />
            <div style={{ height: "12px" }} />
            <div style={{
              background: P.surfaceAlt, border: `1px solid ${P.border}`, borderRadius: "10px",
              padding: "14px 18px",
            }}>
              <div style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, lineHeight: 1.7 }}>
                <strong style={{ color: P.text }}>Two's complement</strong> — the method every modern processor uses.
                Range: -8 (1000) to +7 (0111). No wasted zero. And the magic:
                <strong style={{ color: P.green }}> ordinary binary addition just works for both positive and negative numbers.</strong>
              </div>
            </div>
          </>
        )}

        {mode === "addition" && (
          <AdditionDemo bits={bits} />
        )}

        {mode === "all" && (
          <RangeTable mode="all" />
        )}

        {/* Quick presets */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "12px 16px", marginTop: "12px",
        }}>
          <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
            Try these
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { label: "0 (0000)", val: [0,0,0,0] },
              { label: "1 (0001)", val: [0,0,0,1] },
              { label: "5 (0101)", val: [0,1,0,1] },
              { label: "7 (0111)", val: [0,1,1,1] },
              { label: "8 (1000)", val: [1,0,0,0] },
              { label: "15 (1111)", val: [1,1,1,1] },
              { label: "-1 as TC", val: [1,1,1,1] },
              { label: "-5 as TC", val: [1,0,1,1] },
            ].map(({ label, val }) => (
              <button key={label} onClick={() => setBits(val)} style={{
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
        <div style={{ textAlign: "center", marginTop: "24px", padding: "16px", borderTop: `1px solid ${P.border}` }}>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: 1.6 }}>
            Same 4 bits, three completely different interpretations.
            <br />
            <span style={{ color: P.green }}>Two's complement won because addition just works — no special hardware needed.</span>
          </p>
        </div>
      </div>
    </div>
  );
}