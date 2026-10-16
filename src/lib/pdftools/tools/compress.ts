import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFObject, PDFRawStream, PDFRef, PDFStream, decodePDFRawStream } from "pdf-lib";
import { zlibSync } from "fflate";

const TEXT_FILTERS = new Set(["/ASCII85Decode", "/ASCIIHexDecode", "/FlateDecode", "/LZWDecode", "/RunLengthDecode"]);

/** Undoes a chain of generic filters (e.g. ASCII85 + Flate) with pdf-lib. */
function decodeFilters(stream: PDFRawStream, filterNames: string[]): Uint8Array {
  if (!filterNames.length) return stream.getContents();
  const d = stream.dict.clone();
  d.set(PDFName.of("Filter"), filterNames.length === 1 ? PDFName.of(filterNames[0].slice(1)) : stream.dict.context.obj(filterNames.map((f) => PDFName.of(f.slice(1)))));
  d.delete(PDFName.of("DecodeParms"));
  return decodePDFRawStream(PDFRawStream.of(d, stream.getContents())).decode();
}
import { type InputFile, type Options, type OutputFile, type ToolContext, baseName, loadPdf, pdfOut, str, tick } from "../core";

const PRESETS = {
  low: { maxDim: 2400, quality: 0.85, minGain: 0.9 },
  recommended: { maxDim: 1600, quality: 0.72, minGain: 0.9 },
  high: { maxDim: 1100, quality: 0.55, minGain: 0.95 },
} as const;

/** Removes objects no longer reachable from the document (pdf-lib keeps them otherwise). */
export function removeUnreachable(doc: PDFDocument) {
  const ctx = doc.context;
  const seen = new Set<string>();
  const stack: PDFObject[] = [];
  const t = ctx.trailerInfo;
  for (const v of [t.Root, t.Info, t.Encrypt]) if (v) stack.push(v);
  while (stack.length) {
    const o = stack.pop()!;
    if (o instanceof PDFRef) {
      const key = o.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const target = ctx.lookup(o);
      if (target) stack.push(target);
    } else if (o instanceof PDFDict) {
      for (const [, v] of o.entries()) stack.push(v);
    } else if (o instanceof PDFArray) {
      for (let i = 0; i < o.size(); i++) stack.push(o.get(i));
    } else if (o instanceof PDFStream) {
      stack.push(o.dict);
    }
  }
  let removed = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) {
    if (!seen.has(ref.toString())) {
      ctx.delete(ref);
      removed++;
    }
  }
  return removed;
}

const nameOf = (d: PDFDict, k: string) => d.get(PDFName.of(k))?.toString();
const numOf = (d: PDFDict, k: string, dflt: number) => d.lookupMaybe(PDFName.of(k), PDFNumber)?.asNumber() ?? dflt;

function filters(d: PDFDict): string[] {
  const f = d.lookup(PDFName.of("Filter"));
  if (!f) return [];
  if (f instanceof PDFArray) return Array.from({ length: f.size() }, (_, i) => f.get(i).toString());
  return [f.toString()];
}

/** Number of colour components, or 0 when we shouldn't touch the image. */
function components(doc: PDFDocument, d: PDFDict): number {
  const cs = d.lookup(PDFName.of("ColorSpace"));
  if (!cs) return 0;
  const s = cs.toString();
  if (s === "/DeviceRGB") return 3;
  if (s === "/DeviceGray") return 1;
  if (cs instanceof PDFArray && cs.get(0)?.toString() === "/ICCBased") {
    const icc = doc.context.lookup(cs.get(1));
    const n = icc instanceof PDFStream ? numOf(icc.dict, "N", 0) : 0;
    return n === 3 || n === 1 ? n : 0;
  }
  return 0;
}

function unpredict(data: Uint8Array, width: number, colors: number, height: number): Uint8Array | null {
  const bpp = colors;
  const rowLen = width * colors;
  if (data.length < (rowLen + 1) * height) return null;
  const out = new Uint8Array(rowLen * height);
  for (let y = 0; y < height; y++) {
    const type = data[y * (rowLen + 1)];
    const src = y * (rowLen + 1) + 1;
    const dst = y * rowLen;
    for (let x = 0; x < rowLen; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y > 0 ? out[dst - rowLen + x] : 0;
      const c = x >= bpp && y > 0 ? out[dst - rowLen + x - bpp] : 0;
      let v = data[src + x];
      if (type === 1) v += a;
      else if (type === 2) v += b;
      else if (type === 3) v += (a + b) >> 1;
      else if (type === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (type !== 0) return null;
      out[dst + x] = v & 255;
    }
  }
  return out;
}

async function encodeJpeg(source: CanvasImageSource, w: number, h: number, maxDim: number, quality: number) {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(source, 0, 0, cw, ch);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", quality));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: cw, height: ch };
}

export async function compress(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  const level = str(o.level, "recommended");
  for (const f of files) {
    if (level === "extreme") {
      outs.push(await rasterize(f, ctx));
      continue;
    }
    const preset = PRESETS[level as keyof typeof PRESETS] ?? PRESETS.recommended;
    const doc = await loadPdf(f.bytes);
    ctx.progress(`Optimising ${f.name}`);

    // Drop data viewers don't need.
    if (o.removeMetadata !== false) doc.catalog.delete(PDFName.of("Metadata"));
    doc.catalog.delete(PDFName.of("PieceInfo"));
    for (const page of doc.getPages()) {
      page.node.delete(PDFName.of("Thumb"));
      page.node.delete(PDFName.of("PieceInfo"));
    }
    removeUnreachable(doc);

    const objects = doc.context.enumerateIndirectObjects();
    let done = 0;
    for (const [ref, obj] of objects) {
      done++;
      if (!(obj instanceof PDFRawStream)) continue;
      const d = obj.dict;
      const fl = filters(d);
      try {
        if (nameOf(d, "Subtype") === "/Image") {
          if (d.has(PDFName.of("ImageMask")) || d.has(PDFName.of("Decode")) || numOf(d, "BitsPerComponent", 8) !== 8) continue;
          const nComp = components(doc, d);
          if (!nComp) continue;
          const w = numOf(d, "Width", 0), h = numOf(d, "Height", 0);
          if (w * h < 40000) continue; // small images: not worth it
          let encoded: Awaited<ReturnType<typeof encodeJpeg>> | null = null;
          if (fl.length >= 1 && fl[fl.length - 1] === "/DCTDecode" && fl.slice(0, -1).every((x) => TEXT_FILTERS.has(x))) {
            const jpeg = decodeFilters(obj, fl.slice(0, -1));
            const bmp = await createImageBitmap(new Blob([jpeg], { type: "image/jpeg" }));
            encoded = await encodeJpeg(bmp, bmp.width, bmp.height, preset.maxDim, preset.quality);
            bmp.close();
          } else if (fl.length >= 1 && fl.every((x) => TEXT_FILTERS.has(x))) {
            let raw = decodeFilters(obj, fl);
            const parms = d.lookupMaybe(PDFName.of("DecodeParms"), PDFDict);
            const predictor = parms ? numOf(parms, "Predictor", 1) : 1;
            if (predictor >= 10) {
              const un = unpredict(raw, w, nComp, h);
              if (!un) continue;
              raw = un;
            } else if (predictor !== 1) continue;
            if (raw.length < w * h * nComp) continue;
            const rgba = new Uint8ClampedArray(w * h * 4);
            for (let i = 0, j = 0; i < w * h; i++, j += nComp) {
              rgba[i * 4] = raw[j];
              rgba[i * 4 + 1] = raw[nComp === 3 ? j + 1 : j];
              rgba[i * 4 + 2] = raw[nComp === 3 ? j + 2 : j];
              rgba[i * 4 + 3] = 255;
            }
            const bmp = await createImageBitmap(new ImageData(rgba, w, h));
            encoded = await encodeJpeg(bmp, w, h, preset.maxDim, preset.quality);
            bmp.close();
          } else continue;
          if (encoded && encoded.bytes.length < obj.getContents().length * preset.minGain) {
            d.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
            d.delete(PDFName.of("DecodeParms"));
            d.set(PDFName.of("Width"), PDFNumber.of(encoded.width));
            d.set(PDFName.of("Height"), PDFNumber.of(encoded.height));
            d.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
            d.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
            doc.context.assign(ref, PDFRawStream.of(d, encoded.bytes));
          }
        } else if (!fl.length) {
          // Uncompressed streams (often page content): deflate them.
          const data = obj.getContents();
          if (data.length > 256) {
            const z = zlibSync(data, { level: 9 });
            if (z.length < data.length) {
              d.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
              doc.context.assign(ref, PDFRawStream.of(d, z));
            }
          }
        }
      } catch {
        /* leave this object as it was */
      }
      if (done % 25 === 0) {
        ctx.progress(`Optimising images (${done} of ${objects.length} objects)`, done / objects.length);
        await tick();
      }
    }
    const bytes = await doc.save({ useObjectStreams: true });
    // Never hand back something bigger than the original.
    if (bytes.length >= f.bytes.length) ctx.note?.(`${f.name} is already well optimised — it couldn't be made smaller at this level. Try a stronger setting.`);
    outs.push(pdfOut(`${baseName(f.name)}-compressed`, bytes.length < f.bytes.length ? bytes : f.bytes));
  }
  return outs;
}

async function rasterize(f: InputFile, ctx: ToolContext): Promise<OutputFile> {
  const { renderPages, pdfjsFor } = await import("./render");
  const pdf = await pdfjsFor(f.bytes);
  const out = await PDFDocument.create();
  const all = Array.from({ length: pdf.numPages }, (_, i) => i);
  for await (const r of renderPages(f.bytes, all, 110)) {
    ctx.progress(`Converting page ${r.index + 1}`, r.index / pdf.numPages);
    const blob: Blob = await new Promise((res) => r.canvas.toBlob((b) => res(b!), "image/jpeg", 0.6));
    const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    out.addPage([r.widthPt, r.heightPt]).drawImage(img, { x: 0, y: 0, width: r.widthPt, height: r.heightPt });
  }
  return pdfOut(`${baseName(f.name)}-compressed`, await out.save({ useObjectStreams: true }));
}
