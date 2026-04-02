import { useState, useEffect, useCallback, useRef } from "react";
import ExperimentHeader from "./ExperimentHeader";

const MONO = "'IBM Plex Mono', 'Fira Code', monospace";
const SANS = "'DM Sans', 'Segoe UI', sans-serif";

// ── Color Palette: Dark terminal aesthetic with electric accents ──
const palette = {
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
  red: "#ef4444",
  purple: "#8b5cf6",
};

// ── Helpers ──
function byteToBinaryArray(val) {
  return Array.from({ length: 8 }, (_, i) => (val >> (7 - i)) & 1);
}

function binaryArrayToByte(arr) {
  return arr.reduce((acc, bit, i) => acc | (bit << (7 - i)), 0);
}

function toHex(val) {
  return val.toString(16).toUpperCase().padStart(2, "0");
}

function getAsciiChar(val) {
  if (val >= 32 && val <= 126) return String.fromCharCode(val);
  if (val === 0) return "NUL";
  if (val === 9) return "TAB";
  if (val === 10) return "LF";
  if (val === 13) return "CR";
  if (val === 27) return "ESC";
  if (val === 32) return "SPC";
  if (val === 127) return "DEL";
  if (val < 32) return "CTL";
  return "EXT";
}

function getAsciiLabel(val) {
  if (val >= 32 && val <= 126) return `Printable: "${String.fromCharCode(val)}"`;
  if (val < 32) return "Control character";
  if (val === 127) return "Delete";
  return "Extended ASCII";
}

// ── Bit Component ──
function Bit({ value, index, onToggle, powerVal, animate }) {
  const [flash, setFlash] = useState(false);
  const prevVal = useRef(value);

  useEffect(() => {
    if (prevVal.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 300);
      prevVal.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  const isOn = value === 1;

  return (
    <div
      onClick={() => onToggle(index)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* Power label */}
      <div style={{
        fontFamily: MONO,
        fontSize: "10px",
        color: palette.textDim,
        letterSpacing: "0.05em",
      }}>
        2<sup>{7 - index}</sup>={powerVal}
      </div>

      {/* The bit box */}
      <div style={{
        width: "52px",
        height: "64px",
        borderRadius: "8px",
        border: `2px solid ${isOn ? palette.bit1 : palette.border}`,
        background: isOn
          ? `linear-gradient(135deg, ${palette.bit1}, #2563eb)`
          : palette.bit0,
        boxShadow: isOn
          ? `0 0 20px ${palette.bit1Glow}, inset 0 1px 0 rgba(255,255,255,0.1)`
          : "inset 0 2px 4px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s ease",
        transform: flash ? "scale(1.1)" : "scale(1)",
        position: "relative",
        overflow: "hidden",
      }}>
        {isOn && (
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15), transparent 70%)",
          }} />
        )}
        <span style={{
          fontFamily: MONO,
          fontSize: "28px",
          fontWeight: 700,
          color: isOn ? "#ffffff" : palette.textMuted,
          textShadow: isOn ? "0 0 10px rgba(255,255,255,0.5)" : "none",
          position: "relative",
          zIndex: 1,
        }}>
          {value}
        </span>
      </div>

      {/* Bit index label */}
      <div style={{
        fontFamily: MONO,
        fontSize: "10px",
        color: isOn ? palette.accent : palette.textMuted,
        transition: "color 0.15s",
      }}>
        bit {7 - index}
      </div>
    </div>
  );
}

// ── Value Display Card ──
function ValueCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: palette.surfaceAlt,
      border: `1px solid ${palette.border}`,
      borderRadius: "10px",
      padding: "14px 18px",
      flex: 1,
      minWidth: "120px",
    }}>
      <div style={{
        fontFamily: SANS,
        fontSize: "11px",
        fontWeight: 600,
        color: palette.textDim,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "6px",
      }}>
        {icon} {label}
      </div>
      <div style={{
        fontFamily: MONO,
        fontSize: "28px",
        fontWeight: 700,
        color: color || palette.text,
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: SANS,
          fontSize: "11px",
          color: palette.textDim,
          marginTop: "4px",
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Grayscale Preview ──
function GrayscalePreview({ value }) {
  const hex = toHex(value);
  const color = `#${hex}${hex}${hex}`;
  return (
    <div style={{
      background: palette.surfaceAlt,
      border: `1px solid ${palette.border}`,
      borderRadius: "10px",
      padding: "14px 18px",
      flex: 1,
      minWidth: "120px",
    }}>
      <div style={{
        fontFamily: SANS,
        fontSize: "11px",
        fontWeight: 600,
        color: palette.textDim,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "6px",
      }}>
        🎨 As Grayscale
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "44px",
          height: "44px",
          borderRadius: "6px",
          background: color,
          border: `1px solid ${palette.border}`,
          boxShadow: `0 0 12px ${color}44`,
        }} />
        <div>
          <div style={{ fontFamily: MONO, fontSize: "16px", color: palette.text }}>{color}</div>
          <div style={{ fontFamily: SANS, fontSize: "11px", color: palette.textDim }}>
            {value === 0 ? "Pure black" : value === 255 ? "Pure white" : `${Math.round(value / 255 * 100)}% brightness`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auto Counter ──
function AutoCounter({ running, speed, onToggle, onSpeedChange, onReset }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
    }}>
      <button
        onClick={onToggle}
        style={{
          fontFamily: MONO,
          fontSize: "13px",
          fontWeight: 600,
          padding: "8px 18px",
          borderRadius: "6px",
          border: `1px solid ${running ? palette.green : palette.border}`,
          background: running ? `${palette.green}22` : palette.surfaceAlt,
          color: running ? palette.green : palette.text,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        {running ? "⏸ Pause" : "▶ Auto Count"}
      </button>
      <button
        onClick={onReset}
        style={{
          fontFamily: MONO,
          fontSize: "13px",
          padding: "8px 14px",
          borderRadius: "6px",
          border: `1px solid ${palette.border}`,
          background: palette.surfaceAlt,
          color: palette.textDim,
          cursor: "pointer",
        }}
      >
        ↺ Reset
      </button>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginLeft: "auto",
      }}>
        <span style={{ fontFamily: MONO, fontSize: "11px", color: palette.textDim }}>Speed</span>
        <input
          type="range"
          min={50}
          max={1000}
          step={50}
          value={1050 - speed}
          onChange={(e) => onSpeedChange(1050 - Number(e.target.value))}
          style={{ width: "100px", accentColor: palette.accent }}
        />
      </div>
    </div>
  );
}

// ── Binary Math Breakdown ──
function MathBreakdown({ bits }) {
  const terms = bits.map((b, i) => ({ bit: b, power: 7 - i, value: b * Math.pow(2, 7 - i) }));
  const activeTerms = terms.filter(t => t.bit === 1);

  return (
    <div style={{
      background: palette.surfaceAlt,
      border: `1px solid ${palette.border}`,
      borderRadius: "10px",
      padding: "16px 20px",
    }}>
      <div style={{
        fontFamily: SANS,
        fontSize: "11px",
        fontWeight: 600,
        color: palette.textDim,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "10px",
      }}>
        📐 How the math works
      </div>
      <div style={{
        fontFamily: MONO,
        fontSize: "14px",
        color: palette.text,
        lineHeight: 2,
        overflowX: "auto",
      }}>
        {activeTerms.length === 0 ? (
          <span style={{ color: palette.textDim }}>All bits are 0 → value is 0</span>
        ) : (
          <span>
            {activeTerms.map((t, i) => (
              <span key={t.power}>
                {i > 0 && <span style={{ color: palette.textDim }}> + </span>}
                <span style={{ color: palette.accent }}>2</span>
                <sup style={{ color: palette.accentAlt }}>{t.power}</sup>
                <span style={{ color: palette.textDim }}>(</span>
                <span style={{ color: palette.orange }}>{t.value}</span>
                <span style={{ color: palette.textDim }}>)</span>
              </span>
            ))}
            <span style={{ color: palette.textDim }}> = </span>
            <span style={{ color: palette.green, fontWeight: 700 }}>
              {activeTerms.reduce((s, t) => s + t.value, 0)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main App ──
export default function BinaryExplorer() {
  const [byte, setByte] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(400);
  const intervalRef = useRef(null);

  const bits = byteToBinaryArray(byte);

  const toggleBit = useCallback((index) => {
    setByte(prev => {
      const b = byteToBinaryArray(prev);
      b[index] = b[index] === 0 ? 1 : 0;
      return binaryArrayToByte(b);
    });
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setByte(prev => (prev + 1) % 256);
      }, speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, speed]);

  const asciiChar = getAsciiChar(byte);
  const asciiLabel = getAsciiLabel(byte);
  const isPrintable = byte >= 32 && byte <= 126;

  return (
    <div style={{
      background: palette.bg,
      minHeight: "100vh",
      padding: "24px 16px",
      fontFamily: SANS,
      color: palette.text,
    }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <ExperimentHeader number={1} />
          <h1 style={{
            fontFamily: SANS,
            fontSize: "28px",
            fontWeight: 800,
            color: palette.text,
            margin: "0 0 6px 0",
            letterSpacing: "-0.02em",
          }}>
            Build-a-Byte
          </h1>
          <p style={{
            fontFamily: SANS,
            fontSize: "14px",
            color: palette.textDim,
            margin: 0,
          }}>
            Toggle bits to build a number. Watch how binary becomes decimal, hex, ASCII, and colour.
          </p>
        </div>

        {/* Bit toggles */}
        <div style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: "14px",
          padding: "24px 16px 20px",
          marginBottom: "16px",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}>
            {bits.map((bit, i) => (
              <Bit
                key={i}
                value={bit}
                index={i}
                onToggle={toggleBit}
                powerVal={Math.pow(2, 7 - i)}
                animate={running}
              />
            ))}
          </div>

          {/* Binary string readout */}
          <div style={{
            textAlign: "center",
            marginTop: "18px",
            fontFamily: MONO,
            fontSize: "20px",
            letterSpacing: "0.15em",
            color: palette.text,
          }}>
            {bits.slice(0, 4).map((b, i) => (
              <span key={i} style={{ color: b ? palette.accent : palette.textMuted }}>{b}</span>
            ))}
            <span style={{ color: palette.textMuted, margin: "0 4px" }}>·</span>
            {bits.slice(4).map((b, i) => (
              <span key={i + 4} style={{ color: b ? palette.accent : palette.textMuted }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Auto counter controls */}
        <div style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "16px",
        }}>
          <AutoCounter
            running={running}
            speed={speed}
            onToggle={() => setRunning(r => !r)}
            onSpeedChange={setSpeed}
            onReset={() => { setRunning(false); setByte(0); }}
          />
        </div>

        {/* Value cards */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}>
          <ValueCard
            label="Decimal"
            icon="🔢"
            value={byte}
            sub={`of 255 max`}
            color={palette.green}
          />
          <ValueCard
            label="Hexadecimal"
            icon="⬡"
            value={`0x${toHex(byte)}`}
            sub={`${toHex(byte)[0]} × 16 + ${toHex(byte)[1]}`}
            color={palette.orange}
          />
          <ValueCard
            label="ASCII"
            icon="✦"
            value={isPrintable ? `"${asciiChar}"` : asciiChar}
            sub={asciiLabel}
            color={palette.pink}
          />
        </div>

        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}>
          <GrayscalePreview value={byte} />
        </div>

        {/* Math breakdown */}
        <div style={{ marginBottom: "24px" }}>
          <MathBreakdown bits={bits} />
        </div>

        {/* Quick presets */}
        <div style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: "10px",
          padding: "14px 16px",
        }}>
          <div style={{
            fontFamily: SANS,
            fontSize: "11px",
            fontWeight: 600,
            color: palette.textDim,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "10px",
          }}>
            ⚡ Try These Values
          </div>
          <div style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}>
            {[
              { label: "0", val: 0, tip: "All off" },
              { label: "1", val: 1, tip: "Smallest on" },
              { label: "42", val: 42, tip: "Meaning of life" },
              { label: "65 → A", val: 65, tip: "Letter A" },
              { label: "97 → a", val: 97, tip: "Letter a" },
              { label: "127", val: 127, tip: "Half max" },
              { label: "128", val: 128, tip: "MSB only" },
              { label: "255", val: 255, tip: "All on" },
            ].map(({ label, val, tip }) => (
              <button
                key={val}
                onClick={() => { setRunning(false); setByte(val); }}
                title={tip}
                style={{
                  fontFamily: MONO,
                  fontSize: "12px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${byte === val ? palette.accent : palette.border}`,
                  background: byte === val ? `${palette.accent}22` : palette.surfaceAlt,
                  color: byte === val ? palette.accent : palette.textDim,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer insight */}
        <div style={{
          textAlign: "center",
          marginTop: "28px",
          padding: "16px",
          borderTop: `1px solid ${palette.border}`,
        }}>
          <p style={{
            fontFamily: SANS,
            fontSize: "13px",
            color: palette.textDim,
            margin: 0,
            lineHeight: 1.6,
          }}>
            One byte = 8 bits = 256 possible values (0–255).
            <br />
            The same byte can mean a number, a letter, a shade of grey, or part of a sound — <span style={{ color: palette.accent }}>it all depends on how you interpret it</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
