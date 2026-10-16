import { pdfjsLib, type PDFDocumentProxy, type PDFPageProxy } from "@/lib/pdfjs";
import type { EditorPage, FontFamily, PageImageBox, PageTextItem } from "./types";
import { uid } from "./geometry";


export interface LoadedPdf {
  doc: PDFDocumentProxy;
  pages: EditorPage[];
}

/** Opens PDF bytes with PDF.js and describes every page in page space. */
export async function loadPdf(bytes: Uint8Array): Promise<LoadedPdf> {
  // PDF.js takes ownership of (detaches) the buffer it is given, so pass a copy.
  const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
  const pages: EditorPage[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({
      id: uid("p"),
      sourceIndex: i - 1,
      width: viewport.width,
      height: viewport.height,
      baseRotation: page.rotate || 0,
      rotation: 0,
      transform: viewport.transform as EditorPage["transform"],
    });
  }
  return { doc, pages };
}

/** A page-space description for a new blank page. */
export function blankPage(width = 612, height = 792): EditorPage {
  return {
    id: uid("p"),
    sourceIndex: null,
    width,
    height,
    baseRotation: 0,
    rotation: 0,
    transform: [1, 0, 0, -1, 0, height],
  };
}

/**
 * Starts rendering a source page into a canvas at the given zoom (no user
 * rotation — the editor rotates the whole page box with CSS). Returns the
 * PDF.js render task so a newer render can cancel it.
 */
export function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  zoom: number,
  showAnnotations: boolean,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: zoom * dpr });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return page.render({
    canvas,
    canvasContext: ctx ?? undefined,
    viewport,
    background: "#ffffff",
    annotationMode: showAnnotations ? pdfjsLib.AnnotationMode.ENABLE : pdfjsLib.AnnotationMode.DISABLE,
  });
}

function guessFamily(name: string): FontFamily {
  const n = name.toLowerCase();
  if (/courier|mono|consol/.test(n)) return "Courier";
  if (/times|serif|georgia|garamond|roman|cambria|minion/.test(n) && !/sans/.test(n)) return "Times";
  return "Helvetica";
}

/** Lists the text already printed on a page, in page space. */
export async function getPageText(page: PDFPageProxy): Promise<PageTextItem[]> {
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const styles = content.styles as Record<string, { fontFamily?: string }>;
  const items: PageTextItem[] = [];
  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const item = raw as { str: string; transform: number[]; width: number; height: number; fontName: string };
    if (!item.str.trim()) continue;
    const [a, b, , , e, f] = item.transform;
    const fontSizeUser = Math.hypot(a, b) || item.height || 10;
    const [bx, by] = viewport.convertToViewportPoint(e, f);
    // PDF.js gives fonts internal ids (e.g. "g_d0_f1"); the real name (such as
    // "Helvetica-Bold") is on the loaded font object once the page has rendered.
    let realName = "";
    try {
      if (page.commonObjs.has(item.fontName)) {
        const f = page.commonObjs.get(item.fontName) as { name?: string; bold?: boolean; italic?: boolean; black?: boolean } | null;
        realName = `${f?.name ?? ""} ${f?.bold || f?.black ? "bold" : ""} ${f?.italic ? "italic" : ""}`;
      }
    } catch {
      /* font not loaded yet */
    }
    const fontName = `${item.fontName} ${realName} ${styles[item.fontName]?.fontFamily ?? ""}`;
    items.push({
      str: item.str,
      x: bx,
      baseline: by,
      width: item.width,
      fontSize: fontSizeUser,
      fontFamily: guessFamily(fontName),
      bold: /bold|black|heavy|semibold/i.test(fontName),
      italic: /italic|oblique/i.test(fontName),
    });
  }
  return items;
}

type Matrix = [number, number, number, number, number, number];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

/** Finds where images are drawn on a page by walking its drawing operators. */
export async function getPageImages(page: PDFPageProxy): Promise<PageImageBox[]> {
  const viewport = page.getViewport({ scale: 1 });
  const ops = await page.getOperatorList();
  const OPS = pdfjsLib.OPS;
  const imageOps = new Set<number>([
    OPS.paintImageXObject,
    OPS.paintInlineImageXObject,
    OPS.paintImageMaskXObject,
    OPS.paintImageXObjectRepeat,
  ]);
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  const boxes: PageImageBox[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];
    if (fn === OPS.save) stack.push(ctm);
    else if (fn === OPS.restore) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === OPS.transform) ctm = multiply(ctm, args as Matrix);
    else if (fn === OPS.paintFormXObjectBegin && Array.isArray(args?.[0])) {
      stack.push(ctm);
      ctm = multiply(ctm, args[0] as Matrix);
    } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (imageOps.has(fn)) {
      const corners = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([u, v]) => {
        const px = ctm[0] * u + ctm[2] * v + ctm[4];
        const py = ctm[1] * u + ctm[3] * v + ctm[5];
        return viewport.convertToViewportPoint(px, py);
      });
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      if (box.w > 4 && box.h > 4) boxes.push(box);
    }
  }
  return boxes;
}

export interface ExistingField {
  name: string;
  type: string;
  pageIndex: number;
  rect: { x: number; y: number; w: number; h: number };
  /** Fill-in details (from PDF.js). */
  checkBox?: boolean;
  radioButton?: boolean;
  multiLine?: boolean;
  readOnly?: boolean;
  /** Export value of this checkbox / radio widget. */
  exportValue?: string;
  options?: { exportValue: string; displayValue: string }[];
  value?: string | string[] | boolean | null;
}

/** Lists form fields the PDF already contains, with their position on screen. */
export async function getExistingFields(doc: PDFDocumentProxy): Promise<ExistingField[]> {
  const fields: ExistingField[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const annots = await page.getAnnotations();
    for (const a of annots as Array<Record<string, unknown> & { subtype: string; fieldName?: string; fieldType?: string; rect: number[] }>) {
      if (a.subtype !== "Widget" || !a.fieldName) continue;
      const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(a.rect);
      fields.push({
        name: a.fieldName,
        type: a.fieldType ?? "",
        pageIndex: i - 1,
        rect: { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) },
        checkBox: !!a.checkBox,
        radioButton: !!a.radioButton,
        multiLine: !!a.multiLine,
        readOnly: !!a.readOnly,
        exportValue: (a.buttonValue ?? a.exportValue) as string | undefined,
        options: Array.isArray(a.options) ? (a.options as { exportValue: string; displayValue: string }[]) : undefined,
        value: (a.fieldValue ?? null) as ExistingField["value"],
      });
    }
  }
  return fields;
}
