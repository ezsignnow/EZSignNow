import type { PDFPageProxy } from "@/lib/pdfjs";

export interface TextLine {
  /** Top-left based coordinates of the line's baseline start. */
  x: number;
  y: number;
  size: number;
  /** Pieces of the line in reading order with their own x positions. */
  pieces: { x: number; end: number; text: string; size: number }[];
  text: string;
}

/** Builds reading-order lines from a page's text, in displayed (top-left) coordinates. */
export async function pageLines(page: PDFPageProxy): Promise<TextLine[]> {
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items: { x: number; y: number; w: number; size: number; s: string }[] = [];
  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const it = raw as { str: string; transform: number[]; width: number };
    // Whitespace-only items (PDF.js adds them between words) would bridge table columns.
    if (!it.str || !it.str.trim()) continue;
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    const size = Math.hypot(it.transform[2], it.transform[3]) || Math.hypot(it.transform[0], it.transform[1]) || 10;
    items.push({ x, y, w: it.width, size, s: it.str });
  }
  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: { y: number; size: number; items: typeof items }[] = [];
  for (const it of items) {
    const line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, Math.min(l.size, it.size) * 0.45));
    if (line) {
      line.items.push(it);
      line.size = Math.max(line.size, it.size);
    } else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  return lines
    .sort((a, b) => a.y - b.y)
    .map((l) => {
      const sorted = l.items.sort((a, b) => a.x - b.x);
      const pieces: TextLine["pieces"] = [];
      let text = "";
      for (const it of sorted) {
        const prev = pieces[pieces.length - 1];
        const gap = prev ? it.x - prev.end : 0;
        if (prev && gap < it.size * 0.25 && !/\s$/.test(prev.text)) {
          prev.text += it.s;
          prev.end = it.x + it.w;
        } else if (prev && gap < it.size * 1.0) {
          prev.text += (/\s$/.test(prev.text) || /^\s/.test(it.s) ? "" : " ") + it.s;
          prev.end = it.x + it.w;
        } else pieces.push({ x: it.x, end: it.x + it.w, text: it.s, size: it.size });
        text += (text && !/\s$/.test(text) && !/^\s/.test(it.s) && gap > it.size * 0.2 ? " " : "") + it.s;
      }
      return { x: sorted[0].x, y: l.y, size: l.size, pieces: pieces.map((p) => ({ ...p, text: p.text.replace(/\s+/g, " ").trim() })).filter((p) => p.text), text: text.replace(/\s+/g, " ").trim() };
    })
    .filter((l) => l.text);
}

export interface Paragraph {
  text: string;
  size: number;
  heading: 0 | 1 | 2;
  center: boolean;
}

/** Groups lines into paragraphs and spots headings by font size. */
export function paragraphs(lines: TextLine[], pageWidth: number): Paragraph[] {
  if (!lines.length) return [];
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)];
  const out: Paragraph[] = [];
  let cur: { lines: TextLine[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const size = Math.max(...cur.lines.map((l) => l.size));
    const text = cur.lines.map((l) => l.text).join(" ").replace(/-\s(?=[a-z])/g, "").replace(/\s+/g, " ").trim();
    const first = cur.lines[0];
    const mid = first.x + (first.pieces[first.pieces.length - 1]?.end ?? first.x) ;
    const center = cur.lines.length <= 2 && Math.abs(mid / 2 - pageWidth / 2) < pageWidth * 0.06 && first.x > pageWidth * 0.15;
    out.push({ text, size, heading: size >= body * 1.6 ? 1 : size >= body * 1.2 ? 2 : 0, center });
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const prev = i > 0 ? lines[i - 1] : null;
    const sameStyle = prev && Math.abs(prev.size - l.size) < 0.6;
    const gap = prev ? l.y - prev.y : 0;
    const continues = cur && prev && sameStyle && gap < prev.size * 1.75 && Math.abs(l.x - prev.x) < prev.size * 3;
    if (!continues) flush();
    if (!cur) cur = { lines: [] };
    cur.lines.push(l);
  }
  flush();
  return out;
}
