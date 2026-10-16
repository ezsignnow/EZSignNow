import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObjectCopier,
  PDFPage,
  PDFRef,
  degrees,
} from "pdf-lib";

/**
 * Copies pages into another document and re-registers their form fields so
 * they stay fillable (pdf-lib's copyPages copies widgets but not the form).
 */
export async function copyPagesKeepForms(target: PDFDocument, src: PDFDocument, indices: number[]): Promise<PDFPage[]> {
  const pages = await target.copyPages(src, indices);
  const fieldRefs = new Set<string>();
  const roots: PDFRef[] = [];
  for (const page of pages) {
    const annots = page.node.lookup(PDFName.of("Annots"));
    if (!(annots instanceof PDFArray)) continue;
    for (let i = 0; i < annots.size(); i++) {
      const first = annots.get(i);
      const firstDict = target.context.lookup(first);
      if (!(first instanceof PDFRef) || !(firstDict instanceof PDFDict)) continue;
      if (firstDict.get(PDFName.of("Subtype"))?.toString() !== "/Widget") continue;
      // Walk up to the top-level field.
      let ref: PDFRef = first;
      let dict: PDFDict = firstDict;
      for (let guard = 0; guard < 20; guard++) {
        const parent = dict.get(PDFName.of("Parent"));
        const parentDict = parent ? target.context.lookup(parent) : undefined;
        if (!(parent instanceof PDFRef) || !(parentDict instanceof PDFDict)) break;
        ref = parent;
        dict = parentDict;
      }
      if (!fieldRefs.has(ref.toString())) {
        fieldRefs.add(ref.toString());
        roots.push(ref);
      }
    }
  }
  if (roots.length) {
    const acroForm = target.getForm().acroForm;
    for (const r of roots) acroForm.addField(r);
    // Bring over default resources (fonts) and appearance settings.
    const srcAcro = src.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    if (srcAcro) {
      const copier = PDFObjectCopier.for(src.context, target.context);
      for (const key of ["DR", "DA", "NeedAppearances"]) {
        const v = srcAcro.get(PDFName.of(key));
        if (v && !acroForm.dict.has(PDFName.of(key))) acroForm.dict.set(PDFName.of(key), copier.copy(v));
      }
    }
  }
  return pages;
}

/** Removes form fields whose widgets sit on the given pages (before deleting them). */
export function removeFieldsOnPages(doc: PDFDocument, pageIndexes: number[]) {
  const refs = new Set(pageIndexes.map((i) => doc.getPage(i).ref.toString()));
  if (!refs.size) return;
  const form = doc.getForm();
  for (const field of form.getFields()) {
    const onRemoved = field.acroField.getWidgets().some((w) => {
      const p = w.P();
      return p instanceof PDFRef && refs.has(p.toString());
    });
    if (onRemoved) {
      try {
        form.removeField(field);
      } catch {
        /* best effort */
      }
    }
  }
}

export type Matrix = [number, number, number, number, number, number];

/** Wraps a page's existing drawing in `q <matrix> cm … Q`, moving annotations to match. */
export function transformPageContent(doc: PDFDocument, page: PDFPage, m: Matrix) {
  const pre = doc.context.register(doc.context.stream(`q ${m.map((n) => +n.toFixed(6)).join(" ")} cm\n`));
  const post = doc.context.register(doc.context.stream(`\nQ\n`));
  const contents = page.node.get(PDFName.of("Contents"));
  const arr = doc.context.obj([]) as PDFArray;
  arr.push(pre);
  const existing = contents ? doc.context.lookup(contents) : undefined;
  if (existing instanceof PDFArray) for (let i = 0; i < existing.size(); i++) arr.push(existing.get(i));
  else if (contents) arr.push(contents);
  arr.push(post);
  page.node.set(PDFName.of("Contents"), arr);

  // Move annotation rectangles the same way.
  const annots = page.node.lookup(PDFName.of("Annots"));
  if (annots instanceof PDFArray) {
    for (let i = 0; i < annots.size(); i++) {
      const a = annots.lookup(i);
      if (!(a instanceof PDFDict)) continue;
      const rect = a.lookupMaybe(PDFName.of("Rect"), PDFArray);
      if (!rect || rect.size() < 4) continue;
      const v = [0, 1, 2, 3].map((k) => (rect.lookup(k) as PDFNumber)?.asNumber?.() ?? 0);
      const pts = [
        apply(m, v[0], v[1]),
        apply(m, v[2], v[3]),
      ];
      a.set(
        PDFName.of("Rect"),
        doc.context.obj([Math.min(pts[0][0], pts[1][0]), Math.min(pts[0][1], pts[1][1]), Math.max(pts[0][0], pts[1][0]), Math.max(pts[0][1], pts[1][1])]),
      );
    }
  }
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function normRotation(page: PDFPage): 0 | 90 | 180 | 270 {
  return ((((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270);
}

/** The page's visible box (CropBox, falling back to MediaBox) in user space. */
export function visibleBox(page: PDFPage) {
  const cb = page.getCropBox();
  return cb.width > 0 && cb.height > 0 ? cb : page.getMediaBox();
}

/**
 * Maps a point given as fractions of the page *as displayed* (0,0 = top-left,
 * after /Rotate) to PDF user-space coordinates.
 */
export function visibleFracToUser(page: PDFPage, fx: number, fy: number): [number, number] {
  const box = visibleBox(page);
  const r = normRotation(page);
  let ux: number, uy: number; // fractions in user space, origin bottom-left
  if (r === 0) [ux, uy] = [fx, 1 - fy];
  else if (r === 90) [ux, uy] = [fy, fx];
  else if (r === 180) [ux, uy] = [1 - fx, fy];
  else [ux, uy] = [1 - fy, 1 - fx];
  return [box.x + ux * box.width, box.y + uy * box.height];
}

/** Sets a page's CropBox from a rectangle given as fractions of the displayed page. */
export function cropToVisibleFraction(page: PDFPage, fx: number, fy: number, fw: number, fh: number) {
  const a = visibleFracToUser(page, fx, fy);
  const b = visibleFracToUser(page, fx + fw, fy + fh);
  const x = Math.min(a[0], b[0]);
  const y = Math.min(a[1], b[1]);
  page.setCropBox(x, y, Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
}

/**
 * Draws an embedded page so it appears upright (honouring the source page's
 * /Rotate) inside a box whose bottom-left corner is (x, y), at `scale`.
 */
export function drawEmbeddedUpright(
  target: PDFPage,
  embedded: Awaited<ReturnType<PDFDocument["embedPage"]>>,
  rotation: 0 | 90 | 180 | 270,
  x: number,
  y: number,
  scale: number,
) {
  const w = embedded.width * scale;
  const h = embedded.height * scale;
  const at = {
    0: { x, y, r: 0 },
    90: { x, y: y + w, r: -90 },
    180: { x: x + w, y: y + h, r: 180 },
    270: { x: x + h, y, r: 90 },
  }[rotation];
  target.drawPage(embedded, { x: at.x, y: at.y, xScale: scale, yScale: scale, rotate: degrees(at.r) });
}
