import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
};

function toHex(v) { return v.toString(16).toUpperCase().padStart(2, "0"); }

// ── BMP region types ──
const REGIONS = {
  signature:  { color: P.red,      label: "Signature",       desc: "Magic bytes 'BM' — tells the OS this is a BMP file" },
  filesize:   { color: P.orange,   label: "File Size",       desc: "Total file size in bytes (little-endian)" },
  reserved:   { color: P.textMuted,label: "Reserved",        desc: "Unused — always 0x00" },
  dataOffset: { color: P.yellow,   label: "Pixel Data Offset", desc: "Where pixel data starts (byte 54 for 24-bit BMP)" },
  headerSize: { color: P.purple,   label: "Header Size",     desc: "DIB header size — 40 bytes for BITMAPINFOHEADER" },
  width:      { color: P.accent,   label: "Image Width",     desc: "Width in pixels (little-endian)" },
  height:     { color: P.accentAlt,label: "Image Height",    desc: "Height in pixels (little-endian, negative = top-down)" },
  planes:     { color: P.textDim,  label: "Color Planes",    desc: "Always 1" },
  bpp:        { color: P.pink,     label: "Bits Per Pixel",  desc: "24 = 3 bytes per pixel (RGB)" },
  compression:{ color: P.textMuted,label: "Compression",     desc: "0 = uncompressed" },
  imgSize:    { color: P.textMuted,label: "Image Data Size", desc: "Can be 0 for uncompressed" },
  hRes:       { color: P.textMuted,label: "H Resolution",    desc: "Pixels per meter (not critical)" },
  vRes:       { color: P.textMuted,label: "V Resolution",    desc: "Pixels per meter (not critical)" },
  colors:     { color: P.textMuted,label: "Colors Used",     desc: "0 = all colors" },
  important:  { color: P.textMuted,label: "Important Colors",desc: "0 = all important" },
  pixel:      { color: P.green,    label: "Pixel Data",      desc: "Blue, Green, Red bytes for each pixel (yes, BGR!)" },
  padding:    { color: P.textMuted,label: "Row Padding",     desc: "BMP rows must be multiples of 4 bytes" },
};

// ── Build a BMP byte array from a pixel grid ──
function buildBMP(pixels, width, height) {
  const rowBytes = width * 3;
  const paddingPerRow = (4 - (rowBytes % 4)) % 4;
  const dataSize = (rowBytes + paddingPerRow) * height;
  const fileSize = 54 + dataSize;

  const bytes = [];
  const regions = [];

  function push(val, region) {
    regions.push(region);
    bytes.push(val & 0xFF);
  }
  function pushLE16(val, region) {
    push(val & 0xFF, region);
    push((val >> 8) & 0xFF, region);
  }
  function pushLE32(val, region) {
    push(val & 0xFF, region);
    push((val >> 8) & 0xFF, region);
    push((val >> 16) & 0xFF, region);
    push((val >> 24) & 0xFF, region);
  }

  // File header (14 bytes)
  push(0x42, "signature"); push(0x4D, "signature"); // "BM"
  pushLE32(fileSize, "filesize");
  pushLE16(0, "reserved"); pushLE16(0, "reserved");
  pushLE32(54, "dataOffset");

  // DIB header (40 bytes)
  pushLE32(40, "headerSize");
  pushLE32(width, "width");
  pushLE32(-height, "height"); // negative = top-down
  pushLE16(1, "planes");
  pushLE16(24, "bpp");
  pushLE32(0, "compression");
  pushLE32(dataSize, "imgSize");
  pushLE32(2835, "hRes");
  pushLE32(2835, "vRes");
  pushLE32(0, "colors");
  pushLE32(0, "important");

  // Pixel data (BGR order, top-down because height is negative)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = pixels[y * width + x] || { r: 0, g: 0, b: 0 };
      push(px.b, "pixel");
      push(px.g, "pixel");
      push(px.r, "pixel");
    }
    for (let p = 0; p < paddingPerRow; p++) {
      push(0, "padding");
    }
  }

  return { bytes, regions, fileSize, dataSize };
}

// ── Preset pixel patterns ──
function solidRed(w, h) {
  return Array.from({ length: w * h }, () => ({ r: 255, g: 0, b: 0 }));
}
function checkerboard(w, h) {
  return Array.from({ length: w * h }, (_, i) => {
    const x = i % w, y = Math.floor(i / w);
    return (x + y) % 2 === 0 ? { r: 255, g: 255, b: 255 } : { r: 30, g: 30, b: 30 };
  });
}
function gradient(w, h) {
  return Array.from({ length: w * h }, (_, i) => {
    const x = i % w;
    const t = x / (w - 1);
    return { r: Math.round(255 * t), g: Math.round(80 + 175 * (1 - t)), b: Math.round(200 * Math.sin(t * Math.PI)) };
  });
}
function rainbow(w, h) {
  return Array.from({ length: w * h }, (_, i) => {
    const x = i % w;
    const hue = (x / w) * 360;
    const s = 1, l = 0.5;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hh = hue / 60;
    const x2 = c * (1 - Math.abs(hh % 2 - 1));
    let r = 0, g = 0, b = 0;
    if (hh < 1) { r = c; g = x2; }
    else if (hh < 2) { r = x2; g = c; }
    else if (hh < 3) { g = c; b = x2; }
    else if (hh < 4) { g = x2; b = c; }
    else if (hh < 5) { r = x2; b = c; }
    else { r = c; b = x2; }
    const m = l - c / 2;
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  });
}
function face(w, h) {
  return Array.from({ length: w * h }, (_, i) => {
    const x = i % w, y = Math.floor(i / w);
    // simple smiley on yellow bg
    const cx = w / 2, cy = h / 2, rad = Math.min(w, h) * 0.4;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist > rad + 0.5) return { r: 40, g: 40, b: 60 }; // bg
    // eyes
    const eyeY = cy - rad * 0.25;
    const leftEye = Math.sqrt((x - (cx - rad * 0.3)) ** 2 + (y - eyeY) ** 2) < rad * 0.12;
    const rightEye = Math.sqrt((x - (cx + rad * 0.3)) ** 2 + (y - eyeY) ** 2) < rad * 0.12;
    if (leftEye || rightEye) return { r: 40, g: 30, b: 20 };
    // mouth
    const mouthDist = Math.sqrt((x - cx) ** 2 + (y - (cy + rad * 0.15)) ** 2);
    if (mouthDist > rad * 0.35 && mouthDist < rad * 0.5 && y > cy + rad * 0.15) return { r: 40, g: 30, b: 20 };
    return { r: 255, g: 210, b: 50 }; // face yellow
  });
}

const PRESETS = [
  { label: "Solid Red", fn: solidRed },
  { label: "Checkerboard", fn: checkerboard },
  { label: "Gradient", fn: gradient },
  { label: "Rainbow", fn: rainbow },
  { label: "Smiley", fn: face },
];

// ── Animated builder ──
function useAnimatedBuild(totalBytes) {
  const [revealCount, setRevealCount] = useState(totalBytes);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    setRevealCount(0);
    setAnimating(true);
  }, []);

  const stop = useCallback(() => {
    setAnimating(false);
    clearInterval(intervalRef.current);
    setRevealCount(totalBytes);
  }, [totalBytes]);

  useEffect(() => {
    if (animating) {
      const step = Math.max(1, Math.floor(totalBytes / 120));
      intervalRef.current = setInterval(() => {
        setRevealCount(prev => {
          if (prev >= totalBytes) {
            setAnimating(false);
            clearInterval(intervalRef.current);
            return totalBytes;
          }
          return Math.min(prev + step, totalBytes);
        });
      }, 30);
    }
    return () => clearInterval(intervalRef.current);
  }, [animating, totalBytes]);

  useEffect(() => {
    setRevealCount(totalBytes);
  }, [totalBytes]);

  return { revealCount, animating, start, stop };
}

// ── Pixel editor grid ──
function PixelEditor({ pixels, width, height, onChange }) {
  const P = useTheme().palette;
  const [painting, setPainting] = useState(false);
  const [currentColor, setCurrentColor] = useState({ r: 255, g: 0, b: 0 });

  const colorPresets = [
    { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 }, { r: 255, g: 0, b: 255 }, { r: 0, g: 255, b: 255 },
    { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 },
    { r: 255, g: 128, b: 0 }, { r: 128, g: 0, b: 255 }, { r: 255, g: 192, b: 203 }, { r: 0, g: 128, b: 0 },
  ];

  const paint = useCallback((idx) => {
    const newPx = [...pixels];
    newPx[idx] = { ...currentColor };
    onChange(newPx);
  }, [pixels, currentColor, onChange]);

  const cellSize = Math.min(28, Math.floor(360 / width));

  return (
    <div>
      {/* Color palette */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: SANS, fontSize: "10px", color: P.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginRight: "4px" }}>Brush:</span>
        {colorPresets.map((c, i) => (
          <div
            key={i}
            onClick={() => setCurrentColor(c)}
            style={{
              width: "20px", height: "20px", borderRadius: "4px", cursor: "pointer",
              background: `rgb(${c.r},${c.g},${c.b})`,
              border: `2px solid ${c.r === currentColor.r && c.g === currentColor.g && c.b === currentColor.b ? P.text : P.border}`,
              transition: "border 0.1s",
            }}
          />
        ))}
      </div>

      {/* Pixel grid */}
      <div
        onMouseDown={() => setPainting(true)}
        onMouseUp={() => setPainting(false)}
        onMouseLeave={() => setPainting(false)}
        style={{ display: "inline-block", cursor: "crosshair", userSelect: "none" }}
      >
        {Array.from({ length: height }, (_, y) => (
          <div key={y} style={{ display: "flex" }}>
            {Array.from({ length: width }, (_, x) => {
              const idx = y * width + x;
              const px = pixels[idx] || { r: 0, g: 0, b: 0 };
              return (
                <div
                  key={x}
                  onMouseDown={() => paint(idx)}
                  onMouseEnter={() => painting && paint(idx)}
                  style={{
                    width: `${cellSize}px`, height: `${cellSize}px`,
                    background: `rgb(${px.r},${px.g},${px.b})`,
                    border: `0.5px solid ${P.border}`,
                    boxSizing: "border-box",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BMP Preview from bytes ──
function BMPPreview({ bytes, revealCount, width, height }) {
  const P = useTheme().palette;
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const scale = Math.min(8, Math.floor(200 / Math.max(width, height)));
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decode pixels from revealed bytes
    const dataStart = 54;
    const rowBytes = width * 3;
    const paddingPerRow = (4 - (rowBytes % 4)) % 4;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteOffset = dataStart + y * (rowBytes + paddingPerRow) + x * 3;
        if (byteOffset + 2 < revealCount) {
          const b = bytes[byteOffset];
          const g = bytes[byteOffset + 1];
          const r = bytes[byteOffset + 2];
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [bytes, revealCount, width, height]);

  return <canvas ref={canvasRef} style={{ borderRadius: "6px", border: `1px solid ${P.border}`, imageRendering: "pixelated" }} />;
}

// ── Hex dump with region highlighting ──
function HexDump({ bytes, bmpRegions, revealCount, hoveredRegion, onHoverRegion, onLeave }) {
  const P = useTheme().palette;
  const rows = [];
  for (let i = 0; i < Math.min(bytes.length, revealCount); i += 16) {
    rows.push({ offset: i, data: bytes.slice(i, Math.min(i + 16, revealCount)), regions: bmpRegions.slice(i, Math.min(i + 16, revealCount)) });
  }

  return (
    <div style={{ fontFamily: MONO, fontSize: "12px", lineHeight: "22px", overflowX: "auto" }}>
      {rows.map(row => (
        <div key={row.offset} style={{ display: "flex", gap: "6px", whiteSpace: "nowrap" }}>
          <span style={{ color: P.textMuted, width: "52px", flexShrink: 0, textAlign: "right", paddingRight: "4px" }}>
            {row.offset.toString(16).toUpperCase().padStart(4, "0")}
          </span>
          <span>
            {row.data.map((b, i) => {
              const region = row.regions[i];
              const rInfo = REGIONS[region];
              const isHov = hoveredRegion === region;
              return (
                <span key={i}>
                  <span
                    onMouseEnter={() => onHoverRegion(region)}
                    onMouseLeave={onLeave}
                    style={{
                      color: rInfo ? rInfo.color : P.textMuted,
                      background: isHov ? `${rInfo?.color || P.textMuted}22` : "transparent",
                      borderRadius: "2px", padding: "0 1px",
                      cursor: "default", transition: "background 0.1s",
                    }}
                  >
                    {toHex(b)}
                  </span>
                  {i === 7 ? "  " : " "}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Region legend ──
function RegionInfo({ region }) {
  const P = useTheme().palette;
  if (!region) return (
    <div style={{
      fontFamily: SANS, fontSize: "13px", color: P.textDim, padding: "12px",
      background: P.surfaceAlt, borderRadius: "8px", border: `1px solid ${P.border}`,
      textAlign: "center",
    }}>
      Hover over hex bytes to see what each part of the file means
    </div>
  );

  const r = REGIONS[region];
  return (
    <div style={{
      padding: "12px 16px", background: P.surfaceAlt, borderRadius: "8px",
      border: `1px solid ${r.color}44`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: r.color }} />
        <span style={{ fontFamily: MONO, fontSize: "13px", fontWeight: 700, color: r.color }}>{r.label}</span>
      </div>
      <div style={{ fontFamily: SANS, fontSize: "12px", color: P.textDim, lineHeight: 1.5 }}>
        {r.desc}
      </div>
    </div>
  );
}

// ── Main App ──
export default function FileAnatomy() {
  const P = useTheme().palette;
  const [imgWidth] = useState(16);
  const [imgHeight] = useState(16);
  const [presetIdx, setPresetIdx] = useState(0);
  const [pixels, setPixels] = useState(() => PRESETS[0].fn(16, 16));
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const { bytes, regions: bmpRegions, fileSize } = useMemo(
    () => buildBMP(pixels, imgWidth, imgHeight),
    [pixels, imgWidth, imgHeight]
  );

  const { revealCount, animating, start, stop } = useAnimatedBuild(bytes.length);

  const loadPreset = useCallback((idx) => {
    setPresetIdx(idx);
    setPixels(PRESETS[idx].fn(imgWidth, imgHeight));
  }, [imgWidth, imgHeight]);

  const progress = bytes.length > 0 ? Math.round((revealCount / bytes.length) * 100) : 0;

  return (
    <div style={{
      background: P.bg, minHeight: "100vh", padding: "24px 16px",
      fontFamily: SANS, color: P.text,
    }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <ExperimentHeader number={8} />
          <h1 style={{
            fontFamily: SANS, fontSize: "28px", fontWeight: 800,
            color: P.text, margin: "0 0 6px 0", letterSpacing: "-0.02em",
          }}>
            File Anatomy
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "14px", color: P.textDim, margin: 0 }}>
            Build a real BMP image file from raw bytes. Paint pixels, then watch every byte that makes it a valid image.
          </p>
        </div>

        {/* Top section: editor + preview */}
        <div style={{
          display: "flex", gap: "16px", marginBottom: "16px",
          flexWrap: "wrap",
        }}>
          {/* Pixel editor */}
          <div style={{
            background: P.surface, border: `1px solid ${P.border}`, borderRadius: "12px",
            padding: "16px", flex: "1 1 380px",
          }}>
            <div style={{
              fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px",
            }}>
              🎨 Paint your image ({imgWidth}×{imgHeight} pixels)
            </div>

            {/* Presets */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(i)}
                  style={{
                    fontFamily: MONO, fontSize: "11px", padding: "4px 10px", borderRadius: "4px",
                    border: `1px solid ${presetIdx === i ? P.accent : P.border}`,
                    background: presetIdx === i ? `${P.accent}22` : "transparent",
                    color: presetIdx === i ? P.accent : P.textDim,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <PixelEditor
              pixels={pixels}
              width={imgWidth}
              height={imgHeight}
              onChange={setPixels}
            />
          </div>

          {/* Preview + controls */}
          <div style={{
            display: "flex", flexDirection: "column", gap: "12px",
            flex: "1 1 240px", minWidth: "200px",
          }}>
            {/* Rendered preview */}
            <div style={{
              background: P.surface, border: `1px solid ${P.border}`, borderRadius: "12px",
              padding: "16px", display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{
                fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px",
              }}>
                🖼️ Rendered from bytes
              </div>
              <BMPPreview bytes={bytes} revealCount={revealCount} width={imgWidth} height={imgHeight} />
              <div style={{
                fontFamily: MONO, fontSize: "11px", color: P.textDim, marginTop: "8px",
              }}>
                {revealCount} / {bytes.length} bytes revealed
              </div>
            </div>

            {/* Build animation */}
            <div style={{
              background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
              padding: "14px",
            }}>
              <button
                onClick={animating ? stop : start}
                style={{
                  width: "100%", fontFamily: MONO, fontSize: "13px", fontWeight: 600,
                  padding: "10px", borderRadius: "6px",
                  border: `1px solid ${animating ? P.red : P.green}`,
                  background: animating ? `${P.red}22` : `${P.green}22`,
                  color: animating ? P.red : P.green,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {animating ? "⏸ Stop" : "▶ Watch it build byte-by-byte"}
              </button>

              {/* Progress bar */}
              <div style={{
                marginTop: "8px", height: "6px", borderRadius: "3px",
                background: P.surfaceAlt, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progress}%`, height: "100%", borderRadius: "3px",
                  background: `linear-gradient(90deg, ${P.accent}, ${P.green})`,
                  transition: "width 0.1s",
                }} />
              </div>
            </div>

            {/* File stats */}
            <div style={{
              background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
              padding: "14px",
            }}>
              <div style={{
                fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px",
              }}>
                📊 File Stats
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontFamily: MONO, fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: P.textDim }}>File size</span>
                  <span style={{ color: P.orange }}>{fileSize} bytes</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: P.textDim }}>Header</span>
                  <span style={{ color: P.purple }}>54 bytes</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: P.textDim }}>Pixel data</span>
                  <span style={{ color: P.green }}>{fileSize - 54} bytes</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: P.textDim }}>Pixels</span>
                  <span style={{ color: P.accent }}>{imgWidth} × {imgHeight} = {imgWidth * imgHeight}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: P.textDim }}>Bytes/pixel</span>
                  <span style={{ color: P.pink }}>3 (BGR)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Region info */}
        <div style={{ marginBottom: "12px" }}>
          <RegionInfo region={hoveredRegion} />
        </div>

        {/* Hex dump */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "12px",
          padding: "16px", marginBottom: "12px",
        }}>
          <div style={{
            fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px",
          }}>
            ⬡ Every byte in the file — hover to decode
          </div>
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            <HexDump
              bytes={bytes}
              bmpRegions={bmpRegions}
              revealCount={revealCount}
              hoveredRegion={hoveredRegion}
              onHoverRegion={setHoveredRegion}
              onLeave={() => setHoveredRegion(null)}
            />
          </div>
        </div>

        {/* Region legend compact */}
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: "10px",
          padding: "14px 16px", marginBottom: "24px",
        }}>
          <div style={{
            fontFamily: SANS, fontSize: "11px", fontWeight: 600, color: P.textDim,
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px",
          }}>
            🗺️ File structure map
          </div>
          <div style={{ display: "flex", gap: "4px", height: "24px", borderRadius: "4px", overflow: "hidden" }}>
            {[
              { region: "signature", width: 2 },
              { region: "filesize", width: 4 },
              { region: "reserved", width: 4 },
              { region: "dataOffset", width: 4 },
              { region: "headerSize", width: 4 },
              { region: "width", width: 4 },
              { region: "height", width: 4 },
              { region: "planes", width: 2 },
              { region: "bpp", width: 2 },
              { region: "compression", width: 4 },
              { region: "imgSize", width: 4 },
              { region: "hRes", width: 4 },
              { region: "vRes", width: 4 },
              { region: "colors", width: 4 },
              { region: "important", width: 4 },
            ].map((seg, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredRegion(seg.region)}
                onMouseLeave={() => setHoveredRegion(null)}
                title={REGIONS[seg.region].label}
                style={{
                  flex: seg.width,
                  background: REGIONS[seg.region].color,
                  opacity: hoveredRegion === seg.region ? 1 : 0.5,
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              />
            ))}
            <div
              onMouseEnter={() => setHoveredRegion("pixel")}
              onMouseLeave={() => setHoveredRegion(null)}
              title="Pixel Data"
              style={{
                flex: 40,
                background: REGIONS.pixel.color,
                opacity: hoveredRegion === "pixel" ? 1 : 0.5,
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
            />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: "4px",
            fontFamily: MONO, fontSize: "9px", color: P.textDim,
          }}>
            <span>0x00 — Header</span>
            <span>0x36 — Pixel data begins</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", padding: "16px", borderTop: `1px solid ${P.border}`,
        }}>
          <p style={{ fontFamily: SANS, fontSize: "13px", color: P.textDim, margin: 0, lineHeight: 1.6 }}>
            A BMP file is just a header (metadata) followed by pixel bytes.
            <br />
            <span style={{ color: P.accent }}>There's no magic — you just saw every single byte that makes an image a valid file.</span>
          </p>
        </div>
      </div>
    </div>
  );
}