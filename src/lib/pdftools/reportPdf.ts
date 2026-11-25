import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

type Color = ReturnType<typeof rgb>;

/** Characters outside WinAnsi that have a close ASCII look-alike. */
const FOLD: Record<string, string> = { "→": "->", "←": "<-", "−": "-", "‑": "-", "✓": "v", "✔": "v", "•": "•", " ": " ", "\t": "    " };

/** Replaces characters the standard PDF fonts can't encode; returns how many had to become "?". */
export function winAnsiSafe(font: PDFFont, text: string): { text: string; replaced: number } {
  let replaced = 0;
  const out = [...text.replace(/[\r\n]+/g, " ")]
    .map((ch) => {
      const f = FOLD[ch] ?? ch;
      if (f.length > 1) return f;
      try {
        font.encodeText(f);
        return f;
      } catch {
        replaced++;
        return "?";
      }
    })
    .join("");
  return { text: out, replaced };
}

/** True if every character of `text` can be written with the standard Helvetica font. */
export async function isWinAnsiText(text: string): Promise<boolean> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  return winAnsiSafe(font, text).replaced === 0;
}

export interface WriterOptions {
  pageSize?: [number, number];
  margin?: number;
}

/** A minimal flowing-text PDF writer (wrapping, page breaks, coloured lines) used by reports. */
export class ReportWriter {
  readonly doc: PDFDocument;
  regular!: PDFFont;
  bold!: PDFFont;
  mono!: PDFFont;
  page!: PDFPage;
  y = 0;
  replaced = 0;
  private W: number;
  private H: number;
  private margin: number;

  private constructor(doc: PDFDocument, opts: WriterOptions) {
    this.doc = doc;
    [this.W, this.H] = opts.pageSize ?? [595.28, 841.89];
    this.margin = opts.margin ?? 48;
  }

  static async create(opts: WriterOptions = {}): Promise<ReportWriter> {
    const w = new ReportWriter(await PDFDocument.create(), opts);
    w.regular = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.mono = await w.doc.embedFont(StandardFonts.Courier);
    w.newPage();
    return w;
  }

  get contentWidth() {
    return this.W - this.margin * 2;
  }

  newPage() {
    this.page = this.doc.addPage([this.W, this.H]);
    this.y = this.H - this.margin;
  }

  private ensure(height: number) {
    if (this.y - height < this.margin) this.newPage();
  }

  space(pt: number) {
    this.y -= pt;
  }

  private wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const safe = winAnsiSafe(font, text);
    this.replaced += safe.replaced;
    const lines: string[] = [];
    for (const para of safe.text.split(/\n/)) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        let w = word;
        // Very long unbroken words get split so they never run off the page.
        while (font.widthOfTextAtSize(w, size) > width) {
          let cut = w.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
          if (line) {
            lines.push(line);
            line = "";
          }
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        const next = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(next, size) > width && line) {
          lines.push(line);
          line = w;
        } else line = next;
      }
      lines.push(line);
    }
    return lines;
  }

  /** Writes wrapped text. `bg` paints a band behind each line; `bar` a coloured bar at the left edge. */
  text(text: string, o: { size?: number; bold?: boolean; mono?: boolean; color?: Color; bg?: Color; bar?: Color; indent?: number; gap?: number } = {}) {
    const size = o.size ?? 10;
    const font = o.mono ? this.mono : o.bold ? this.bold : this.regular;
    const indent = o.indent ?? 0;
    const lineH = size * 1.35;
    const lines = this.wrap(text, font, size, this.contentWidth - indent - (o.bg || o.bar ? 12 : 0));
    for (const line of lines) {
      this.ensure(lineH);
      const top = this.y;
      if (o.bg) this.page.drawRectangle({ x: this.margin + indent, y: top - lineH + 2, width: this.contentWidth - indent, height: lineH, color: o.bg });
      if (o.bar) this.page.drawRectangle({ x: this.margin + indent, y: top - lineH + 2, width: 3, height: lineH, color: o.bar });
      this.page.drawText(line, { x: this.margin + indent + (o.bg || o.bar ? 8 : 0), y: top - size, size, font, color: o.color ?? rgb(0.1, 0.12, 0.16) });
      this.y -= lineH;
    }
    this.y -= o.gap ?? 0;
  }

  heading(text: string, size = 16) {
    this.ensure(size * 2);
    this.text(text, { size, bold: true, gap: 4 });
  }

  rule() {
    this.ensure(8);
    this.page.drawLine({ start: { x: this.margin, y: this.y - 2 }, end: { x: this.W - this.margin, y: this.y - 2 }, thickness: 0.6, color: rgb(0.85, 0.87, 0.9) });
    this.y -= 8;
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save({ useObjectStreams: true });
  }
}
