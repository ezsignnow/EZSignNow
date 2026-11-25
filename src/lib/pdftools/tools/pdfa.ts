import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString } from "pdf-lib";
import { type InputFile, type Options, type OutputFile, type ToolContext, baseName, loadPdf, num, pdfOut, str, tick } from "../core";
import { canvasToBytes, renderPageToCanvas } from "@/lib/pdfjs";
import { pdfjsFor } from "./render";

/* ───────────── sRGB colour profile (an ICC v2 profile built in code) ───────────── */

const s15 = (v: number) => Math.round(v * 65536);

/** Builds a small, valid sRGB ICC profile for the PDF/A output intent. */
export function buildSrgbProfile(): Uint8Array {
  const enc = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
  const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const xyz = (x: number, y: number, z: number) => [...enc("XYZ "), 0, 0, 0, 0, ...u32(s15(x)), ...u32(s15(y)), ...u32(s15(z))];
  const text = (s: string) => [...enc("text"), 0, 0, 0, 0, ...enc(s), 0];
  const desc = (s: string) => [...enc("desc"), 0, 0, 0, 0, ...u32(s.length + 1), ...enc(s), 0, ...new Array(4 + 4 + 2 + 1 + 67).fill(0)];
  const curv = () => [...enc("curv"), 0, 0, 0, 0, ...u32(1), 0x02, 0x33, 0, 0]; // gamma 2.2 as u8Fixed8

  const tags: [string, number[]][] = [
    ["desc", desc("sRGB IEC61966-2.1")],
    ["cprt", text("No copyright, use freely")],
    ["wtpt", xyz(0.9642, 1.0, 0.8249)],
    ["rXYZ", xyz(0.4360747, 0.2225045, 0.0139322)],
    ["gXYZ", xyz(0.3850649, 0.7168786, 0.0971045)],
    ["bXYZ", xyz(0.1430804, 0.0606169, 0.7141733)],
    ["rTRC", curv()],
    ["gTRC", curv()],
    ["bTRC", curv()],
  ];
  const pad4 = (a: number[]) => [...a, ...new Array((4 - (a.length % 4)) % 4).fill(0)];
  const tableLen = 4 + tags.length * 12;
  let offset = 128 + tableLen;
  const table: number[] = u32(tags.length);
  const data: number[] = [];
  for (const [sig, body] of tags) {
    const padded = pad4(body);
    table.push(...enc(sig), ...u32(offset), ...u32(body.length));
    data.push(...padded);
    offset += padded.length;
  }
  const size = 128 + table.length + data.length;
  const header = [
    ...u32(size), ...enc("none"), 0x02, 0x10, 0, 0, ...enc("mntr"), ...enc("RGB "), ...enc("XYZ "),
    0x07, 0xea, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, // 2026-01-01 00:00:00, fixed so the output is deterministic
    ...enc("acsp"), ...enc("MSFT"), ...u32(0), ...u32(0), ...u32(0), ...u32(0), ...u32(0), ...u32(0), // flags, manufacturer, model, attributes (8 bytes), intent
    ...u32(s15(0.9642)), ...u32(s15(1.0)), ...u32(s15(0.8249)), // D50 illuminant
    ...enc("none"),
  ];
  while (header.length < 128) header.push(0);
  return new Uint8Array([...header.slice(0, 128), ...table, ...data]);
}

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildXmp(info: { title: string; created: Date; modified: Date; producer: string; part: 1 | 2 | 3; conformance: "B" }): string {
  const d = (x: Date) => x.toISOString().replace(/\.\d{3}Z$/, "Z");
  return `<?xpacket begin="${String.fromCharCode(0xfeff)}" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><pdfaid:part>${info.part}</pdfaid:part><pdfaid:conformance>${info.conformance}</pdfaid:conformance></rdf:Description>
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEsc(info.title)}</rdf:li></rdf:Alt></dc:title></rdf:Description>
<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><pdf:Producer>${xmlEsc(info.producer)}</pdf:Producer></rdf:Description>
<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><xmp:CreatorTool>${xmlEsc(info.producer)}</xmp:CreatorTool><xmp:CreateDate>${d(info.created)}</xmp:CreateDate><xmp:ModifyDate>${d(info.modified)}</xmp:ModifyDate></rdf:Description>
</rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;
}

/** Counts fonts whose glyphs aren't stored in the file (PDF/A requires them to be). */
export function countUnembeddedFonts(doc: PDFDocument): number {
  let n = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict) || obj.get(PDFName.of("Type"))?.toString() !== "/Font") continue;
    const sub = obj.get(PDFName.of("Subtype"))?.toString();
    if (sub === "/Type0" || sub === "/Type3") continue;
    const fd = obj.lookupMaybe(PDFName.of("FontDescriptor"), PDFDict);
    const embedded = fd && (fd.has(PDFName.of("FontFile")) || fd.has(PDFName.of("FontFile2")) || fd.has(PDFName.of("FontFile3")));
    if (!embedded) n++;
  }
  return n;
}

/** Removes features PDF/A forbids; returns what was taken out. */
export function stripForbidden(doc: PDFDocument): { javascript: number; attachments: number; actions: number } {
  const res = { javascript: 0, attachments: 0, actions: 0 };
  const drop = (d: PDFDict, key: string) => {
    if (!d.has(PDFName.of(key))) return false;
    d.delete(PDFName.of(key));
    return true;
  };
  const cat = doc.catalog;
  for (const k of ["OpenAction", "AA"]) if (drop(cat, k)) res.actions++;
  drop(cat, "Perms");
  const names = cat.lookupMaybe(PDFName.of("Names"), PDFDict);
  if (names) {
    if (drop(names, "JavaScript")) res.javascript++;
    if (drop(names, "EmbeddedFiles")) res.attachments++;
  }
  for (const page of doc.getPages()) {
    if (drop(page.node, "AA")) res.actions++;
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const a = annots.lookupMaybe(i, PDFDict);
      if (!a) continue;
      if (drop(a, "AA")) res.actions++;
      const kind = a.lookupMaybe(PDFName.of("A"), PDFDict)?.get(PDFName.of("S"))?.toString();
      if (kind === "/JavaScript" || kind === "/Launch" || kind === "/Sound" || kind === "/Movie") {
        drop(a, "A");
        if (kind === "/JavaScript") res.javascript++;
        else res.actions++;
      }
      // Annotations must be printable and neither hidden nor invisible.
      const f = a.lookupMaybe(PDFName.of("F"), PDFNumber)?.asNumber() ?? 0;
      a.set(PDFName.of("F"), doc.context.obj((f | 4) & ~(1 | 2 | 32)));
    }
  }
  return res;
}

/** Adds the identification, colour intent and file ID that make a document claim PDF/A. */
export function markAsPdfA(doc: PDFDocument, title: string, part: 1 | 2 | 3) {
  const now = new Date();
  const producer = "EZSignNow";
  doc.setTitle(title);
  doc.setProducer(producer);
  doc.setCreator(producer);
  doc.setCreationDate(doc.getCreationDate() ?? now);
  doc.setModificationDate(now);
  const created = doc.getCreationDate() ?? now;

  const ctx = doc.context;
  const xmp = ctx.register(ctx.stream(new TextEncoder().encode(buildXmp({ title, created, modified: now, producer, part, conformance: "B" })), { Type: "Metadata", Subtype: "XML" }));
  doc.catalog.set(PDFName.of("Metadata"), xmp);

  const icc = ctx.register(ctx.flateStream(buildSrgbProfile(), { N: 3 }));
  const intent = ctx.register(
    ctx.obj({
      Type: "OutputIntent",
      S: "GTS_PDFA1",
      OutputConditionIdentifier: PDFString.of("sRGB IEC61966-2.1"),
      Info: PDFString.of("sRGB IEC61966-2.1"),
      DestOutputProfile: icc,
    }),
  );
  doc.catalog.set(PDFName.of("OutputIntents"), ctx.obj([intent]));

  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  ctx.trailerInfo.ID = ctx.obj([PDFHexString.of(id), PDFHexString.of(id)]);
}

/** Converts each page to an image so no fonts are involved at all. */
async function rasterize(bytes: Uint8Array, dpi: number, ctx: ToolContext): Promise<PDFDocument> {
  const src = await pdfjsFor(bytes);
  const out = await PDFDocument.create();
  for (let i = 1; i <= src.numPages; i++) {
    ctx.progress(`Converting page ${i} of ${src.numPages}`, i / src.numPages);
    const page = await src.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const canvas = await renderPageToCanvas(page, dpi / 72);
    const img = await out.embedJpg(await canvasToBytes(canvas, "image/jpeg", 0.9));
    out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    await tick();
  }
  return out;
}

export async function pdfToPdfa(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const part = (num(o.part, 2) === 1 ? 1 : num(o.part, 2) === 3 ? 3 : 2) as 1 | 2 | 3;
  const mode = str(o.mode, "auto");
  const outs: OutputFile[] = [];
  for (const f of files) {
    ctx.progress(`Checking ${f.name}`);
    const doc = await loadPdf(f.bytes);
    const unembedded = countUnembeddedFonts(doc);
    const useImages = mode === "images" || (mode === "auto" && unembedded > 0);
    let target = doc;
    if (useImages) {
      target = await rasterize(f.bytes, num(o.dpi, 200), ctx);
      ctx.note?.(`${f.name}: ${mode === "images" ? "pages were converted to images as requested" : `${unembedded} font(s) aren't stored in the file, so pages were converted to images to meet the standard`}. Text is no longer selectable — run OCR afterwards if you need that.`);
    } else {
      const stripped = stripForbidden(target);
      const removed = [stripped.javascript && `${stripped.javascript} script(s)`, stripped.attachments && "attached files", stripped.actions && `${stripped.actions} automatic action(s)`].filter(Boolean);
      if (removed.length) ctx.note?.(`${f.name}: removed ${removed.join(", ")} because PDF/A doesn't allow them.`);
      if (unembedded > 0) ctx.note?.(`${f.name}: ${unembedded} font(s) aren't embedded; strict validators will reject this. Use “Convert pages to images” for a guaranteed result.`);
    }
    markAsPdfA(target, doc.getTitle() || baseName(f.name), part);
    outs.push(pdfOut(`${baseName(f.name)}-pdfa`, await target.save({ useObjectStreams: false })));
  }
  ctx.note?.("Always check files that must be certified with a PDF/A validator such as veraPDF; this tool applies the standard's markings but can't certify conformance.");
  return outs;
}
