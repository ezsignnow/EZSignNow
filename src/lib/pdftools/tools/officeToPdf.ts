import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { strFromU8, unzipSync } from "fflate";
import { type InputFile, type Options, type OutputFile, type ToolContext, PAGE_SIZES, ToolError, baseName, num, pdfOut, str, tick } from "../core";
import { winAnsiSafe } from "../reportPdf";

/* ───────────────────────── XML / OPC helpers ───────────────────────── */

type Zip = Record<string, Uint8Array>;
type RGB = { r: number; g: number; b: number };

function readZip(file: InputFile, kind: string): Zip {
  try {
    return unzipSync(file.bytes);
  } catch {
    throw new ToolError(`${file.name} isn't a valid ${kind} file. Older formats must be saved in the newer format (${kind === "PowerPoint" ? ".pptx" : ".xlsx"}) first.`);
  }
}

function parseXml(zip: Zip, path: string): Document | null {
  const bytes = zip[path];
  if (!bytes) return null;
  const doc = new DOMParser().parseFromString(strFromU8(bytes), "application/xml");
  return doc.getElementsByTagName("parsererror").length ? null : doc;
}

const kids = (el: Element | Document | null | undefined, name: string): Element[] =>
  el ? (Array.from(el.childNodes).filter((n) => n.nodeType === 1 && (n as Element).localName === name) as Element[]) : [];
const child = (el: Element | Document | null | undefined, name: string) => kids(el, name)[0] ?? null;
const path = (el: Element | Document | null | undefined, ...names: string[]): Element | null => names.reduce<Element | Document | null | undefined>((cur, n) => child(cur, n), el) as Element | null;
const all = (el: Element | Document, name: string): Element[] => Array.from(el.getElementsByTagNameNS("*", name));
const attr = (el: Element | null | undefined, name: string) => el?.getAttribute(name) ?? undefined;
const numAttr = (el: Element | null | undefined, name: string, dflt = 0) => {
  const v = parseFloat(attr(el, name) ?? "");
  return Number.isFinite(v) ? v : dflt;
};

function dirOf(p: string) {
  return p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
}

function resolvePart(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = (base ? base.split("/") : []).concat(target.split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

interface Rel {
  type: string;
  target: string;
}

function readRels(zip: Zip, part: string): Map<string, Rel> {
  const dir = dirOf(part);
  const relsPath = `${dir ? `${dir}/` : ""}_rels/${part.slice(dir ? dir.length + 1 : 0)}.rels`;
  const doc = parseXml(zip, relsPath);
  const map = new Map<string, Rel>();
  if (!doc) return map;
  for (const r of all(doc, "Relationship")) {
    map.set(r.getAttribute("Id") ?? "", { type: r.getAttribute("Type") ?? "", target: resolvePart(dir, r.getAttribute("Target") ?? "") });
  }
  return map;
}

/* ───────────────────────── Colours ───────────────────────── */

const hex = (h: string): RGB => ({ r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 });

function rgbToHsl({ r, g, b }: RGB) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): RGB {
  if (!s) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return { r: f(h + 1 / 3), g: f(h), b: f(h - 1 / 3) };
}

/* ───────────────────────── PowerPoint → PDF ───────────────────────── */

const EMU = 12700;

interface Xform {
  ox: number;
  oy: number;
  sx: number;
  sy: number;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PptxEnv {
  zip: Zip;
  theme: Record<string, RGB>;
  clrMap: Record<string, string>;
  masterDoc: Document | null;
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont };
  doc: PDFDocument;
  unsupported: { images: number; charts: number };
  replaced: number;
  /** Pictures collected while laying out, embedded afterwards so repeated images are stored once. */
  pending: { page: PDFPage; pageH: number; box: Box; bytes: Uint8Array; key: string }[];
}

function loadTheme(zip: Zip, masterPath: string | undefined): Record<string, RGB> {
  const out: Record<string, RGB> = { dk1: hex("000000"), lt1: hex("ffffff"), dk2: hex("44546a"), lt2: hex("e7e6e6"), accent1: hex("4472c4"), accent2: hex("ed7d31"), accent3: hex("a5a5a5"), accent4: hex("ffc000"), accent5: hex("5b9bd5"), accent6: hex("70ad47"), hlink: hex("0563c1"), folHlink: hex("954f72") };
  const themePath = masterPath ? [...readRels(zip, masterPath).values()].find((r) => r.type.endsWith("/theme"))?.target : undefined;
  const doc = parseXml(zip, themePath ?? "ppt/theme/theme1.xml");
  const scheme = doc ? all(doc, "clrScheme")[0] : null;
  if (!scheme) return out;
  for (const c of Array.from(scheme.children)) {
    const v = child(c, "srgbClr")?.getAttribute("val") ?? child(c, "sysClr")?.getAttribute("lastClr");
    if (v) out[c.localName] = hex(v);
  }
  return out;
}

function colorOf(holder: Element | null | undefined, env: PptxEnv): RGB | null {
  if (!holder) return null;
  const c = child(holder, "srgbClr") ?? child(holder, "schemeClr") ?? child(holder, "sysClr") ?? child(holder, "prstClr");
  if (!c) return null;
  let col: RGB;
  if (c.localName === "srgbClr") col = hex(c.getAttribute("val") ?? "000000");
  else if (c.localName === "sysClr") col = hex(c.getAttribute("lastClr") ?? "000000");
  else if (c.localName === "prstClr") col = c.getAttribute("val") === "white" ? hex("ffffff") : hex("000000");
  else {
    const name = c.getAttribute("val") ?? "tx1";
    col = env.theme[env.clrMap[name] ?? name] ?? hex("000000");
  }
  const lumMod = numAttr(child(c, "lumMod"), "val", 100000) / 100000;
  const lumOff = numAttr(child(c, "lumOff"), "val", 0) / 100000;
  if (lumMod !== 1 || lumOff) {
    const hsl = rgbToHsl(col);
    col = hslToRgb({ ...hsl, l: Math.min(1, Math.max(0, hsl.l * lumMod + lumOff)) });
  }
  return col;
}

const fillOf = (spPr: Element | null | undefined, env: PptxEnv) => colorOf(child(spPr, "solidFill"), env);

function xfrmBox(xfrm: Element | null, t: Xform): Box | null {
  if (!xfrm) return null;
  const off = child(xfrm, "off");
  const ext = child(xfrm, "ext");
  if (!off || !ext) return null;
  return { x: (t.ox + numAttr(off, "x") * t.sx) / EMU, y: (t.oy + numAttr(off, "y") * t.sy) / EMU, w: (numAttr(ext, "cx") * t.sx) / EMU, h: (numAttr(ext, "cy") * t.sy) / EMU };
}

function placeholderOf(sp: Element): Element | null {
  return path(sp, "nvSpPr", "nvPr", "ph") ?? path(sp, "nvPicPr", "nvPr", "ph") ?? path(sp, "nvGraphicFramePr", "nvPr", "ph");
}

/** Finds the matching placeholder's position on the layout or master when a shape doesn't carry its own. */
function inheritedXfrm(ph: Element, docs: (Document | null)[]): Element | null {
  const norm = (t: string | undefined, idx: string | undefined) => {
    const eff = t ?? (idx ? "body" : "title");
    return eff === "ctrTitle" ? "title" : eff === "subTitle" ? "body" : eff;
  };
  const type = norm(attr(ph, "type"), attr(ph, "idx"));
  const idx = attr(ph, "idx");
  for (const d of docs) {
    if (!d) continue;
    for (const sp of all(d, "sp")) {
      const p = placeholderOf(sp);
      if (!p) continue;
      const pIdx = attr(p, "idx");
      const same = idx && pIdx ? idx === pIdx : norm(attr(p, "type"), pIdx) === type;
      if (same) {
        const x = path(sp, "spPr", "xfrm");
        if (x) return x;
      }
    }
  }
  return null;
}

function defaultSize(env: PptxEnv, phType: string | undefined, lvl: number): { size: number; color: RGB | null } {
  const styles = env.masterDoc ? all(env.masterDoc, "txStyles")[0] : null;
  const group = phType === "title" || phType === "ctrTitle" ? "titleStyle" : phType ? "bodyStyle" : "otherStyle";
  const def = path(styles, group, `lvl${lvl + 1}pPr`, "defRPr");
  const size = numAttr(def, "sz", 0) / 100 || (phType === "title" || phType === "ctrTitle" ? 36 : phType === "subTitle" ? 20 : phType ? 20 : 18);
  return { size, color: colorOf(child(def, "solidFill"), env) };
}

interface Token {
  text: string;
  font: PDFFont;
  size: number;
  color: RGB;
  br?: boolean;
}

function pickFont(env: PptxEnv, bold: boolean, italic: boolean) {
  return bold ? (italic ? env.fonts.boldItalic : env.fonts.bold) : italic ? env.fonts.italic : env.fonts.regular;
}

interface ParaLayout {
  lines: Token[][];
  align: string;
  /** Left margin of wrapped lines. */
  indent: number;
  /** Left edge of the first line (a bullet hangs out to the left of the text). */
  firstIndent: number;
  lineH: number;
  before: number;
  after: number;
}

function layoutText(txBody: Element, width: number, env: PptxEnv, phType: string | undefined, scale: number): ParaLayout[] {
  const paras: ParaLayout[] = [];
  const isBodyPh = !!phType && phType !== "title" && phType !== "ctrTitle" && phType !== "subTitle" && phType !== "dt" && phType !== "ftr" && phType !== "sldNum";
  let autoNum = 0;
  for (const p of kids(txBody, "p")) {
    const pPr = child(p, "pPr");
    const lvl = Math.min(8, numAttr(pPr, "lvl", 0));
    const base = defaultSize(env, phType, lvl);
    const marL = numAttr(pPr, "marL", isBodyPh ? 342900 * (lvl + 1) : 0) / EMU;
    const hang = numAttr(pPr, "indent", isBodyPh ? -342900 : 0) / EMU;
    const align = attr(pPr, "algn") ?? (phType === "ctrTitle" || phType === "subTitle" ? "ctr" : "l");
    const tokens: Token[] = [];
    const hasBullet = !child(pPr, "buNone") && (!!child(pPr, "buChar") || !!child(pPr, "buAutoNum") || (isBodyPh && !child(pPr, "buNone")));
    const runs = Array.from(p.children).filter((c) => ["r", "br", "fld"].includes(c.localName));
    let firstSize = base.size;
    for (const r of runs) {
      if (r.localName === "br") {
        tokens.push({ text: "", font: env.fonts.regular, size: base.size * scale, color: env.theme.dk1, br: true });
        continue;
      }
      const rPr = child(r, "rPr");
      const size = (numAttr(rPr, "sz", 0) / 100 || base.size) * scale;
      const color = colorOf(child(rPr, "solidFill"), env) ?? base.color ?? env.theme.dk1;
      const font = pickFont(env, attr(rPr, "b") === "1", attr(rPr, "i") === "1");
      // eslint-disable-next-line no-control-regex
      const raw = (child(r, "t")?.textContent ?? "").replace(/\u000b/g, "\n");
      const safe = winAnsiSafe(font, raw);
      env.replaced += safe.replaced;
      if (!tokens.length) firstSize = size / scale;
      for (const piece of safe.text.split(/(\s+)/)) if (piece) tokens.push({ text: piece, font, size, color });
    }
    if (!tokens.length) tokens.push({ text: "", font: env.fonts.regular, size: base.size * scale, color: env.theme.dk1 });
    const size0 = (tokens.find((t) => t.text)?.size ?? firstSize * scale) || 12;
    let prefix: Token | null = null;
    if (hasBullet && tokens.some((t) => t.text.trim())) {
      let bullet = "•";
      if (child(pPr, "buAutoNum")) bullet = `${++autoNum}.`;
      else {
        autoNum = 0;
        const ch = attr(child(pPr, "buChar"), "char");
        if (ch) bullet = ch;
      }
      const f = env.fonts.regular;
      const safe = winAnsiSafe(f, `${bullet} `);
      prefix = { text: safe.text, font: f, size: size0, color: tokens.find((t) => t.text)?.color ?? env.theme.dk1 };
    } else autoNum = 0;

    // Wrap into lines.
    const avail = Math.max(10, width - Math.max(0, marL));
    const lines: Token[][] = [];
    let line: Token[] = [];
    let used = 0;
    const flush = () => {
      lines.push(line);
      line = [];
      used = 0;
    };
    for (const t of tokens) {
      if (t.br) {
        flush();
        continue;
      }
      const w = t.font.widthOfTextAtSize(t.text, t.size);
      if (used + w > avail && used > 0 && t.text.trim()) flush();
      if (!used && !t.text.trim() && lines.length) continue;
      line.push(t);
      used += w;
    }
    flush();
    const spc = numAttr(path(pPr, "lnSpc", "spcPct"), "val", 100000) / 100000;
    const before = numAttr(path(pPr, "spcBef", "spcPts"), "val", 0) / 100;
    const after = numAttr(path(pPr, "spcAft", "spcPts"), "val", 0) / 100;
    paras.push({
      lines: prefix ? [[prefix, ...lines[0]], ...lines.slice(1)] : lines,
      align,
      indent: Math.max(0, marL),
      firstIndent: Math.max(0, prefix ? marL + hang : marL),
      lineH: size0 * 1.2 * spc,
      before,
      after,
    });
  }
  return paras;
}

function textHeight(paras: ParaLayout[]) {
  return paras.reduce((s, p) => s + p.before + p.after + p.lines.length * p.lineH, 0);
}

function drawTextBody(page: PDFPage, pageH: number, txBody: Element, box: Box, env: PptxEnv, phType: string | undefined) {
  const bodyPr = child(txBody, "bodyPr");
  const lIns = numAttr(bodyPr, "lIns", 91440) / EMU;
  const rIns = numAttr(bodyPr, "rIns", 91440) / EMU;
  const tIns = numAttr(bodyPr, "tIns", 45720) / EMU;
  const bIns = numAttr(bodyPr, "bIns", 45720) / EMU;
  const innerW = Math.max(10, box.w - lIns - rIns);
  const innerH = Math.max(10, box.h - tIns - bIns);
  const fontScale = numAttr(child(bodyPr, "normAutofit"), "fontScale", 100000) / 100000;
  let scale = fontScale;
  let paras = layoutText(txBody, innerW, env, phType, scale);
  for (let i = 0; i < 6 && textHeight(paras) > innerH * 1.02 && scale > 0.45; i++) {
    scale *= Math.max(0.6, Math.sqrt(innerH / textHeight(paras)));
    paras = layoutText(txBody, innerW, env, phType, scale);
  }
  const anchor = attr(bodyPr, "anchor") ?? (phType === "ctrTitle" || phType === "title" ? "ctr" : "t");
  const total = textHeight(paras);
  let top = box.y + tIns + (anchor === "ctr" ? Math.max(0, (innerH - total) / 2) : anchor === "b" ? Math.max(0, innerH - total) : 0);
  for (const p of paras) {
    top += p.before;
    for (let li = 0; li < p.lines.length; li++) {
      const line = p.lines[li];
      const maxSize = Math.max(...line.map((t) => t.size), 1);
      const lineW = line.reduce((s, t) => s + t.font.widthOfTextAtSize(t.text, t.size), 0);
      const left = li === 0 ? p.firstIndent : p.indent;
      const startX = box.x + lIns + left;
      const avail = innerW - left;
      let x = p.align === "ctr" ? startX + (avail - lineW) / 2 : p.align === "r" ? startX + avail - lineW : startX;
      const baseline = pageH - (top + (p.lineH - maxSize * 1.2) / 2 + maxSize * 0.95);
      for (const t of line) {
        if (t.text.trim() || t.text) {
          try {
            page.drawText(t.text, { x, y: baseline, size: t.size, font: t.font, color: rgb(t.color.r, t.color.g, t.color.b) });
          } catch {
            /* a character slipped past encoding; skip the fragment */
          }
        }
        x += t.font.widthOfTextAtSize(t.text, t.size);
      }
      top += p.lineH;
    }
    top += p.after;
  }
}

function drawShapeTree(tree: Element, page: PDFPage, pageH: number, env: PptxEnv, slideRels: Map<string, Rel>, parents: (Document | null)[], t: Xform) {
  for (const node of Array.from(tree.children)) {
    const name = node.localName;
    if (name === "grpSp") {
      const gx = path(node, "grpSpPr", "xfrm");
      const off = child(gx, "off");
      const ext = child(gx, "ext");
      const chOff = child(gx, "chOff");
      const chExt = child(gx, "chExt");
      if (off && ext && chOff && chExt && numAttr(chExt, "cx") && numAttr(chExt, "cy")) {
        const gxAbs = t.ox + numAttr(off, "x") * t.sx;
        const gyAbs = t.oy + numAttr(off, "y") * t.sy;
        const sx = (numAttr(ext, "cx") * t.sx) / numAttr(chExt, "cx");
        const sy = (numAttr(ext, "cy") * t.sy) / numAttr(chExt, "cy");
        drawShapeTree(node, page, pageH, env, slideRels, parents, { ox: gxAbs - numAttr(chOff, "x") * sx, oy: gyAbs - numAttr(chOff, "y") * sy, sx, sy });
      } else drawShapeTree(node, page, pageH, env, slideRels, parents, t);
      continue;
    }
    if (name === "sp" || name === "cxnSp") {
      const spPr = child(node, "spPr");
      const ph = placeholderOf(node);
      const xfrm = child(spPr, "xfrm") ?? (ph ? inheritedXfrm(ph, parents) : null);
      const box = xfrmBox(xfrm, ph && !child(spPr, "xfrm") ? { ox: 0, oy: 0, sx: 1, sy: 1 } : t);
      if (!box) continue;
      const fill = fillOf(spPr, env);
      const lnEl = child(spPr, "ln");
      const line = child(lnEl, "noFill") ? null : colorOf(child(lnEl, "solidFill"), env);
      const lineW = Math.max(0.5, numAttr(lnEl, "w", 9525) / EMU);
      const geom = attr(child(spPr, "prstGeom"), "prst");
      const y = pageH - box.y - box.h;
      if (name === "cxnSp" || geom === "line" || geom === "straightConnector1") {
        const flipH = attr(xfrm, "flipH") === "1";
        const flipV = attr(xfrm, "flipV") === "1";
        const c = line ?? env.theme.dk1;
        page.drawLine({ start: { x: flipH ? box.x + box.w : box.x, y: flipV ? y + box.h : y }, end: { x: flipH ? box.x : box.x + box.w, y: flipV ? y : y + box.h }, thickness: lineW, color: rgb(c.r, c.g, c.b) });
        continue;
      }
      if (fill || line) {
        if (geom === "ellipse") page.drawEllipse({ x: box.x + box.w / 2, y: y + box.h / 2, xScale: box.w / 2, yScale: box.h / 2, color: fill ? rgb(fill.r, fill.g, fill.b) : undefined, borderColor: line ? rgb(line.r, line.g, line.b) : undefined, borderWidth: line ? lineW : 0 });
        else page.drawRectangle({ x: box.x, y, width: box.w, height: box.h, color: fill ? rgb(fill.r, fill.g, fill.b) : undefined, borderColor: line ? rgb(line.r, line.g, line.b) : undefined, borderWidth: line ? lineW : 0 });
      }
      const txBody = child(node, "txBody");
      if (txBody && all(txBody, "t").some((x) => x.textContent?.trim())) drawTextBody(page, pageH, txBody, box, env, attr(ph, "type") ?? (ph ? "body" : undefined));
      continue;
    }
    if (name === "pic") {
      const box = xfrmBox(path(node, "spPr", "xfrm"), t) ?? (placeholderOf(node) ? xfrmBox(inheritedXfrm(placeholderOf(node)!, parents), { ox: 0, oy: 0, sx: 1, sy: 1 }) : null);
      const rid = attr(path(node, "blipFill", "blip"), "r:embed") ?? Array.from(path(node, "blipFill", "blip")?.attributes ?? []).find((a) => a.localName === "embed")?.value;
      const rel = rid ? slideRels.get(rid) : undefined;
      const bytes = rel ? env.zip[rel.target] : undefined;
      if (!box || !bytes) continue;
      env.pending.push({ page, pageH, box, bytes, key: rel!.target });
      continue;
    }
    if (name === "graphicFrame") {
      const box = xfrmBox(child(node, "xfrm"), t);
      const tbl = all(node, "tbl")[0];
      if (!box) continue;
      if (!tbl) {
        if (all(node, "chart").length) env.unsupported.charts++;
        continue;
      }
      const cols = all(tbl, "gridCol").map((c) => numAttr(c, "w") / EMU);
      let top = box.y;
      for (const tr of kids(tbl, "tr")) {
        const h = numAttr(tr, "h") / EMU || 20;
        let left = box.x;
        const cells = kids(tr, "tc");
        for (let ci = 0; ci < cells.length; ci++) {
          const w = cols[ci] ?? box.w / cells.length;
          const tc = cells[ci];
          const cellFill = fillOf(child(tc, "tcPr"), env);
          page.drawRectangle({ x: left, y: pageH - top - h, width: w, height: h, color: cellFill ? rgb(cellFill.r, cellFill.g, cellFill.b) : undefined, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.5 });
          const body = child(tc, "txBody");
          if (body) drawTextBody(page, pageH, body, { x: left, y: top, w, h }, env, undefined);
          left += w;
        }
        top += h;
      }
    }
  }
}

export async function pptxToPdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    ctx.progress(`Reading ${f.name}`);
    const zip = readZip(f, "PowerPoint");
    const pres = parseXml(zip, "ppt/presentation.xml");
    if (!pres) throw new ToolError(`${f.name} isn't a valid PowerPoint file.`);
    const presRels = readRels(zip, "ppt/presentation.xml");
    const sz = all(pres, "sldSz")[0];
    const W = numAttr(sz, "cx", 9144000) / EMU;
    const H = numAttr(sz, "cy", 6858000) / EMU;
    const slideIds = all(pres, "sldId")
      .map((s) => Array.from(s.attributes).find((a) => a.localName === "id" && a.prefix === "r")?.value)
      .filter(Boolean) as string[];
    const slidePaths = slideIds.map((id) => presRels.get(id)?.target).filter((p): p is string => !!p && !!zip[p]);
    if (!slidePaths.length) throw new ToolError(`No slides were found in ${f.name}.`);

    const doc = await PDFDocument.create();
    const fonts = {
      regular: await doc.embedFont(StandardFonts.Helvetica),
      bold: await doc.embedFont(StandardFonts.HelveticaBold),
      italic: await doc.embedFont(StandardFonts.HelveticaOblique),
      boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    };
    const masterPath = [...presRels.values()].find((r) => r.type.endsWith("/slideMaster"))?.target;
    const masterDoc = masterPath ? parseXml(zip, masterPath) : null;
    const clrMapEl = masterDoc ? all(masterDoc, "clrMap")[0] : null;
    const clrMap: Record<string, string> = { bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2" };
    if (clrMapEl) for (const a of Array.from(clrMapEl.attributes)) clrMap[a.name] = a.value;
    const env: PptxEnv = { zip, theme: loadTheme(zip, masterPath), clrMap, masterDoc, fonts, doc, unsupported: { images: 0, charts: 0 }, replaced: 0, pending: [] };

    for (let i = 0; i < slidePaths.length; i++) {
      ctx.progress(`Slide ${i + 1} of ${slidePaths.length}`, i / slidePaths.length);
      const slideDoc = parseXml(zip, slidePaths[i])!;
      const rels = readRels(zip, slidePaths[i]);
      const layoutPath = [...rels.values()].find((r) => r.type.endsWith("/slideLayout"))?.target;
      const layoutDoc = layoutPath ? parseXml(zip, layoutPath) : null;
      const page = doc.addPage([W, H]);

      // Background: slide → layout → master, falling back to white.
      let bg: RGB | null = null;
      for (const d of [slideDoc, layoutDoc, masterDoc]) {
        const bgPr = d ? path(all(d, "cSld")[0], "bg", "bgPr") : null;
        bg = fillOf(bgPr, env);
        if (bg) break;
      }
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg ? rgb(bg.r, bg.g, bg.b) : rgb(1, 1, 1) });

      const tree = path(all(slideDoc, "cSld")[0], "spTree");
      if (tree) drawShapeTree(tree, page, H, env, rels, [layoutDoc, masterDoc], { ox: 0, oy: 0, sx: 1, sy: 1 });
      await tick();
    }

    // Images are embedded after layout so each distinct file is embedded once.
    const cache = new Map<string, Awaited<ReturnType<PDFDocument["embedPng"]>> | null>();
    for (const it of env.pending) {
      if (!cache.has(it.key)) {
        const lower = it.key.toLowerCase();
        let emb = null;
        try {
          emb = /\.png$/.test(lower) ? await doc.embedPng(it.bytes) : /\.jpe?g$/.test(lower) ? await doc.embedJpg(it.bytes) : null;
        } catch {
          emb = null;
        }
        cache.set(it.key, emb);
      }
      const img = cache.get(it.key) ?? null;
      if (!img) {
        env.unsupported.images++;
        continue;
      }
      it.page.drawImage(img, { x: it.box.x, y: it.pageH - it.box.y - it.box.h, width: it.box.w, height: it.box.h });
    }

    if (env.unsupported.images) ctx.note?.(`${env.unsupported.images} picture(s) in a format PDF can't hold directly (such as EMF, SVG or GIF) were left out.`);
    if (env.unsupported.charts) ctx.note?.(`${env.unsupported.charts} chart(s) can't be drawn yet and were left out.`);
    if (env.replaced) ctx.note?.(`${env.replaced} character(s) outside the Latin alphabet were shown as “?”. Slides with other scripts are best exported from PowerPoint.`);
    ctx.note?.("Animations, SmartArt and some effects aren't reproduced.");
    outs.push(pdfOut(baseName(f.name), await doc.save({ useObjectStreams: true })));
  }
  return outs;
}

/* ───────────────────────── Excel → PDF ───────────────────────── */

export interface SheetData {
  name: string;
  rows: string[][];
  colWidths: number[];
  bold: boolean[][];
  numeric: boolean[][];
}

const BUILTIN_DATE_FMTS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function excelDate(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  const time = serial % 1 ? ` ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : "";
  return date + time;
}

export function formatNumber(v: number, fmt: string | undefined, id: number): string {
  const clean = (fmt ?? "").replace(/"[^"]*"|\[[^\]]*\]|\\./g, "");
  const isGeneral = !clean || /^(general|standard)$/i.test(clean);
  if (BUILTIN_DATE_FMTS.has(id) || (!isGeneral && /[dmyh]/i.test(clean) && !/[0#]/.test(clean))) return excelDate(v);
  if (id === 9) return `${Math.round(v * 100)}%`;
  if (id === 10) return `${(v * 100).toFixed(2)}%`;
  if (!isGeneral) {
    const decimals = /\.(0+)/.exec(clean)?.[1].length ?? 0;
    const pct = clean.includes("%");
    const val = pct ? v * 100 : v;
    const [int, frac] = Math.abs(val).toFixed(decimals).split(".");
    const grouped = clean.includes(",") ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : int;
    const prefix = /[$€£¥₹]/.exec(fmt ?? "")?.[0] ?? "";
    return `${val < 0 ? "-" : ""}${prefix}${grouped}${frac ? `.${frac}` : ""}${pct ? "%" : ""}`;
  }
  if (id === 1) return String(Math.round(v));
  if (id === 2) return v.toFixed(2);
  if (id === 3) return Math.round(v).toLocaleString("en-US");
  if (id === 4) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // General: avoid long binary-float tails.
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e10) / 1e10);
}

function colIndex(ref: string): number {
  let n = 0;
  for (const ch of /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? "A") n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

/** Reads every worksheet of an .xlsx into plain rows of display text. */
export function readWorkbook(zip: Zip): SheetData[] {
  const wb = parseXml(zip, "xl/workbook.xml");
  if (!wb) throw new ToolError("This isn't a valid Excel workbook.");
  const rels = readRels(zip, "xl/workbook.xml");
  const shared: string[] = [];
  const sst = parseXml(zip, "xl/sharedStrings.xml");
  if (sst) for (const si of all(sst, "si")) shared.push(all(si, "t").map((t) => t.textContent ?? "").join(""));

  const fmtById = new Map<number, string>();
  const xfs: { numFmtId: number; fontId: number }[] = [];
  const boldFonts: boolean[] = [];
  const styles = parseXml(zip, "xl/styles.xml");
  if (styles) {
    for (const nf of all(styles, "numFmt")) fmtById.set(numAttr(nf, "numFmtId"), nf.getAttribute("formatCode") ?? "");
    const fontsEl = all(styles, "fonts")[0];
    for (const fnt of kids(fontsEl, "font")) boldFonts.push(!!child(fnt, "b"));
    const cellXfs = all(styles, "cellXfs")[0];
    for (const xf of kids(cellXfs, "xf")) xfs.push({ numFmtId: numAttr(xf, "numFmtId"), fontId: numAttr(xf, "fontId") });
  }

  const sheets: SheetData[] = [];
  for (const s of all(wb, "sheet")) {
    const rid = Array.from(s.attributes).find((a) => a.localName === "id" && a.prefix === "r")?.value ?? "";
    const target = rels.get(rid)?.target;
    const sheetDoc = target ? parseXml(zip, target) : null;
    if (!sheetDoc) continue;
    const rows: string[][] = [];
    const bold: boolean[][] = [];
    const numeric: boolean[][] = [];
    for (const row of all(sheetDoc, "row")) {
      const r = numAttr(row, "r", rows.length + 1) - 1;
      for (const c of kids(row, "c")) {
        const col = colIndex(c.getAttribute("r") ?? "A");
        const t = c.getAttribute("t");
        const xf = xfs[numAttr(c, "s", 0)];
        const v = child(c, "v")?.textContent ?? "";
        let text = "";
        let isNum = false;
        if (t === "s") text = shared[parseInt(v, 10)] ?? "";
        else if (t === "inlineStr") text = all(c, "t").map((x) => x.textContent ?? "").join("");
        else if (t === "b") text = v === "1" ? "TRUE" : "FALSE";
        else if (t === "str" || t === "e") text = v;
        else if (v !== "") {
          const n = parseFloat(v);
          text = Number.isFinite(n) ? formatNumber(n, xf ? fmtById.get(xf.numFmtId) : undefined, xf?.numFmtId ?? 0) : v;
          isNum = Number.isFinite(n);
        }
        if (text === "" && !xf) continue;
        (rows[r] ??= [])[col] = text;
        (bold[r] ??= [])[col] = xf ? !!boldFonts[xf.fontId] : false;
        (numeric[r] ??= [])[col] = isNum;
      }
    }
    const widths: number[] = [];
    for (const c of all(sheetDoc, "col")) {
      const min = numAttr(c, "min", 1) - 1;
      const max = Math.min(numAttr(c, "max", 1) - 1, min + 200);
      for (let i = min; i <= max; i++) widths[i] = numAttr(c, "width", 8.43);
    }
    const dense = Array.from({ length: rows.length }, (_, i) => rows[i] ?? []);
    sheets.push({ name: s.getAttribute("name") ?? `Sheet${sheets.length + 1}`, rows: dense, colWidths: widths, bold, numeric });
  }
  return sheets;
}

export async function xlsxToPdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    ctx.progress(`Reading ${f.name}`);
    const sheets = readWorkbook(readZip(f, "Excel")).filter((s) => s.rows.some((r) => r.some((c) => c !== undefined && c !== "")));
    if (!sheets.length) throw new ToolError(`${f.name} has no data to convert.`);

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const [pw0, ph0] = PAGE_SIZES[str(o.pageSize, "A4")] ?? PAGE_SIZES.A4;
    const gridlines = o.gridlines !== false;
    const margin = 28;
    let replaced = 0;
    let truncated = 0;

    for (let si = 0; si < sheets.length; si++) {
      const s = sheets[si];
      ctx.progress(`Sheet “${s.name}”`, si / sheets.length);
      const nCols = Math.max(...s.rows.map((r) => r.length), 1);
      const rawW = Array.from({ length: nCols }, (_, i) => {
        const w = s.colWidths[i];
        if (w) return w * 5.4 + 4;
        const longest = Math.max(4, ...s.rows.map((r) => (r[i] ?? "").length));
        return Math.min(220, longest * 5 + 8);
      });
      const naturalW = rawW.reduce((a, b) => a + b, 0);
      const orient = str(o.orientation, "auto");
      const landscape = orient === "landscape" || (orient === "auto" && naturalW > pw0 - margin * 2);
      const [PW, PH] = landscape ? [ph0, pw0] : [pw0, ph0];
      const usable = PW - margin * 2;
      const fit = o.fit !== "none" && naturalW > usable;
      const scale = fit ? usable / naturalW : 1;
      const colW = rawW.map((w) => w * scale);
      const fontSize = Math.max(5.5, Math.min(10, 9 * Math.max(scale, 0.65)));
      const rowH = fontSize * 1.9;

      // Split columns into horizontal bands when not fitting to page width.
      const bands: [number, number][] = [];
      if (fit || naturalW <= usable) bands.push([0, nCols]);
      else {
        let start = 0;
        let acc = 0;
        for (let c = 0; c < nCols; c++) {
          if (acc + colW[c] > usable + 0.01 && c > start) {
            bands.push([start, c]);
            start = c;
            acc = 0;
          }
          acc += colW[c];
        }
        bands.push([start, nCols]);
      }

      const headerRow = o.headerRow !== false;
      for (const [c0, c1] of bands) {
        let page: PDFPage | null = null;
        let y = 0;
        const startPage = (first: boolean) => {
          page = doc.addPage([PW, PH]);
          y = PH - margin;
          const title = winAnsiSafe(boldFont, `${s.name}${bands.length > 1 ? ` (columns ${c0 + 1}–${c1})` : ""}`);
          replaced += title.replaced;
          page.drawText(title.text, { x: margin, y: y - 9, size: 9, font: boldFont, color: rgb(0.35, 0.4, 0.5) });
          y -= 18;
          if (!first && headerRow && s.rows[0]) drawRow(0);
        };
        const drawRow = (r: number) => {
          if (!page) return;
          let x = margin;
          for (let c = c0; c < c1; c++) {
            const w = colW[c];
            const isHeader = headerRow && r === 0;
            if (isHeader) page.drawRectangle({ x, y: y - rowH, width: w, height: rowH, color: rgb(0.93, 0.95, 0.98) });
            if (gridlines) page.drawRectangle({ x, y: y - rowH, width: w, height: rowH, borderColor: rgb(0.8, 0.82, 0.86), borderWidth: 0.4 });
            let text = s.rows[r]?.[c] ?? "";
            if (text) {
              const fnt = isHeader || s.bold[r]?.[c] ? boldFont : font;
              const safe = winAnsiSafe(fnt, text.replace(/\s+/g, " "));
              replaced += safe.replaced;
              text = safe.text;
              const maxW = w - 6;
              if (fnt.widthOfTextAtSize(text, fontSize) > maxW) {
                truncated++;
                while (text.length > 1 && fnt.widthOfTextAtSize(`${text}…`, fontSize) > maxW) text = text.slice(0, -1);
                text += "…";
              }
              const tw = fnt.widthOfTextAtSize(text, fontSize);
              const tx = s.numeric[r]?.[c] ? x + w - 3 - tw : x + 3;
              page.drawText(text, { x: tx, y: y - rowH + (rowH - fontSize) / 2 + fontSize * 0.15, size: fontSize, font: fnt, color: rgb(0.1, 0.12, 0.16) });
            }
            x += w;
          }
          y -= rowH;
        };
        startPage(true);
        for (let r = 0; r < s.rows.length; r++) {
          if (y - rowH < margin) startPage(false);
          drawRow(r);
        }
      }
      await tick();
    }
    if (replaced) ctx.note?.(`${replaced} character(s) outside the Latin alphabet were shown as “?”.`);
    if (truncated) ctx.note?.(`${truncated} cell(s) were too wide for their column and are shown cut off with “…”. Choose “Fit all columns on the page” off, or a larger page, to give columns more room.`);
    ctx.note?.("Charts, images and merged-cell formatting aren't reproduced.");
    outs.push(pdfOut(baseName(f.name), await doc.save({ useObjectStreams: true })));
  }
  return outs;
}
