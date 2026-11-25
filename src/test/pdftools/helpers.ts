import path from "node:path";
import { JSDOM } from "jsdom";
import { pathToFileURL } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InputFile, ToolContext } from "@/lib/pdftools/core";

/** Points PDF.js at its real worker file (Vite's ?url import resolves wrongly under vitest). */
export async function usePdfjsWorker() {
  const { pdfjsLib } = await import("@/lib/pdfjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
}

export const ctx: ToolContext & { notes: string[] } = {
  notes: [],
  progress: () => undefined,
  note(m: string) {
    ctx.notes.push(m);
  },
};

let n = 0;
export const asFile = (name: string, bytes: Uint8Array, type = "application/pdf"): InputFile => ({ id: `f${++n}`, name, type, bytes });

/** A PDF whose pages each contain the given lines of text. */
export async function makePdf(pages: string[][], size: [number, number] = [595, 842]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const lines of pages) {
    const page = doc.addPage(size);
    lines.forEach((text, i) => page.drawText(text, { x: 50, y: size[1] - 80 - i * 22, size: 12, font: i === 0 ? bold : font, color: rgb(0, 0, 0) }));
  }
  return new Uint8Array(await doc.save());
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).getPageCount();
}

/** All text of a PDF, page by page, using PDF.js. */
export async function textOf(bytes: Uint8Array): Promise<string[]> {
  const { pdfjsFor } = await import("@/lib/pdftools/tools/render");
  const pdf = await pdfjsFor(new Uint8Array(bytes));
  const out: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent();
    out.push(c.items.map((it) => ("str" in it ? it.str : "")).join(" ").replace(/\s+/g, " ").trim());
  }
  return out;
}

/** The Office readers parse XML with DOMParser; the Node environment has none, so borrow jsdom's. */
export function installDomParser() {
  if (typeof globalThis.DOMParser === "undefined") (globalThis as unknown as { DOMParser: typeof DOMParser }).DOMParser = new JSDOM("").window.DOMParser;
}
