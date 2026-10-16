import { openPdfJs, renderPageToCanvas, type PDFDocumentProxy } from "@/lib/pdfjs";

const docCache = new WeakMap<Uint8Array, Promise<PDFDocumentProxy>>();

/** Opens (and caches per byte array) a PDF.js document. */
export function pdfjsFor(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  if (password) return openPdfJs(bytes, password);
  let p = docCache.get(bytes);
  if (!p) {
    p = openPdfJs(bytes);
    docCache.set(bytes, p);
  }
  return p;
}

/**
 * Finds the non-white content area of a page, returned as fractions of the
 * displayed page (top-left origin), padded by `paddingPt` points.
 */
export async function detectContentBox(bytes: Uint8Array, pageIndex: number, paddingPt: number) {
  const doc = await pdfjsFor(bytes);
  const page = await doc.getPage(pageIndex + 1);
  const scale = 1;
  const canvas = await renderPageToCanvas(page, scale, { annotations: true });
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = paddingPt * scale;
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
  const x1 = Math.min(width, maxX + 1 + pad), y1 = Math.min(height, maxY + 1 + pad);
  return { x: x0 / width, y: y0 / height, w: (x1 - x0) / width, h: (y1 - y0) / height };
}

/** Renders each page to an image. `dpi` 72 = 1:1. */
export async function* renderPages(bytes: Uint8Array, pages: number[], dpi: number, opts: { grayscale?: boolean } = {}) {
  const doc = await pdfjsFor(bytes);
  for (const i of pages) {
    const page = await doc.getPage(i + 1);
    const canvas = await renderPageToCanvas(page, dpi / 72);
    if (opts.grayscale) {
      const ctx = canvas.getContext("2d")!;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let k = 0; k < d.length; k += 4) {
        const g = Math.round(0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]);
        d[k] = d[k + 1] = d[k + 2] = g;
      }
      ctx.putImageData(img, 0, 0);
    }
    const vp = page.getViewport({ scale: 1 });
    yield { index: i, canvas, widthPt: vp.width, heightPt: vp.height };
  }
}
