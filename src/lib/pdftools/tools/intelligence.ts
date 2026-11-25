import { rgb } from "pdf-lib";
import { type InputFile, type Options, type OutputFile, type ToolContext, ToolError, baseName, pdfOut, str, tick } from "../core";
import { type TextLine, pageLines, paragraphs } from "../textModel";
import { pdfjsFor } from "./render";
import { AiError, AiUnavailableError, callAi } from "../ai";
import { ReportWriter, isWinAnsiText } from "../reportPdf";
import { type DocxBlock, buildDocx } from "../office";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/* ───────────────────────── PDF → Markdown ───────────────────────── */

export interface MdPage {
  lines: TextLine[];
  width: number;
}

const BULLET = /^([•●▪◦‣▸►■□○\-–—*])\s+(.*)$/;
const NUMBERED = /^(\d{1,3})[.)]\s+(.*)$/;

const escMd = (s: string) => s.replace(/([\\`*_])/g, "\\$1").replace(/^([#>])/, "\\$1");
const escCell = (s: string) => escMd(s).replace(/\|/g, "\\|");

function median(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 10;
}

/** Joins wrapped lines, healing words hyphenated at a line end. */
function joinLines(lines: string[]): string {
  return lines.reduce((acc, l) => (!acc ? l : /[a-z]-$/.test(acc) && /^[a-z]/.test(l) ? acc.slice(0, -1) + l : `${acc} ${l}`), "").replace(/\s+/g, " ").trim();
}

/** Turns positioned text lines into Markdown: headings, lists, tables and paragraphs. */
export function linesToMarkdown(pages: MdPage[], opts: { pageMarkers?: boolean } = {}): string {
  const out: string[] = [];
  const bodySize = median(pages.flatMap((p) => p.lines.map((l) => l.size)));
  pages.forEach((page, pi) => {
    if (opts.pageMarkers && out.length) out.push(`<!-- Page ${pi + 1} -->`);
    const lines = page.lines;
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      const ratio = l.size / bodySize;

      // Table: 3+ consecutive lines with the same number (≥2) of aligned cells.
      if (l.pieces.length >= 2) {
        let j = i;
        while (j + 1 < lines.length && lines[j + 1].pieces.length === l.pieces.length && lines[j + 1].y - lines[j].y < l.size * 2.6) j++;
        if (j - i >= 2) {
          const rows = lines.slice(i, j + 1).map((r) => r.pieces.map((p) => escCell(p.text)));
          out.push(`| ${rows[0].join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map((r) => `| ${r.join(" | ")} |`), "");
          i = j + 1;
          continue;
        }
      }

      // Heading: merge neighbouring lines of the same large size.
      if (ratio >= 1.15 && l.text.length < 140) {
        const level = ratio >= 1.6 ? 1 : ratio >= 1.35 ? 2 : 3;
        const parts = [l.text];
        while (i + 1 < lines.length && Math.abs(lines[i + 1].size - l.size) < 0.6 && lines[i + 1].y - lines[i].y < l.size * 1.8) parts.push(lines[++i].text);
        out.push(`${"#".repeat(level)} ${escMd(joinLines(parts))}`, "");
        i++;
        continue;
      }

      // List item (with wrapped continuation lines).
      const bullet = BULLET.exec(l.text);
      const numbered = bullet ? null : NUMBERED.exec(l.text);
      if (bullet || numbered) {
        const parts = [(bullet ?? numbered)![2]];
        while (i + 1 < lines.length && !BULLET.test(lines[i + 1].text) && !NUMBERED.test(lines[i + 1].text) && lines[i + 1].x > l.x + 2 && lines[i + 1].y - lines[i].y < l.size * 1.8 && lines[i + 1].pieces.length < 2) parts.push(lines[++i].text);
        out.push(`${bullet ? "-" : `${numbered![1]}.`} ${escMd(joinLines(parts))}`);
        i++;
        if (!(lines[i] && (BULLET.test(lines[i].text) || NUMBERED.test(lines[i].text)))) out.push("");
        continue;
      }

      // Paragraph: lines of the same style that follow closely.
      const parts = [l.text];
      while (i + 1 < lines.length) {
        const n = lines[i + 1];
        if (Math.abs(n.size - l.size) > 0.6 || n.y - lines[i].y > l.size * 1.75 || n.pieces.length >= 2 || BULLET.test(n.text) || NUMBERED.test(n.text) || n.size / bodySize >= 1.15) break;
        parts.push(n.text);
        i++;
      }
      out.push(escMd(joinLines(parts)), "");
      i++;
    }
  });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

async function readPages(f: InputFile, ctx: ToolContext): Promise<MdPage[]> {
  const pdf = await pdfjsFor(f.bytes);
  const pages: MdPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    ctx.progress(`Reading page ${i} of ${pdf.numPages}`, i / pdf.numPages);
    const page = await pdf.getPage(i);
    pages.push({ lines: await pageLines(page), width: page.getViewport({ scale: 1 }).width });
    if (i % 5 === 0) await tick();
  }
  return pages;
}

export async function pdfToMarkdown(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const pages = await readPages(f, ctx);
    if (!pages.some((p) => p.lines.length)) throw new ToolError(`${f.name} has no selectable text. Run OCR on it first.`);
    const md = linesToMarkdown(pages, { pageMarkers: o.pageMarkers !== false });
    outs.push({ name: `${baseName(f.name)}.md`, mime: "text/markdown", bytes: new TextEncoder().encode(md) });
  }
  return outs;
}

/* ───────────────────────── AI Summarizer ───────────────────────── */

const STOP = new Set(
  "a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your".split(" "),
);

/** A dependency-free fallback: picks the most representative sentences, in their original order. */
export function extractiveSummary(text: string, sentences: number, bullets: boolean): string {
  const all = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30 && s.length <= 420);
  if (!all.length) return text.replace(/\s+/g, " ").trim().slice(0, 600);
  const freq = new Map<string, number>();
  const words = (s: string) => s.toLowerCase().match(/[a-z\u00c0-\u024f]{3,}/g)?.filter((w) => !STOP.has(w)) ?? [];
  for (const s of all) for (const w of words(s)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const scored = all.map((s, i) => {
    const ws = words(s);
    const score = ws.reduce((n, w) => n + (freq.get(w) ?? 0), 0) / Math.sqrt(ws.length || 1);
    return { s, i, score: score * (i < 3 ? 1.25 : 1) };
  });
  const keep = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(sentences, all.length))
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s);
  return bullets ? keep.map((s) => `- ${s}`).join("\n") : keep.join(" ");
}

const SENTENCES = { short: 3, medium: 6, long: 12 } as const;
const CHUNK_CHARS = 30000;
const MAX_CHUNKS = 12;

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  let cur = "";
  for (const para of text.split(/\n{2,}|\n/)) {
    if (cur.length + para.length + 1 > size && cur) {
      chunks.push(cur);
      cur = "";
    }
    // A single enormous paragraph is cut hard.
    for (let p = para; p; p = p.slice(size)) {
      if (p.length > size) {
        if (cur) chunks.push(cur);
        chunks.push(p.slice(0, size));
        cur = "";
        continue;
      }
      cur += (cur ? "\n" : "") + p;
      break;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function summarizeWithAi(text: string, o: Options, ctx: ToolContext): Promise<string> {
  const length = str(o.length, "medium");
  const style = str(o.style, "paragraph");
  const language = str(o.language, "same");
  const call = async (t: string, len: string) => String(await callAi({ task: "summarize", text: t, length: len, style, language })).trim();
  let chunks = chunkText(text, CHUNK_CHARS);
  if (chunks.length > MAX_CHUNKS) {
    ctx.note?.(`The document is very long, so only the first ${MAX_CHUNKS * 30}k characters were summarized.`);
    chunks = chunks.slice(0, MAX_CHUNKS);
  }
  if (chunks.length === 1) {
    ctx.progress("Summarizing with AI");
    return call(chunks[0], length);
  }
  const partials: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    ctx.progress(`Summarizing part ${i + 1} of ${chunks.length}`, i / (chunks.length + 1));
    partials.push(await call(chunks[i], "medium"));
  }
  ctx.progress("Combining the parts", chunks.length / (chunks.length + 1));
  return call(partials.join("\n\n"), length);
}

export async function summarizePdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const pages = await readPages(f, ctx);
    const text = pages.map((p) => p.lines.map((l) => l.text).join("\n")).join("\n\n").trim();
    if (text.length < 40) throw new ToolError(`${f.name} has no selectable text to summarize. Run OCR on it first.`);

    let summary: string;
    let byAi = true;
    try {
      summary = await summarizeWithAi(text, o, ctx);
    } catch (e) {
      if (!(e instanceof AiUnavailableError)) throw e;
      byAi = false;
      ctx.note?.(`${e.message} A basic automatic extract was used instead — it picks key sentences rather than rewriting them.`);
      summary = extractiveSummary(text, SENTENCES[str(o.length, "medium") as keyof typeof SENTENCES] ?? 6, str(o.style) === "bullets");
    }

    const writer = await ReportWriter.create();
    writer.heading(`Summary of ${baseName(f.name)}`, 18);
    writer.text(`${pages.length} page${pages.length === 1 ? "" : "s"} · ${byAi ? "Written by AI" : "Automatic extract (no AI)"}`, { size: 9, color: rgb(0.42, 0.45, 0.5), gap: 6 });
    writer.rule();
    for (const para of summary.split(/\n+/).filter(Boolean)) writer.text(para.replace(/^[-*•]\s+/, "• "), { size: 11, gap: 5 });
    outs.push(pdfOut(`${baseName(f.name)}-summary`, await writer.save()));
    outs.push({ name: `${baseName(f.name)}-summary.txt`, mime: "text/plain", bytes: new TextEncoder().encode(summary) });
    if (writer.replaced) ctx.note?.("Some characters couldn't be shown in the PDF version; the .txt file has the full text.");
  }
  return outs;
}

/* ───────────────────────── Translate PDF ───────────────────────── */

export const TRANSLATE_LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch", "Polish", "Turkish", "Swedish",
  "Hindi", "Tamil", "Arabic", "Chinese (Simplified)", "Japanese", "Korean", "Russian", "Ukrainian", "Indonesian", "Vietnamese",
];

const BATCH_ITEMS = 60;
const BATCH_CHARS = 9000;
const MAX_TOTAL_CHARS = 120000;

/** Translates items in batches, splitting a batch in two if the reply doesn't line up. */
async function translateBatch(items: string[], target: string): Promise<string[]> {
  try {
    return (await callAi({ task: "translate", items, target })) as string[];
  } catch (e) {
    if (e instanceof AiError && e.code === "bad_shape") {
      if (items.length === 1) return items; // leave an unmappable item as it was
      const mid = Math.ceil(items.length / 2);
      return [...(await translateBatch(items.slice(0, mid), target)), ...(await translateBatch(items.slice(mid), target))];
    }
    throw e;
  }
}

interface TItem {
  page: number;
  text: string;
  heading: 0 | 1 | 2;
}

export async function translatePdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const target = str(o.target, "Spanish");
  const outs: OutputFile[] = [];
  for (const f of files) {
    const pdf = await pdfjsFor(f.bytes);
    const items: TItem[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      ctx.progress(`Reading page ${i} of ${pdf.numPages}`, (i / pdf.numPages) * 0.2);
      const page = await pdf.getPage(i);
      for (const p of paragraphs(await pageLines(page), page.getViewport({ scale: 1 }).width)) if (p.text.trim()) items.push({ page: i - 1, text: p.text, heading: p.heading });
    }
    if (!items.length) throw new ToolError(`${f.name} has no selectable text to translate. Run OCR on it first.`);
    const totalChars = items.reduce((n, it) => n + it.text.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) throw new ToolError(`${f.name} is too long to translate in one go (${Math.round(totalChars / 1000)}k characters). Split it into parts first.`);

    const translated: string[] = [];
    let batch: TItem[] = [];
    let chars = 0;
    const flush = async () => {
      if (!batch.length) return;
      ctx.progress(`Translating to ${target}`, 0.2 + 0.75 * (translated.length / items.length));
      translated.push(...(await translateBatch(batch.map((b) => b.text), target)));
      batch = [];
      chars = 0;
    };
    for (const it of items) {
      if (batch.length >= BATCH_ITEMS || (chars + it.text.length > BATCH_CHARS && batch.length)) await flush();
      batch.push(it);
      chars += it.text.length;
    }
    await flush();

    // Word file: works for every language and script.
    const blocks: DocxBlock[] = [];
    items.forEach((it, k) => {
      if (k && it.page !== items[k - 1].page) blocks.push({ kind: "pageBreak" });
      blocks.push({ kind: "paragraph", style: it.heading === 1 ? "Heading1" : it.heading === 2 ? "Heading2" : undefined, runs: [{ text: translated[k] ?? it.text }] });
    });
    outs.push({ name: `${baseName(f.name)}-${target.split(" ")[0].toLowerCase()}.docx`, mime: DOCX, bytes: buildDocx(blocks, { widthPt: 595.28, heightPt: 841.89, marginPt: 54 }) });

    // PDF: the standard PDF fonts only cover Latin-based alphabets.
    const allText = translated.join("\n");
    if (await isWinAnsiText(allText)) {
      const w = await ReportWriter.create();
      items.forEach((it, k) => {
        if (k && it.page !== items[k - 1].page) w.newPage();
        const size = it.heading === 1 ? 16 : it.heading === 2 ? 13 : 10.5;
        w.text(translated[k] ?? it.text, { size, bold: it.heading > 0, gap: it.heading ? 8 : 5 });
      });
      outs.push(pdfOut(`${baseName(f.name)}-${target.split(" ")[0].toLowerCase()}`, await w.save()));
    } else {
      ctx.note?.(`A PDF can't be produced for ${target} yet because it needs fonts that aren't built in — use the Word file, which you can save as PDF from Word.`);
    }
  }
  ctx.note?.("The translation keeps the text and headings but not the original page layout, images or tables.");
  return outs;
}
