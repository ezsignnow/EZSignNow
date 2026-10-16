/**
 * Symbols are drawn as vector paths (24×24 box) rather than font glyphs, so
 * they look identical on screen and in the PDF and need no special font.
 */
export interface SymbolDef {
  path: string;
  mode: "fill" | "stroke";
  strokeWidth?: number;
}

export const SYMBOL_PATHS: Record<string, SymbolDef> = {
  "✓": { path: "M4 12.5 L9.5 18 L20 6", mode: "stroke", strokeWidth: 2.2 },
  "✔": { path: "M4 12.5 L9.5 18 L20 6", mode: "stroke", strokeWidth: 3.6 },
  "✗": { path: "M5.5 5.5 L18.5 18.5 M18.5 5.5 L5.5 18.5", mode: "stroke", strokeWidth: 2.2 },
  "✘": { path: "M5.5 5.5 L18.5 18.5 M18.5 5.5 L5.5 18.5", mode: "stroke", strokeWidth: 3.6 },
  "●": { path: "M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 Z", mode: "fill" },
  "○": { path: "M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4 Z", mode: "stroke", strokeWidth: 2 },
  "■": { path: "M5 5 H19 V19 H5 Z", mode: "fill" },
  "□": { path: "M5 5 H19 V19 H5 Z", mode: "stroke", strokeWidth: 2 },
  "★": {
    path: "M12 2.5 L14.9 8.6 L21.5 9.3 L16.5 13.8 L17.9 20.4 L12 17 L6.1 20.4 L7.5 13.8 L2.5 9.3 L9.1 8.6 Z",
    mode: "fill",
  },
  "➔": { path: "M3 10 H14 V5.5 L21 12 L14 18.5 V14 H3 Z", mode: "fill" },
};

export const SYMBOL_LABELS: Record<string, string> = {
  "✓": "Check",
  "✔": "Heavy check",
  "✗": "Cross",
  "✘": "Heavy cross",
  "●": "Dot",
  "○": "Circle",
  "■": "Square",
  "□": "Box",
  "★": "Star",
  "➔": "Arrow",
};
