import { PDFDocument, EncryptedPDFError } from "pdf-lib";
import { zipSync } from "fflate";

export interface InputFile {
  id: string;
  name: string;
  /** MIME type as reported by the browser (may be empty). */
  type: string;
  bytes: Uint8Array;
}

export interface OutputFile {
  name: string;
  mime: string;
  bytes: Uint8Array;
}

export interface ToolContext {
  /** Reports progress text and an optional 0–1 fraction. */
  progress: (message: string, fraction?: number) => void;
  /** Adds a note shown next to the results (e.g. "page 3 is bigger than the limit"). */
  note?: (message: string) => void;
}

export type Options = Record<string, unknown>;

interface FieldBase {
  key: string;
  label: string;
  help?: string;
  /** Only show this field when the predicate is true. */
  showIf?: (o: Options) => boolean;
}

export type OptionField =
  | (FieldBase & { type: "number"; min?: number; max?: number; step?: number; suffix?: string })
  | (FieldBase & { type: "text" | "password" | "textarea"; placeholder?: string })
  | (FieldBase & { type: "select"; choices: { value: string; label: string }[] })
  | (FieldBase & { type: "checkbox" })
  | (FieldBase & { type: "color" })
  | (FieldBase & { type: "pages"; placeholder?: string })
  | (FieldBase & { type: "image" })
  | (FieldBase & { type: "date" });

export type ToolCategory = "merge" | "split" | "edit" | "compress" | "security" | "from-pdf" | "to-pdf" | "other" | "scans" | "automate";

/** Custom visual panels a tool can use alongside (or instead of) plain options. */
export type ToolPanel = "organize" | "select-pages" | "crop" | "split-points" | "bookmarks" | "metadata" | "workflow" | "file-order";

export type AcceptKind = "pdf" | "images" | "docx" | "html" | "none";

export interface ToolDef {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  accept: AcceptKind;
  /** Accept several input files (processed together or one by one). */
  multiple?: boolean;
  /** Minimum number of files before the tool can run. */
  minFiles?: number;
  options?: OptionField[];
  defaults?: Options;
  panel?: ToolPanel;
  /** For tools that live elsewhere in the app (e.g. the editor). */
  route?: string;
  /** Runs the tool. Multi-file tools receive every file at once. */
  run?: (files: InputFile[], opts: Options, ctx: ToolContext) => Promise<OutputFile[]>;
  /** True if the tool turns one PDF into one PDF and can be a workflow step. */
  workflow?: boolean;
}

/* ───────────── helpers ───────────── */

export const PDF_MIME = "application/pdf";

export function baseName(name: string): string {
  return name.replace(/\.[^.\\/]+$/, "") || "document";
}

export function pdfOut(name: string, bytes: Uint8Array): OutputFile {
  return { name: name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`, mime: PDF_MIME, bytes };
}

export class ToolError extends Error {}

/** Loads a PDF with pdf-lib, with a clear message for protected files. */
export async function loadPdf(bytes: Uint8Array, opts: { allowEncrypted?: boolean } = {}): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: !!opts.allowEncrypted, updateMetadata: false, throwOnInvalidObject: false });
  } catch (err) {
    if (err instanceof EncryptedPDFError || /encrypt/i.test(String((err as Error)?.message))) {
      throw new ToolError("This PDF is password-protected. Use the Unlock tool first.");
    }
    throw new ToolError(`Couldn't read this PDF (${(err as Error)?.message ?? err}). Try the Repair tool.`);
  }
}

export function saveOpts() {
  return { useObjectStreams: true } as const;
}

/**
 * Parses page selections like "1-3, 5, 8-", "odd", "even", "last" or "all"
 * into sorted, unique 0-based indexes. An empty string means all pages.
 */
export function parsePageRanges(input: string | undefined, total: number): number[] {
  const text = (input ?? "").trim().toLowerCase();
  if (!text || text === "all") return Array.from({ length: total }, (_, i) => i);
  const set = new Set<number>();
  for (const raw of text.split(/[,;\s]+/).filter(Boolean)) {
    if (raw === "odd") for (let i = 0; i < total; i += 2) set.add(i);
    else if (raw === "even") for (let i = 1; i < total; i += 2) set.add(i);
    else {
      const m = /^(\d+|last)?(?:(-)(\d+|last)?)?$/.exec(raw);
      if (!m || (!m[1] && !m[2])) throw new ToolError(`“${raw}” isn't a valid page or range.`);
      const num = (v: string | undefined, dflt: number) => (v === undefined ? dflt : v === "last" ? total : parseInt(v, 10));
      const start = num(m[1], 1);
      const end = m[2] ? num(m[3], total) : start;
      if (start < 1 || end < 1) throw new ToolError("Page numbers start at 1.");
      for (let p = Math.min(start, end); p <= Math.max(start, end); p++) if (p <= total) set.add(p - 1);
    }
  }
  if (!set.size) throw new ToolError("No pages match that selection.");
  return [...set].sort((a, b) => a - b);
}

/** Bundles several outputs into one ZIP file. */
export function zipOutputs(files: OutputFile[], zipName: string): OutputFile {
  const used = new Set<string>();
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) {
    let name = f.name;
    let n = 2;
    while (used.has(name)) name = f.name.replace(/(\.[^.]+)?$/, ` (${n++})$1`);
    used.add(name);
    entries[name] = f.bytes;
  }
  return { name: zipName.endsWith(".zip") ? zipName : `${zipName}.zip`, mime: "application/zip", bytes: zipSync(entries, { level: 0 }) };
}

export const PAGE_SIZES: Record<string, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
  Tabloid: [792, 1224],
};

export const PAGE_SIZE_CHOICES = Object.keys(PAGE_SIZES).map((k) => ({ value: k, label: k }));

export function hexColor(hex: unknown, fallback = "#000000"): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex ?? fallback)) ?? /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(fallback)!;
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

export function num(v: unknown, dflt: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : dflt;
}

export function str(v: unknown, dflt = ""): string {
  return v === undefined || v === null ? dflt : String(v);
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Yields to the browser so long loops don't freeze the page. */
export const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Real page size after the /Rotate the page carries. */
export function visibleSize(page: { getSize(): { width: number; height: number }; getRotation(): { angle: number } }) {
  const { width, height } = page.getSize();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  return r === 90 || r === 270 ? { width: height, height: width } : { width, height };
}
