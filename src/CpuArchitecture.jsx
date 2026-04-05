import { useState, useCallback } from "react";
import ExperimentHeader from "./ExperimentHeader";
import { useTheme } from "./ThemeContext";

const MONO = "'IBM Plex Mono', 'Fira Code', monospace";
const SANS = "'DM Sans', 'Segoe UI', sans-serif";

function toBin4(v) { return (v & 0xF).toString(2).padStart(4, "0"); }
function toHex1(v) { return (v & 0xF).toString(16).toUpperCase(); }

// ── Preset memory contents ──
const RAM_DATA = [
  0x4A, 0x1F, 0x00, 0xB7, 0x22, 0x9C, 0x03, 0xFF,
  0x41, 0x6E, 0xD2, 0x15, 0x8F, 0x5E, 0x88, 0x12,
];

// ── Steps for the full read cycle ──
const STEPS = [
  {
    id: "idle",
    title: "Idle — ready for instruction",
    desc: "The CPU is waiting. The program counter (PC) holds the address of the next instruction. The control unit will fetch it, decode it, and execute it. This is the fetch-decode-execute cycle that runs billions of times per second on your phone.",
    pc: 5,
    addrBus: null,
    dataBus: null,
    controlBus: null,
    decoderState: "Idle",
    selectedCell: null,
    aluState: "Idle",
    regA: null,
    regB: null,
    cuState: "Waiting for clock",
    activeComponents: ["pc", "cu"],
  },
  {
    id: "fetch_addr",
    title: "Step 1 — Control unit sends READ signal",
    desc: "The control unit reads the instruction: LOAD from address 0101 (cell 5). It puts 0101 on the address bus and sends a READ signal on the control bus. The control bus tells RAM: \"I want to read, not write.\"",
    pc: 5,
    addrBus: "0101",
    dataBus: null,
    controlBus: "READ",
    decoderState: "Receiving: 0101",
    selectedCell: null,
    aluState: "Idle",
    regA: null,
    regB: null,
    cuState: "Sending LOAD [5]",
    activeComponents: ["cu", "addrBus", "controlBus"],
  },
  {
    id: "decode_addr",
    title: "Step 2 — Address decoder selects cell 5",
    desc: "The address decoder inside RAM receives the 4-bit pattern 0101. It activates exactly 1 of its 16 output lines — line 5. This physically connects cell 5's storage transistors to the internal data path. The other 15 cells stay disconnected.",
    pc: 5,
    addrBus: "0101",
    dataBus: null,
    controlBus: "READ",
    decoderState: "0101 → line 5 active",
    selectedCell: 5,
    aluState: "Idle",
    regA: null,
    regB: null,
    cuState: "Waiting for data",
    activeComponents: ["addrBus", "controlBus", "decoder", "cell5"],
  },
  {
    id: "data_return",
    title: "Step 3 — Data travels back on the data bus",
    desc: "Cell 5 contains 0x9C. RAM reads the stored charge from those transistors and drives the value onto the data bus — 4 bits at a time. The control bus confirms the data is valid with a READY signal. The data bus carries the value back toward the CPU.",
    pc: 5,
    addrBus: "0101",
    dataBus: "1100",
    controlBus: "READY",
    decoderState: "Outputting: 0x9C",
    selectedCell: 5,
    aluState: "Idle",
    regA: null,
    regB: null,
    cuState: "Data incoming",
    activeComponents: ["addrBus", "dataBus", "controlBus", "decoder", "cell5"],
  },
  {
    id: "store_reg",
    title: "Step 4 — CPU stores value in register A",
    desc: "The control unit routes the data from the data bus into Register A. The register latches the value — it will hold 1100 until overwritten. The program counter advances to the next instruction. The cycle is complete.",
    pc: 6,
    addrBus: "0101",
    dataBus: "1100",
    controlBus: "DONE",
    decoderState: "Complete",
    selectedCell: 5,
    aluState: "Idle",
    regA: "1100",
    regB: null,
    cuState: "Store → Reg A",
    activeComponents: ["dataBus", "regA", "cu"],
  },
  {
    id: "alu_op",
    title: "Step 5 — ALU can now operate on the data",
    desc: "With data in Register A, the ALU (Arithmetic Logic Unit) can now perform operations: add, subtract, AND, OR, XOR, shift — all the bitwise operations. If there were a value in Register B, the ALU could combine them. The result would go back into a register or out to RAM via another write cycle.",
    pc: 6,
    addrBus: null,
    dataBus: null,
    controlBus: null,
    decoderState: "Idle",
    selectedCell: null,
    aluState: "Ready: A=1100",
    regA: "1100",
    regB: null,
    cuState: "Next instruction",
    activeComponents: ["regA", "alu", "cu", "pc"],
  },
];

// ── Wire component ──
function Wire({ active, color, label, vertical, style: extraStyle }) {
  const P = useTheme().palette;
  return (
    <div style={{
      display: "flex",
      flexDirection: vertical ? "column" : "row",
      alignItems: "center",
      gap: "4px",
      ...extraStyle,
    }}>
      {label && (
        <span style={{
          fontFamily: MONO, fontSize: "10px", fontWeight: 600,
          color: active ? color : P.textMuted,
          textTransform: "uppercase", letterSpacing: "0.05em",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      )}
      <div style={{
        flex: 1,
        height: vertical ? undefined : "4px",
        width: vertical ? "4px" : undefined,
        minHeight: vertical ? "20px" : undefined,
        minWidth: vertical ? undefined : "40px",
        borderRadius: "2px",
        background: active ? color : `${P.border}`,
        transition: "background 0.3s",
        position: "relative",
      }}>
        {active && (
          <div style={{
            position: "absolute", inset: "-2px",
            borderRadius: "4px",
            background: `${color}25`,
          }} />
        )}
      </div>
    </div>
  );
}

// ── 4-bit display ──
function Bits4({ value, color, label }) {
  const P = useTheme().palette;
  if (!value) return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          width: "22px", height: "24px", borderRadius: "4px",
          border: `1px solid ${P.border}`, background: P.surface,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: MONO, fontSize: "14px", color: P.textMuted,
        }}>-</div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {value.split("").map((b, i) => (
        <div key={i} style={{
          width: "22px", height: "24px", borderRadius: "4px",
          border: `1px solid ${b === "1" ? color : P.border}`,
          background: b === "1" ? `${color}18` : P.surface,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: MONO, fontSize: "14px", fontWeight: 700,
          color: b === "1" ? color : P.textMuted,
          transition: "all 0.2s",
        }}>{b}</div>
      ))}
    </div>
  );
}

// ── CPU Component box ──
function CPUComponent({ label, sublabel, active, color, children, style: extraStyle }) {
  const P = useTheme().palette;
  return (
    <div style={{
      background: active ? `${color}10` : P.surfaceAlt,
      border: `1.5px solid ${active ? color : P.border}`,
      borderRadius: "8px",
      padding: "8px 10px",
      transition: "all 0.3s",
      boxShadow: active ? `0 0 12px ${color}22` : "none",
      ...extraStyle,
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "11px", fontWeight: 700,
        color: active ? color : P.textDim,
        textTransform: "uppercase", letterSpacing: "0.05em",
        marginBottom: children ? "6px" : "0",
      }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontFamily: MONO, fontSize: "10px", color: P.textDim, marginBottom: children ? "4px" : "0" }}>
          {sublabel}
        </div>
      )}
      {children}
    </div>
  );
}

// ── RAM Cell ──
function RAMCell({ index, value, selected }) {
  const P = useTheme().palette;
  return (
    <div style={{
      padding: "2px 4px", borderRadius: "4px", fontFamily: MONO, fontSize: "10px",
      border: `1px solid ${selected ? P.accent : P.border}`,
      background: selected ? `${P.accent}20` : "transparent",
      color: selected ? P.accent : P.textDim,
      textAlign: "center", transition: "all 0.3s",
      boxShadow: selected ? `0 0 8px ${P.accent}33` : "none",
    }}>
      <div style={{ fontWeight: 700 }}>{toHex1(index)}</div>
      <div>{value.toString(16).toUpperCase().padStart(2, "0")}</div>
    </div>
  );
}

// ── Address Decoder visualisation ──
function AddressDecoder({ state, selectedLine, active }) {
  const P = useTheme().palette;
  return (
    <div style={{
      background: active ? `${P.orange}10` : P.surfaceAlt,
      border: `1.5px solid ${active ? P.orange : P.border}`,
      borderRadius: "8px", padding: "8px 10px",
      transition: "all 0.3s",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "10px", fontWeight: 700, color: active ? P.orange : P.textDim, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
        Address decoder
      </div>
      <div style={{ fontFamily: MONO, fontSize: "10px", color: P.textDim, marginBottom: "6px" }}>
        {state}
      </div>
      {/* 16 output lines */}
      <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} style={{
            width: "14px", height: "10px", borderRadius: "2px",
            background: selectedLine === i ? P.orange : `${P.border}`,
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: "9px", color: P.textMuted, marginTop: "3px" }}>
        16 output lines → 1 active
      </div>
    </div>
  );
}

// ── Main ──
export default function CPUArchitecture() {
  const P = useTheme().palette;
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const isActive = (component) => step.activeComponents.includes(component);

  const next = useCallback(() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1)), []);
  const prev = useCallback(() => setStepIdx(i => Math.max(i - 1, 0)), []);

  return (
    <div style={{ background: P.bg, minHeight: "100vh", padding: "24px 16px", fontFamily: SANS, color: P.text }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <ExperimentHeader number={3} />
          <h1 style={{ fontFamily: SANS, fontSize: "26px", fontWeight: 800, color: P.text, margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            Inside the CPU
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: P.textDim, margin: 0 }}>
            Three buses, four CPU components, one address decoder. Step through a complete memory read cycle.
          </p>
        </div>

        {/* Step navigation */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "14px 16px", marginBottom: "12px",
        }}>
          <div style={{
            display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap",
          }}>
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => setStepIdx(i)} style={{
                fontFamily: MONO, fontSize: "11px", padding: "5px 10px", borderRadius: "5px",
                border: `1px solid ${stepIdx === i ? P.accent : P.border}`,
                background: stepIdx === i ? `${P.accent}22` : "transparent",
                color: stepIdx === i ? P.accent : P.textDim,
                cursor: "pointer", transition: "all 0.15s",
              }}>
                {i === 0 ? "Idle" : `Step ${i}`}
              </button>
            ))}
          </div>

          <div style={{ fontFamily: SANS, fontSize: "15px", fontWeight: 600, color: P.text, marginBottom: "6px" }}>
            {step.title}
          </div>
          <div style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, lineHeight: 1.7 }}>
            {step.desc}
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button onClick={prev} disabled={stepIdx === 0} style={{
              fontFamily: MONO, fontSize: "12px", padding: "6px 16px", borderRadius: "6px",
              border: `1px solid ${P.border}`, background: P.surfaceAlt,
              color: stepIdx === 0 ? P.textMuted : P.text,
              cursor: stepIdx === 0 ? "default" : "pointer",
              opacity: stepIdx === 0 ? 0.4 : 1,
            }}>
              \u2190 Back
            </button>
            <button onClick={next} disabled={stepIdx === STEPS.length - 1} style={{
              fontFamily: MONO, fontSize: "12px", padding: "6px 16px", borderRadius: "6px",
              border: `1px solid ${stepIdx === STEPS.length - 1 ? P.border : P.accent}`,
              background: stepIdx === STEPS.length - 1 ? P.surfaceAlt : `${P.accent}22`,
              color: stepIdx === STEPS.length - 1 ? P.textMuted : P.accent,
              cursor: stepIdx === STEPS.length - 1 ? "default" : "pointer",
              opacity: stepIdx === STEPS.length - 1 ? 0.4 : 1,
            }}>
              Next \u2192
            </button>
          </div>
        </div>

        {/* Architecture diagram */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "14px",
          padding: "20px 16px", marginBottom: "12px",
        }}>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>

            {/* ═══ CPU ═══ */}
            <div style={{
              flex: "1 1 280px",
              background: `${P.purple}08`,
              border: `1.5px solid ${P.purple}44`,
              borderRadius: "12px",
              padding: "12px",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "13px", fontWeight: 700,
                color: P.purple, marginBottom: "10px", textAlign: "center",
              }}>
                CPU (Processor)
              </div>

              {/* Top row: CU + PC */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <CPUComponent
                  label="Control unit"
                  sublabel={step.cuState}
                  active={isActive("cu")}
                  color={P.pink}
                  style={{ flex: 1 }}
                />
                <CPUComponent
                  label="Program counter"
                  active={isActive("pc")}
                  color={P.cyan}
                  style={{ flex: "0 0 90px" }}
                >
                  <div style={{
                    fontFamily: MONO, fontSize: "18px", fontWeight: 700,
                    color: P.cyan, textAlign: "center",
                  }}>
                    {toBin4(step.pc)}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: "10px", color: P.textDim, textAlign: "center" }}>
                    addr {step.pc}
                  </div>
                </CPUComponent>
              </div>

              {/* Middle: Registers */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <CPUComponent
                  label="Register A"
                  active={isActive("regA")}
                  color={P.green}
                  style={{ flex: 1 }}
                >
                  <Bits4 value={step.regA} color={P.green} />
                </CPUComponent>
                <CPUComponent
                  label="Register B"
                  active={isActive("regB")}
                  color={P.orange}
                  style={{ flex: 1 }}
                >
                  <Bits4 value={step.regB} color={P.orange} />
                </CPUComponent>
              </div>

              {/* Bottom: ALU */}
              <CPUComponent
                label="ALU (Arithmetic Logic Unit)"
                sublabel={step.aluState}
                active={isActive("alu")}
                color={P.yellow}
              >
                <div style={{ fontFamily: MONO, fontSize: "10px", color: P.textDim }}>
                  ADD, SUB, AND, OR, XOR, SHIFT, CMP
                </div>
              </CPUComponent>
            </div>

            {/* ═══ BUSES ═══ */}
            <div style={{
              flex: "0 0 80px",
              display: "flex", flexDirection: "column",
              justifyContent: "center", gap: "16px",
              minWidth: "80px",
            }}>
              {/* Address bus */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: MONO, fontSize: "9px", fontWeight: 700,
                  color: isActive("addrBus") ? P.purple : P.textMuted,
                  textTransform: "uppercase", marginBottom: "4px",
                }}>
                  Address
                </div>
                <div style={{
                  height: "6px", borderRadius: "3px",
                  background: isActive("addrBus") ? P.purple : P.border,
                  transition: "background 0.3s",
                  position: "relative",
                  marginBottom: "2px",
                }}>
                  {isActive("addrBus") && <div style={{ position: "absolute", inset: "-3px", borderRadius: "6px", background: `${P.purple}20` }} />}
                </div>
                {step.addrBus && (
                  <div style={{ fontFamily: MONO, fontSize: "11px", color: P.purple, fontWeight: 700 }}>
                    {step.addrBus}
                  </div>
                )}
                <div style={{ fontFamily: MONO, fontSize: "9px", color: P.textMuted }}>4 wires \u2192</div>
              </div>

              {/* Data bus */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: MONO, fontSize: "9px", fontWeight: 700,
                  color: isActive("dataBus") ? P.green : P.textMuted,
                  textTransform: "uppercase", marginBottom: "4px",
                }}>
                  Data
                </div>
                <div style={{
                  height: "6px", borderRadius: "3px",
                  background: isActive("dataBus") ? P.green : P.border,
                  transition: "background 0.3s",
                  position: "relative",
                  marginBottom: "2px",
                }}>
                  {isActive("dataBus") && <div style={{ position: "absolute", inset: "-3px", borderRadius: "6px", background: `${P.green}20` }} />}
                </div>
                {step.dataBus && (
                  <div style={{ fontFamily: MONO, fontSize: "11px", color: P.green, fontWeight: 700 }}>
                    {step.dataBus}
                  </div>
                )}
                <div style={{ fontFamily: MONO, fontSize: "9px", color: P.textMuted }}>\u2190\u2192 bidir</div>
              </div>

              {/* Control bus */}
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: MONO, fontSize: "9px", fontWeight: 700,
                  color: isActive("controlBus") ? P.red : P.textMuted,
                  textTransform: "uppercase", marginBottom: "4px",
                }}>
                  Control
                </div>
                <div style={{
                  height: "6px", borderRadius: "3px",
                  background: isActive("controlBus") ? P.red : P.border,
                  transition: "background 0.3s",
                  position: "relative",
                  marginBottom: "2px",
                }}>
                  {isActive("controlBus") && <div style={{ position: "absolute", inset: "-3px", borderRadius: "6px", background: `${P.red}20` }} />}
                </div>
                {step.controlBus && (
                  <div style={{ fontFamily: MONO, fontSize: "11px", color: P.red, fontWeight: 700 }}>
                    {step.controlBus}
                  </div>
                )}
                <div style={{ fontFamily: MONO, fontSize: "9px", color: P.textMuted }}>R/W, CLK</div>
              </div>
            </div>

            {/* ═══ RAM ═══ */}
            <div style={{
              flex: "1 1 200px",
              background: `${P.accent}08`,
              border: `1.5px solid ${P.accent}44`,
              borderRadius: "12px",
              padding: "12px",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "13px", fontWeight: 700,
                color: P.accent, marginBottom: "10px", textAlign: "center",
              }}>
                RAM (16 bytes)
              </div>

              {/* Address decoder */}
              <AddressDecoder
                state={step.decoderState}
                selectedLine={step.selectedCell}
                active={isActive("decoder")}
              />

              {/* Memory cells */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: "4px", marginTop: "10px",
              }}>
                {RAM_DATA.map((val, i) => (
                  <RAMCell key={i} index={i} value={val} selected={step.selectedCell === i} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bus legend */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "14px 16px", marginBottom: "12px",
        }}>
          <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
            The three buses
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { color: P.purple, label: "Address bus", desc: "CPU \u2192 RAM. Carries the address of the memory cell to access. One-directional — only the CPU decides where to read or write." },
              { color: P.green, label: "Data bus", desc: "CPU \u2194 RAM. Carries the actual data being read or written. Bidirectional — data flows both ways depending on the operation." },
              { color: P.red, label: "Control bus", desc: "CPU \u2194 RAM. Carries command signals: READ or WRITE, clock timing, interrupts, bus grants. Without this, RAM wouldn\u2019t know what to do with the address." },
            ].map(({ color, label, desc }) => (
              <div key={label} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: color, flexShrink: 0, marginTop: "3px" }} />
                <div>
                  <span style={{ fontFamily: MONO, fontSize: "12px", fontWeight: 700, color }}>{label}</span>
                  <span style={{ fontFamily: SANS, fontSize: "12px", color: P.textDim }}>{" \u2014 "}{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CPU components legend */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "14px 16px", marginBottom: "24px",
        }}>
          <div style={{ fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>
            Inside the CPU
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { color: P.pink, label: "Control unit", desc: "The conductor. Reads instructions, decides what happens next, sends signals to the other components and the control bus." },
              { color: P.cyan, label: "Program counter (PC)", desc: "Holds the address of the next instruction. Advances after each step. Jumps when the code branches." },
              { color: P.green, label: "Registers (A, B)", desc: "Tiny, ultra-fast storage slots inside the CPU. Data must be in a register before the ALU can work on it. A 4-bit CPU has 4-bit registers." },
              { color: P.yellow, label: "ALU (Arithmetic Logic Unit)", desc: "The calculator. Performs all maths and logic: ADD, SUB, AND, OR, XOR, SHIFT, COMPARE. Takes inputs from registers, outputs to a register." },
            ].map(({ color, label, desc }) => (
              <div key={label} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: color, flexShrink: 0, marginTop: "3px" }} />
                <div>
                  <span style={{ fontFamily: MONO, fontSize: "12px", fontWeight: 700, color }}>{label}</span>
                  <span style={{ fontFamily: SANS, fontSize: "12px", color: P.textDim }}>{" \u2014 "}{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "16px", borderTop: `1px solid ${P.border}` }}>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: 1.6 }}>
            This cycle — fetch, decode, execute — repeats billions of times per second.
            <br />
            <span style={{ color: P.accent }}>Your phone\u2019s 64-bit CPU does this with wider buses and more registers, but the principle is identical.</span>
          </p>
        </div>
      </div>
    </div>
  );
}