import { PDFArray, PDFDocument, PDFFont, PDFName, PDFPage, PDFString, StandardFonts, rgb } from "pdf-lib";
import { dataUrlToBytes } from "./core";

/**
 * A small flow-layout engine that turns simple HTML (as produced from Word
 * files, or basic web pages) into a PDF with real, selectable text.
 */

interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  href?: string;
  size?: number;
  color?: [number, number, number];
}

interface LayoutOptions {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  family: "Times" | "Helvetica";
  fontSize: number;
}

type FontSet = Record<"r" | "b" | "i" | "bi" | "code", PDFFont>;

export async function htmlToTextPdf(html: string, opts: LayoutOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fam = opts.family === "Times"
    ? [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic, StandardFonts.TimesRomanBoldItalic]
    : [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique, StandardFonts.HelveticaBoldOblique];
  const fonts: FontSet = {
    r: await doc.embedFont(fam[0]),
    b: await doc.embedFont(fam[1]),
    i: await doc.embedFont(fam[2]),
    bi: await doc.embedFont(fam[3]),
    code: await doc.embedFont(StandardFonts.Courier),
  };
  const engine = new Layout(doc, fonts, opts);
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,noscript,template,head,svg,iframe,nav,footer form").forEach((n) => n.remove());
  const title = parsed.querySelector("title")?.textContent?.trim();
  if (title) doc.setTitle(title);
  await engine.blocks(parsed.body, 0);
  if (doc.getPageCount() === 0) doc.addPage([opts.pageWidth, opts.pageHeight]);
  return doc.save({ useObjectStreams: true });
}

const HEADING_SIZES: Record<string, number> = { H1: 2, H2: 1.6, H3: 1.3, H4: 1.15, H5: 1.05, H6: 1 };
const BLOCK_TAGS = new Set(["P", "DIV", "SECTION", "ARTICLE", "MAIN", "HEADER", "ASIDE", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "TABLE", "BLOCKQUOTE", "PRE", "HR", "FIGURE", "IMG", "DL", "DT", "DD", "ADDRESS", "CENTER", "FIGCAPTION", "BODY"]);

class Layout {
  page!: PDFPage;
  y = 0;
  constructor(public doc: PDFDocument, public fonts: FontSet, public o: LayoutOptions) {}

  get width() {
    return this.o.pageWidth - this.o.margin * 2;
  }

  newPage() {
    this.page = this.doc.addPage([this.o.pageWidth, this.o.pageHeight]);
    this.y = this.o.pageHeight - this.o.margin;
  }

  ensure(h: number) {
    if (!this.page || this.y - h < this.o.margin) this.newPage();
  }

  font(r: Run) {
    if (r.code) return this.fonts.code;
    return r.bold && r.italic ? this.fonts.bi : r.bold ? this.fonts.b : r.italic ? this.fonts.i : this.fonts.r;
  }

  clean(font: PDFFont, s: string) {
    return [...s.replace(/\u00a0/g, " ").replace(/\t/g, "    ")]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
  }

  /** Collects inline runs from a node. */
  runs(node: Node, style: Run, out: Run[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? "").replace(/\s+/g, " ");
      if (t) out.push({ ...style, text: t });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === "BR") {
      out.push({ ...style, text: "\n" });
      return;
    }
    if (tag === "IMG") return;
    const s: Run = { ...style };
    if (tag === "B" || tag === "STRONG" || /bold|[6-9]00/.test(node.style.fontWeight)) s.bold = true;
    if (tag === "I" || tag === "EM" || node.style.fontStyle === "italic") s.italic = true;
    if (tag === "U" || tag === "INS") s.underline = true;
    if (tag === "CODE" || tag === "KBD" || tag === "SAMP") s.code = true;
    if (tag === "A" && node.getAttribute("href")) {
      s.href = node.getAttribute("href")!;
      s.color = [0.07, 0.3, 0.8];
      s.underline = true;
    }
    if (tag === "SUP" || tag === "SUB") s.size = (style.size ?? this.o.fontSize) * 0.75;
    node.childNodes.forEach((c) => this.runs(c, s, out));
  }

  /** Lays out runs as wrapped lines within [x, x+width]. Returns the height used (no drawing when dry). */
  flow(runs: Run[], x: number, width: number, baseSize: number, opts: { align?: "left" | "center" | "right"; dry?: boolean; lineGap?: number } = {}): number {
    type Word = { text: string; run: Run; w: number; space: number; size: number };
    const lines: Word[][] = [[]];
    let lineW = 0;
    for (const r of runs) {
      const size = r.size ?? baseSize;
      const font = this.font(r);
      const parts = r.text.split(/(\n)/);
      for (const part of parts) {
        if (part === "\n") {
          lines.push([]);
          lineW = 0;
          continue;
        }
        const tokens = part.split(/(?<= )/);
        for (const tok of tokens) {
          if (!tok) continue;
          const text = this.clean(font, tok);
          const w = font.widthOfTextAtSize(text, size);
          const trailing = text.endsWith(" ") ? font.widthOfTextAtSize(" ", size) : 0;
          const line = lines[lines.length - 1];
          if (line.length && lineW + w - trailing > width) {
            lines.push([]);
            lineW = 0;
            if (text === " ") continue;
          }
          // Very long words: break by characters.
          if (w - trailing > width && text.length > 1) {
            let chunk = "";
            for (const ch of text) {
              if (font.widthOfTextAtSize(chunk + ch, size) > width && chunk) {
                lines[lines.length - 1].push({ text: chunk, run: r, w: font.widthOfTextAtSize(chunk, size), space: 0, size });
                lines.push([]);
                chunk = "";
              }
              chunk += ch;
            }
            const cw = font.widthOfTextAtSize(chunk, size);
            lines[lines.length - 1].push({ text: chunk, run: r, w: cw, space: 0, size });
            lineW = cw;
            continue;
          }
          lines[lines.length - 1].push({ text, run: r, w, space: trailing, size });
          lineW += w;
        }
      }
    }
    let used = 0;
    for (const line of lines) {
      while (line.length && !line[0].text.trim()) line.shift();
      const size = line.length ? Math.max(...line.map((wd) => wd.size)) : baseSize;
      const lh = size * (opts.lineGap ?? 1.3);
      if (!line.length) {
        used += lh * 0.6;
        if (!opts.dry) this.y -= lh * 0.6;
        continue;
      }
      used += lh;
      if (opts.dry) continue;
      this.ensure(lh);
      const total = line.reduce((s, wd) => s + wd.w, 0) - (line[line.length - 1]?.space ?? 0);
      let cx = opts.align === "center" ? x + (width - total) / 2 : opts.align === "right" ? x + width - total : x;
      const baseline = this.y - size * 0.95;
      // Draw consecutive words of the same style as one piece of text.
      const groups: { run: Run; text: string; x: number; w: number; size: number }[] = [];
      for (const wd of line) {
        const last = groups[groups.length - 1];
        if (last && last.run === wd.run && last.size === wd.size) {
          last.text += wd.text;
          last.w += wd.w;
        } else groups.push({ run: wd.run, text: wd.text, x: cx, w: wd.w, size: wd.size });
        cx += wd.w;
      }
      for (const g of groups) {
        const font = this.font(g.run);
        const color = g.run.color ? rgb(...g.run.color) : rgb(0.1, 0.1, 0.12);
        const text = g === groups[groups.length - 1] ? g.text.replace(/\s+$/, "") : g.text;
        if (!text.trim()) continue;
        const drawnW = font.widthOfTextAtSize(text.replace(/\s+$/, ""), g.size);
        this.page.drawText(text, { x: g.x, y: baseline, size: g.size, font, color });
        if (g.run.underline) this.page.drawLine({ start: { x: g.x, y: baseline - 1.5 }, end: { x: g.x + drawnW, y: baseline - 1.5 }, thickness: 0.6, color });
        if (g.run.href && /^(https?:|mailto:)/i.test(g.run.href)) this.link(g.x, baseline - 2, drawnW, g.size + 2, g.run.href);
      }
      this.y -= lh;
    }
    return used;
  }

  link(x: number, y: number, w: number, h: number, url: string) {
    const annot = this.doc.context.register(
      this.doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, y, x + w, y + h], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } }),
    );
    const annots = this.page.node.lookup(PDFName.of("Annots"));
    if (annots instanceof PDFArray) annots.push(annot);
    else this.page.node.set(PDFName.of("Annots"), this.doc.context.obj([annot]));
  }

  async image(el: HTMLImageElement, x: number, width: number) {
    const src = el.getAttribute("src") ?? "";
    if (!src.startsWith("data:image/")) return;
    try {
      let bytes: Uint8Array;
      let isJpg = /^data:image\/jpe?g/i.test(src);
      if (/^data:image\/(png|jpe?g)/i.test(src)) bytes = dataUrlToBytes(src);
      else {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = src;
        });
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")!.drawImage(img, 0, 0);
        bytes = dataUrlToBytes(c.toDataURL("image/png"));
        isJpg = false;
      }
      const emb = isJpg ? await this.doc.embedJpg(bytes) : await this.doc.embedPng(bytes);
      const attrW = parseFloat(el.getAttribute("width") ?? "") || emb.width * 0.75;
      let w = Math.min(width, attrW);
      let h = w * (emb.height / emb.width);
      const maxH = this.o.pageHeight - this.o.margin * 2;
      if (h > maxH) {
        h = maxH;
        w = h * (emb.width / emb.height);
      }
      this.ensure(h + 4);
      this.page.drawImage(emb, { x: x + (width - w) / 2, y: this.y - h, width: w, height: h });
      this.y -= h + 8;
    } catch {
      /* unsupported image: skip */
    }
  }

  async table(el: HTMLTableElement, x: number, width: number) {
    const rows = [...el.querySelectorAll(":scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr")] as HTMLTableRowElement[];
    const cols = Math.max(1, ...rows.map((r) => [...r.cells].reduce((s, c) => s + (c.colSpan || 1), 0)));
    const colW = width / cols;
    const size = this.o.fontSize * 0.92;
    const pad = 4;
    this.y -= 4;
    for (const row of rows) {
      const cells = [...row.cells];
      const runsFor = (c: HTMLTableCellElement) => {
        const out: Run[] = [];
        this.runs(c, c.tagName === "TH" ? { text: "", bold: true } : { text: "" }, out);
        return out;
      };
      let col = 0;
      const layout = cells.map((c) => {
        const span = c.colSpan || 1;
        const r = { cell: c, x: x + col * colW, w: colW * span, runs: runsFor(c) };
        col += span;
        return r;
      });
      const h = Math.max(size * 1.4, ...layout.map((c) => this.flow(c.runs, 0, c.w - pad * 2, size, { dry: true }))) + pad * 2;
      this.ensure(h);
      const top = this.y;
      for (const c of layout) {
        if (c.cell.tagName === "TH") this.page.drawRectangle({ x: c.x, y: top - h, width: c.w, height: h, color: rgb(0.94, 0.95, 0.97) });
        this.page.drawRectangle({ x: c.x, y: top - h, width: c.w, height: h, borderColor: rgb(0.7, 0.72, 0.76), borderWidth: 0.6 });
        this.y = top - pad;
        this.flow(c.runs, c.x + pad, c.w - pad * 2, size);
      }
      this.y = top - h;
    }
    this.y -= 8;
  }

  /** Lays out the block-level children of `el`. */
  async blocks(el: Element, indent: number, listState?: { ordered: boolean; n: number }) {
    const x = this.o.margin + indent;
    const width = this.width - indent;
    let inline: Run[] = [];
    const flushInline = () => {
      if (inline.some((r) => r.text.trim())) {
        this.ensure(this.o.fontSize * 1.3);
        this.flow(inline, x, width, this.o.fontSize);
        this.y -= this.o.fontSize * 0.4;
      }
      inline = [];
    };
    for (const node of [...el.childNodes]) {
      if (!(node instanceof HTMLElement) || !BLOCK_TAGS.has(node.tagName)) {
        this.runs(node, { text: "" }, inline);
        continue;
      }
      flushInline();
      const tag = node.tagName;
      const align = (node.getAttribute("align") ?? node.style.textAlign ?? "").toLowerCase() as "left" | "center" | "right";
      if (tag in HEADING_SIZES) {
        const size = this.o.fontSize * HEADING_SIZES[tag];
        this.y -= size * 0.4;
        this.ensure(size * 2.2);
        const r: Run[] = [];
        this.runs(node, { text: "", bold: true, size }, r);
        this.flow(r, x, width, size, { align: tag === "CENTER" ? "center" : align });
        this.y -= size * 0.3;
      } else if (tag === "UL" || tag === "OL") {
        await this.blocks(node, indent + 18, { ordered: tag === "OL", n: parseInt(node.getAttribute("start") ?? "1", 10) || 1 });
        this.y -= 4;
      } else if (tag === "LI") {
        const bullet = listState?.ordered ? `${listState.n++}.` : "•";
        this.ensure(this.o.fontSize * 1.3);
        const top = this.y;
        const f = this.fonts.r;
        this.page.drawText(bullet, { x: x - 14, y: top - this.o.fontSize * 0.95, size: this.o.fontSize, font: f, color: rgb(0.1, 0.1, 0.12) });
        await this.blocks(node, indent, undefined);
      } else if (tag === "TABLE") {
        await this.table(node as HTMLTableElement, x, width);
      } else if (tag === "IMG") {
        await this.image(node as HTMLImageElement, x, width);
      } else if (tag === "HR") {
        this.ensure(10);
        this.page.drawLine({ start: { x, y: this.y - 5 }, end: { x: x + width, y: this.y - 5 }, thickness: 0.7, color: rgb(0.75, 0.75, 0.78) });
        this.y -= 12;
      } else if (tag === "PRE") {
        const text = node.textContent ?? "";
        const runs = text.split("\n").flatMap((line, i) => (i ? [{ text: "\n", code: true }, { text: line, code: true }] : [{ text: line, code: true }]));
        this.flow(runs as Run[], x + 6, width - 12, this.o.fontSize * 0.85, { lineGap: 1.25 });
        this.y -= 6;
      } else if (tag === "BLOCKQUOTE") {
        await this.blocks(node, indent + 24);
      } else if (tag === "P" && !node.querySelector(Array.from(BLOCK_TAGS).filter((t) => t !== "BODY").join(","))) {
        const r: Run[] = [];
        this.runs(node, { text: "" }, r);
        if (r.some((x2) => x2.text.trim())) {
          this.ensure(this.o.fontSize * 1.3);
          this.flow(r, x, width, this.o.fontSize, { align });
          this.y -= this.o.fontSize * 0.5;
        }
        for (const img of node.querySelectorAll("img")) await this.image(img as HTMLImageElement, x, width);
      } else {
        await this.blocks(node, indent, tag === "LI" ? listState : undefined);
      }
    }
    flushInline();
  }
}
