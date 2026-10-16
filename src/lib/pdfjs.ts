// Shared PDF.js loader. The legacy build bundles polyfills (e.g.
// Map.getOrInsertComputed) that PDF.js 5's modern build expects natively.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjsLib };
export type { PDFDocumentProxy, PDFPageProxy };

/** Opens PDF bytes with PDF.js (a copy is passed, since PDF.js detaches the buffer). */
export function openPdfJs(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data: bytes.slice(), password }).promise;
}

/** Renders a page to a new canvas at the given scale (1 = 72 dpi). */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  scale: number,
  opts: { background?: string; annotations?: boolean } = {},
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = opts.background ?? "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await page.render({
    canvas,
    canvasContext: ctx ?? undefined,
    viewport,
    annotationMode: opts.annotations === false ? pdfjsLib.AnnotationMode.DISABLE : pdfjsLib.AnnotationMode.ENABLE,
  }).promise;
  return canvas;
}

export function canvasToBytes(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg", quality?: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error("Could not encode image"));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      type,
      quality,
    );
  });
}
