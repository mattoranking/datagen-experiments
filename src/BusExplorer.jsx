import { useState, useEffect, useRef, useCallback } from "react";
import ExperimentHeader from "./ExperimentHeader";
import { useTheme } from "./ThemeContext";

const MONO = "'IBM Plex Mono', 'Fira Code', monospace";
const SANS = "'DM Sans', 'Segoe UI', sans-serif";

function toHex(v, pad = 2) {
  return v.toString(16).toUpperCase().padStart(pad, "0");
}
function toBin(v, bits = 8) {
  return v.toString(2).padStart(bits, "0");
}

// ── Initial state ──
const MEMORY_SIZE = 16;
const REG_NAMES = ["R0", "R1", "R2", "R3"];

function initMemory() {
  return Array.from({ length: MEMORY_SIZE }, (_, i) => {
    // Pre-fill some interesting values
    const presets = [0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00, 0x2A, 0xFF, 0x07, 0x10, 0x03, 0xBE, 0xEF, 0x42, 0x00, 0x99];
    return presets[i] ?? 0;
  });
}

function initRegisters() {
  return REG_NAMES.map(() => 0x00);
}

// ── Animated bus line (the "bits in flight" visual) ──
function BusLine({ active, bits, color, label, direction, vertical }) {
  const P = useTheme().palette;
  const dotCount = 5;
  return (
    <div style={{
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      alignItems: "center",
      gap: "4px",
      position: "relative",
    }}>
      <span style={{
        fontFamily: MONO, fontSize: "9px", color: active ? color : P.textMuted,
        textTransform: "uppercase", letterSpacing: "0.15em", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        gap: "3px",
        padding: "4px 8px",
        background: active ? `${color}11` : "transparent",
        border: `1px solid ${active ? color : P.border}`,
        borderRadius: "4px",
        transition: "all 0.3s",
        minWidth: vertical ? undefined : "100px",
        justifyContent: "center",
      }}>
        {active && bits != null ? (
          <span style={{
            fontFamily: MONO, fontSize: "11px", fontWeight: 700,
            color, letterSpacing: "0.1em",
            animation: "fadeIn 0.3s ease",
          }}>
            {bits}
          </span>
        ) : (
          Array.from({ length: dotCount }, (_, i) => (
            <span key={i} style={{
              width: "4px", height: "4px", borderRadius: "50%",
              background: P.textMuted, opacity: 0.3,
            }} />
          ))
        )}
      </div>
      {active && (
        <span style={{
          fontFamily: MONO, fontSize: "10px", color: P.textDim,
        }}>
          {direction === "toMem" ? "→" : "←"}
        </span>
      )}
    </div>
  );
}

// ── A single register cell ──
function RegisterCell({ name, value, highlight, onClick }) {
  const P = useTheme().palette;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 12px", borderRadius: "6px",
        background: highlight ? `${P.purple}15` : P.surface,
        border: `1px solid ${highlight ? P.purple : P.border}`,
        cursor: "pointer", transition: "all 0.2s",
        boxShadow: highlight ? `0 0 12px ${P.purple}33` : "none",
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: "12px", color: P.purple, fontWeight: 700, minWidth: "24px" }}>
        {name}
      </span>
      <span style={{ fontFamily: MONO, fontSize: "14px", color: P.text, fontWeight: 600 }}>
        0x{toHex(value)}
      </span>
      <span style={{ fontFamily: MONO, fontSize: "10px", color: P.textDim }}>
        {toBin(value)}
      </span>
    </div>
  );
}

// ── A memory cell ──
function MemoryCell({ address, value, highlight, highlightColor, onClick }) {
  const P = useTheme().palette;
  const color = highlightColor || P.green;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "6px 4px", borderRadius: "4px", width: "54px",
        background: highlight ? `${color}15` : P.surface,
        border: `1px solid ${highlight ? color : P.border}`,
        cursor: "pointer", transition: "all 0.2s",
        boxShadow: highlight ? `0 0 10px ${color}33` : "none",
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: "9px", color: P.textMuted, marginBottom: "2px" }}>
        0x{toHex(address)}
      </span>
      <span style={{ fontFamily: MONO, fontSize: "14px", color: highlight ? color : P.text, fontWeight: 600 }}>
        {toHex(value)}
      </span>
    </div>
  );
}

// ── Preset operations to demonstrate ──
const OPERATIONS = [
  {
    label: "LOAD R0, [0x00]",
    desc: "CPU puts address 0x00 on the address bus, memory sends back the data on the data bus → stored in R0.",
    steps: [
      { phase: "addr", addrBus: "0x00", dataBus: null, direction: "toMem", memAddr: 0, reg: 0, narrative: "CPU places address 0x00 onto the address bus." },
      { phase: "read", addrBus: "0x00", dataBus: null, direction: "fromMem", memAddr: 0, reg: 0, narrative: "Memory decodes the address and locates the cell." },
      { phase: "data", addrBus: "0x00", dataBus: "auto", direction: "fromMem", memAddr: 0, reg: 0, narrative: "Memory places the data onto the data bus → CPU latches it into R0." },
    ],
  },
  {
    label: "LOAD R1, [0x06]",
    desc: "Fetch the byte at address 0x06 (the value 0x2A = 42) into register R1.",
    steps: [
      { phase: "addr", addrBus: "0x06", dataBus: null, direction: "toMem", memAddr: 6, reg: 1, narrative: "CPU places address 0x06 onto the address bus." },
      { phase: "read", addrBus: "0x06", dataBus: null, direction: "fromMem", memAddr: 6, reg: 1, narrative: "Memory decodes address 0x06." },
      { phase: "data", addrBus: "0x06", dataBus: "auto", direction: "fromMem", memAddr: 6, reg: 1, narrative: "Data 0x2A travels on the data bus → latched into R1." },
    ],
  },
  {
    label: "STORE R0, [0x0E]",
    desc: "CPU writes the value in R0 to memory address 0x0E — data flows from CPU to memory.",
    steps: [
      { phase: "addr", addrBus: "0x0E", dataBus: null, direction: "toMem", memAddr: 14, reg: 0, narrative: "CPU places target address 0x0E on the address bus." },
      { phase: "write", addrBus: "0x0E", dataBus: "auto-reg", direction: "toMem", memAddr: 14, reg: 0, narrative: "CPU places R0's value onto the data bus → heading to memory." },
      { phase: "done", addrBus: "0x0E", dataBus: "auto-reg", direction: "toMem", memAddr: 14, reg: 0, narrative: "Memory latches the data into address 0x0E. Write complete!" },
    ],
  },
  {
    label: "LOAD R2, [0x0C]",
    desc: "Fetch 0xEF from address 0x0C into R2 — part of the classic 0xBEEF pattern.",
    steps: [
      { phase: "addr", addrBus: "0x0C", dataBus: null, direction: "toMem", memAddr: 12, reg: 2, narrative: "CPU requests address 0x0C." },
      { phase: "read", addrBus: "0x0C", dataBus: null, direction: "fromMem", memAddr: 12, reg: 2, narrative: "Memory finds cell 0x0C." },
      { phase: "data", addrBus: "0x0C", dataBus: "auto", direction: "fromMem", memAddr: 12, reg: 2, narrative: "0xEF flows on the data bus into R2." },
    ],
  },
];

// ── Custom operation builder ──
function CustomOpBuilder({ registers, onExecute }) {
  const P = useTheme().palette;
  const [opType, setOpType] = useState("LOAD");
  const [reg, setReg] = useState(0);
  const [addr, setAddr] = useState("00");

  const parsedAddr = Math.min(parseInt(addr, 16) || 0, MEMORY_SIZE - 1);

  function handleSubmit(e) {
    e.preventDefault();
    const isLoad = opType === "LOAD";
    const steps = isLoad
      ? [
          { phase: "addr", addrBus: `0x${toHex(parsedAddr)}`, dataBus: null, direction: "toMem", memAddr: parsedAddr, reg, narrative: `CPU places address 0x${toHex(parsedAddr)} onto the address bus.` },
          { phase: "read", addrBus: `0x${toHex(parsedAddr)}`, dataBus: null, direction: "fromMem", memAddr: parsedAddr, reg, narrative: "Memory decodes the address." },
          { phase: "data", addrBus: `0x${toHex(parsedAddr)}`, dataBus: "auto", direction: "fromMem", memAddr: parsedAddr, reg, narrative: `Data flows on the data bus into ${REG_NAMES[reg]}.` },
        ]
      : [
          { phase: "addr", addrBus: `0x${toHex(parsedAddr)}`, dataBus: null, direction: "toMem", memAddr: parsedAddr, reg, narrative: `CPU places address 0x${toHex(parsedAddr)} on the address bus.` },
          { phase: "write", addrBus: `0x${toHex(parsedAddr)}`, dataBus: "auto-reg", direction: "toMem", memAddr: parsedAddr, reg, narrative: `CPU drives ${REG_NAMES[reg]}'s value onto the data bus.` },
          { phase: "done", addrBus: `0x${toHex(parsedAddr)}`, dataBus: "auto-reg", direction: "toMem", memAddr: parsedAddr, reg, narrative: `Memory stores the value at 0x${toHex(parsedAddr)}.` },
        ];
    onExecute({
      label: `${opType} ${REG_NAMES[reg]}, [0x${toHex(parsedAddr)}]`,
      desc: isLoad
        ? `Load byte at address 0x${toHex(parsedAddr)} into ${REG_NAMES[reg]}.`
        : `Store ${REG_NAMES[reg]} into memory address 0x${toHex(parsedAddr)}.`,
      steps,
    });
  }

  const btnStyle = (active) => ({
    fontFamily: MONO, fontSize: "12px", padding: "6px 14px", borderRadius: "4px",
    border: `1px solid ${active ? P.accent : P.border}`,
    background: active ? `${P.accent}22` : P.surface,
    color: active ? P.accent : P.textDim,
    cursor: "pointer", transition: "all 0.15s",
  });

  return (
    <form onSubmit={handleSubmit} style={{
      display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap",
      padding: "12px 16px", background: P.surfaceAlt, borderRadius: "8px",
      border: `1px solid ${P.border}`,
    }}>
      <div style={{ display: "flex", gap: "4px" }}>
        <button type="button" onClick={() => setOpType("LOAD")} style={btnStyle(opType === "LOAD")}>LOAD</button>
        <button type="button" onClick={() => setOpType("STORE")} style={btnStyle(opType === "STORE")}>STORE</button>
      </div>
      <select
        value={reg}
        onChange={(e) => setReg(Number(e.target.value))}
        style={{
          fontFamily: MONO, fontSize: "12px", padding: "6px 8px",
          background: P.surface, color: P.purple, border: `1px solid ${P.border}`,
          borderRadius: "4px", cursor: "pointer",
        }}
      >
        {REG_NAMES.map((name, i) => (
          <option key={name} value={i}>{name} (0x{toHex(registers[i])})</option>
        ))}
      </select>
      <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim }}>
        {opType === "LOAD" ? "← [" : "→ ["}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim }}>0x</span>
        <input
          value={addr}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 2);
            setAddr(v);
          }}
          maxLength={2}
          style={{
            fontFamily: MONO, fontSize: "13px", width: "32px", padding: "4px 6px",
            background: P.surface, color: P.green, border: `1px solid ${P.border}`,
            borderRadius: "4px", textAlign: "center",
          }}
        />
      </div>
      <span style={{ fontFamily: MONO, fontSize: "13px", color: P.textDim }}>]</span>
      <button type="submit" style={{
        fontFamily: MONO, fontSize: "12px", padding: "6px 16px", borderRadius: "4px",
        border: `1px solid ${P.green}`, background: `${P.green}22`, color: P.green,
        cursor: "pointer", fontWeight: 700,
      }}>
        Execute
      </button>
    </form>
  );
}

// ── Main component ──
export default function BusExplorer() {
  const P = useTheme().palette;
  const [memory, setMemory] = useState(initMemory);
  const [registers, setRegisters] = useState(initRegisters);
  const [currentOp, setCurrentOp] = useState(null);
  const [stepIdx, setStepIdx] = useState(-1);
  const [animating, setAnimating] = useState(false);
  const [log, setLog] = useState([]);
  const timerRef = useRef(null);
  const memoryRef = useRef(memory);
  const registersRef = useRef(registers);

  useEffect(() => { memoryRef.current = memory; }, [memory]);
  useEffect(() => { registersRef.current = registers; }, [registers]);

  const step = currentOp && stepIdx >= 0 && stepIdx < currentOp.steps.length
    ? currentOp.steps[stepIdx]
    : null;

  // Resolve "auto" dataBus values
  const resolvedDataBus = (() => {
    if (!step || !step.dataBus) return null;
    if (step.dataBus === "auto") return `0x${toHex(memory[step.memAddr])}`;
    if (step.dataBus === "auto-reg") return `0x${toHex(registers[step.reg])}`;
    return step.dataBus;
  })();

  // Apply side-effects when reaching final step
  useEffect(() => {
    if (!currentOp || stepIdx < 0 || stepIdx >= currentOp.steps.length) return;
    const curStep = currentOp.steps[stepIdx];
    const isLastStep = stepIdx === currentOp.steps.length - 1;
    if (!isLastStep) return;

    if (curStep.phase === "data") {
      // LOAD: memory → register
      const memVal = memoryRef.current[curStep.memAddr];
      setRegisters((prev) => {
        const next = [...prev];
        next[curStep.reg] = memVal;
        return next;
      });
    } else if (curStep.phase === "done") {
      // STORE: register → memory
      const regVal = registersRef.current[curStep.reg];
      setMemory((prev) => {
        const next = [...prev];
        next[curStep.memAddr] = regVal;
        return next;
      });
    }
  }, [stepIdx, currentOp]);

  const runOp = useCallback((op) => {
    if (animating) return;
    setCurrentOp(op);
    setStepIdx(-1);
    setAnimating(true);
    setLog((prev) => [`▶ ${op.label}`, ...prev].slice(0, 20));

    let i = 0;
    function tick() {
      setStepIdx(i);
      setLog((prev) => [`  Step ${i + 1}: ${op.steps[i].narrative}`, ...prev].slice(0, 20));
      i++;
      if (i < op.steps.length) {
        timerRef.current = setTimeout(tick, 1200);
      } else {
        timerRef.current = setTimeout(() => {
          setAnimating(false);
          setLog((prev) => [`  ✓ Complete`, ...prev].slice(0, 20));
        }, 1000);
      }
    }
    timerRef.current = setTimeout(tick, 400);
  }, [animating]);

  const resetAll = () => {
    clearTimeout(timerRef.current);
    setMemory(initMemory());
    setRegisters(initRegisters());
    setCurrentOp(null);
    setStepIdx(-1);
    setAnimating(false);
    setLog([]);
  };

  return (
    <div style={{
      background: P.bg, minHeight: "100vh", padding: "24px 16px",
      fontFamily: SANS, color: P.text,
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes busFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
      `}</style>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <ExperimentHeader number={4} />
          <h1 style={{
            fontFamily: SANS, fontSize: "28px", fontWeight: 800,
            color: P.text, margin: "0 0 6px 0", letterSpacing: "-0.02em",
          }}>
            Address Bus & Data Bus
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: P.textDim, margin: 0 }}>
            Watch how the CPU talks to memory — addresses go one way, data flows the other.
          </p>
        </div>

        {/* ── Architecture diagram ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: "0",
          marginBottom: "24px",
          alignItems: "stretch",
        }}>
          {/* CPU / Registers */}
          <div style={{
            padding: "16px", borderRadius: "10px",
            background: P.surface, border: `1px solid ${step ? P.purple : P.border}`,
            boxShadow: step ? `0 0 20px ${P.purple}22` : "none",
            transition: "all 0.3s",
          }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px", color: P.purple,
              textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px",
              textAlign: "center",
            }}>
              CPU — Registers
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {REG_NAMES.map((name, i) => (
                <RegisterCell
                  key={name}
                  name={name}
                  value={registers[i]}
                  highlight={step && step.reg === i}
                />
              ))}
            </div>
          </div>

          {/* Buses (center column) */}
          <div style={{
            display: "flex", flexDirection: "column",
            justifyContent: "center", gap: "16px",
            padding: "0 20px", minWidth: "180px",
          }}>
            <BusLine
              active={step != null}
              bits={step ? step.addrBus : null}
              color={P.orange}
              label="Address Bus"
              direction="toMem"
            />
            <BusLine
              active={step != null && resolvedDataBus != null}
              bits={resolvedDataBus}
              color={P.accentAlt}
              label="Data Bus"
              direction={step ? step.direction : "fromMem"}
            />
            {step && (
              <div style={{
                fontFamily: MONO, fontSize: "10px", color: P.textDim,
                textAlign: "center", padding: "4px 0",
                animation: "fadeIn 0.3s ease",
              }}>
                {step.direction === "toMem" ? "CPU → Memory" : "Memory → CPU"}
              </div>
            )}
          </div>

          {/* Memory */}
          <div style={{
            padding: "16px", borderRadius: "10px",
            background: P.surface, border: `1px solid ${step ? P.green : P.border}`,
            boxShadow: step ? `0 0 20px ${P.green}22` : "none",
            transition: "all 0.3s",
          }}>
            <div style={{
              fontFamily: MONO, fontSize: "11px", color: P.green,
              textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "12px",
              textAlign: "center",
            }}>
              Memory (16 bytes)
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "4px",
            }}>
              {memory.map((val, i) => (
                <MemoryCell
                  key={i}
                  address={i}
                  value={val}
                  highlight={step && step.memAddr === i}
                  highlightColor={step && step.memAddr === i ? P.green : undefined}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Narrative ── */}
        {step && (
          <div style={{
            padding: "12px 20px", marginBottom: "20px", borderRadius: "8px",
            background: `${P.accent}11`, border: `1px solid ${P.accent}44`,
            fontFamily: SANS, fontSize: "14px", color: P.text,
            animation: "fadeIn 0.3s ease", textAlign: "center",
          }}>
            {step.narrative}
          </div>
        )}

        {/* ── Preset operations ── */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{
            fontFamily: MONO, fontSize: "11px", color: P.textDim,
            textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px",
          }}>
            Preset Operations
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {OPERATIONS.map((op, i) => (
              <button
                key={i}
                disabled={animating}
                onClick={() => runOp(op)}
                title={op.desc}
                style={{
                  fontFamily: MONO, fontSize: "12px", padding: "8px 14px",
                  borderRadius: "6px", cursor: animating ? "not-allowed" : "pointer",
                  border: `1px solid ${P.border}`, background: P.surface,
                  color: animating ? P.textMuted : P.accent,
                  opacity: animating ? 0.5 : 1, transition: "all 0.15s",
                }}
              >
                {op.label}
              </button>
            ))}
            <button
              onClick={resetAll}
              style={{
                fontFamily: MONO, fontSize: "12px", padding: "8px 14px",
                borderRadius: "6px", cursor: "pointer",
                border: `1px solid ${P.border}`, background: P.surface,
                color: P.red,
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* ── Custom operation ── */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{
            fontFamily: MONO, fontSize: "11px", color: P.textDim,
            textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px",
          }}>
            Build Your Own
          </div>
          <CustomOpBuilder
            registers={registers}
            onExecute={(op) => runOp(op)}
          />
        </div>

        {/* ── Activity log ── */}
        {log.length > 0 && (
          <div style={{
            padding: "12px 16px", borderRadius: "8px",
            background: P.surfaceAlt, border: `1px solid ${P.border}`,
            maxHeight: "200px", overflowY: "auto",
          }}>
            <div style={{
              fontFamily: MONO, fontSize: "10px", color: P.textMuted,
              textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px",
            }}>
              Activity Log
            </div>
            {log.map((entry, i) => (
              <div key={i} style={{
                fontFamily: MONO, fontSize: "11px",
                color: entry.startsWith("▶") ? P.accent : entry.startsWith("  ✓") ? P.green : P.textDim,
                padding: "1px 0",
                opacity: i === 0 ? 1 : 0.7,
              }}>
                {entry}
              </div>
            ))}
          </div>
        )}

        {/* ── Explainer ── */}
        <div style={{
          marginTop: "28px", padding: "20px", borderRadius: "10px",
          background: P.surfaceAlt, border: `1px solid ${P.border}`,
        }}>
          <h3 style={{ fontFamily: SANS, fontSize: "16px", color: P.text, margin: "0 0 12px 0" }}>
            How Buses Work
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: "12px", color: P.orange, marginBottom: "4px", fontWeight: 700 }}>
                Address Bus →
              </div>
              <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: "1.6" }}>
                A one-way highway from the CPU. It carries the <strong style={{ color: P.text }}>address</strong> of the memory cell the CPU wants to read or write. The number of wires determines how much memory can be addressed (e.g., 16 address lines = 64 KB).
              </p>
            </div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: "12px", color: P.accentAlt, marginBottom: "4px", fontWeight: 700 }}>
                ← Data Bus →
              </div>
              <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: "1.6" }}>
                A bi-directional highway. On a <strong style={{ color: P.text }}>LOAD</strong>, data travels from memory to the CPU. On a <strong style={{ color: P.text }}>STORE</strong>, data flows from the CPU to memory. The width (8, 16, 32, 64 bits) determines how much data moves per cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
