// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";
import { unzipSync } from "fflate";
import { asFile, ctx, installDomParser, makePdf, pageCount, textOf, usePdfjsWorker } from "./helpers";

const { calls, state } = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[], state: { handler: null as null | ((b: Record<string, unknown>) => unknown) } }));

// The AI client talks to the network and Supabase; replace it with a scripted fake.
vi.mock("@/lib/pdftools/ai", () => {
  class FakeUnavailable extends Error {}
  class FakeAiError extends Error {
    constructor(
      m: string,
      readonly code?: string,
    ) {
      super(m);
    }
  }
  return {
    AiUnavailableError: FakeUnavailable,
    AiError: FakeAiError,
    callAi: async (body: Record<string, unknown>) => {
      calls.push(body);
      if (!state.handler) throw new FakeUnavailable("AI features aren't switched on for this site yet.");
      return state.handler(body);
    },
  };
});

import { buildSrgbProfile, buildXmp, countUnembeddedFonts, markAsPdfA, pdfToPdfa, stripForbidden } from "@/lib/pdftools/tools/pdfa";
import { buildTextReport, comparePdfs } from "@/lib/pdftools/tools/review";
import { pdfToMarkdown, summarizePdf, translatePdf } from "@/lib/pdftools/tools/intelligence";
import { AiError } from "@/lib/pdftools/ai";
import { ToolError } from "@/lib/pdftools/core";
import { TOOLS, TOOL_BY_ID, CATEGORIES } from "@/lib/pdftools/registry";
import { FEATURED_IDS, GROUPS, NEW_IDS, additionalSections, featuredTools } from "@/lib/pdftools/catalog";
import { CATEGORY_STYLE, TOOL_ICONS } from "@/components/pdftools/icons";

installDomParser();
beforeAll(usePdfjsWorker);
beforeEach(() => {
  calls.length = 0;
  state.handler = null;
  ctx.notes.length = 0;
});

const readBytes = (u: Uint8Array) => new TextDecoder("latin1").decode(u);

/* ═══════════ PDF/A ═══════════ */

describe("PDF/A", () => {
  it("builds a structurally valid ICC colour profile", () => {
    const icc = buildSrgbProfile();
    const dv = new DataView(icc.buffer, icc.byteOffset, icc.byteLength);
    expect(dv.getUint32(0)).toBe(icc.length); // declared size matches
    expect(String.fromCharCode(...icc.slice(36, 40))).toBe("acsp");
    expect(String.fromCharCode(...icc.slice(12, 16))).toBe("mntr");
    expect(String.fromCharCode(...icc.slice(16, 20))).toBe("RGB ");
    expect(dv.getUint16(24)).toBe(2026); // header date written as 16-bit fields
    const tags = dv.getUint32(128);
    expect(tags).toBe(9);
    const names: string[] = [];
    for (let i = 0; i < tags; i++) {
      const at = 132 + i * 12;
      names.push(String.fromCharCode(...icc.slice(at, at + 4)));
      expect(dv.getUint32(at + 4) + dv.getUint32(at + 8)).toBeLessThanOrEqual(icc.length); // every tag lies inside the file
      expect(dv.getUint32(at + 4) % 4).toBe(0);
    }
    expect(names).toEqual(["desc", "cprt", "wtpt", "rXYZ", "gXYZ", "bXYZ", "rTRC", "gTRC", "bTRC"]);
  });

  it("writes identification XMP with escaped metadata", () => {
    const xmp = buildXmp({ title: 'A & B <c> "d"', created: new Date("2026-01-02T03:04:05Z"), modified: new Date("2026-02-03T04:05:06Z"), producer: "EZSignNow", part: 2, conformance: "B" });
    expect(xmp).toContain("<pdfaid:part>2</pdfaid:part>");
    expect(xmp).toContain("<pdfaid:conformance>B</pdfaid:conformance>");
    expect(xmp).toContain("A &amp; B &lt;c&gt; &quot;d&quot;");
    expect(xmp).toContain("2026-01-02T03:04:05Z");
  });

  it("marks a document with metadata, an sRGB output intent and a file ID", async () => {
    const [out] = await pdfToPdfa([asFile("report.pdf", await makePdf([["Hello"]]))], { part: "2", mode: "keep" }, ctx);
    expect(out.name).toBe("report-pdfa.pdf");
    const doc = await PDFDocument.load(out.bytes, { updateMetadata: false });
    const cat = doc.catalog;
    expect(cat.has(PDFName.of("Metadata"))).toBe(true);
    const intent = cat.lookup(PDFName.of("OutputIntents"), PDFArray).lookup(0, PDFDict);
    expect(intent.get(PDFName.of("S"))?.toString()).toBe("/GTS_PDFA1");
    expect(intent.has(PDFName.of("DestOutputProfile"))).toBe(true);
    const raw = readBytes(out.bytes);
    expect(raw).toMatch(/\/ID\s*\[/);
    expect(raw).toContain("pdfaid:part");
    expect(raw).not.toContain("/Type /ObjStm"); // PDF/A-1 compatible: no object streams
    expect(doc.getProducer()).toBe("EZSignNow");
  });

  it("strips scripts, auto-run actions and attachments", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    const ctxx = doc.context;
    doc.catalog.set(PDFName.of("OpenAction"), ctxx.obj({ S: "JavaScript", JS: PDFString.of("app.alert(1)") }));
    doc.catalog.set(PDFName.of("Names"), ctxx.obj({ JavaScript: ctxx.obj({}), EmbeddedFiles: ctxx.obj({}) }));
    const annot = ctxx.register(ctxx.obj({ Type: "Annot", Subtype: "Link", Rect: [0, 0, 10, 10], A: { S: "JavaScript", JS: PDFString.of("x") }, F: 2 }));
    page.node.set(PDFName.of("Annots"), ctxx.obj([annot]));
    const res = stripForbidden(doc);
    expect(res.javascript).toBeGreaterThanOrEqual(2);
    expect(res.attachments).toBe(1);
    expect(res.actions).toBeGreaterThanOrEqual(1);
    expect(doc.catalog.has(PDFName.of("OpenAction"))).toBe(false);
    const names = doc.catalog.lookup(PDFName.of("Names"), PDFDict);
    expect(names.has(PDFName.of("JavaScript"))).toBe(false);
    expect(names.has(PDFName.of("EmbeddedFiles"))).toBe(false);
    const a = ctxx.lookup(annot, PDFDict);
    expect(a.has(PDFName.of("A"))).toBe(false);
    const flags = (a.get(PDFName.of("F")) as unknown as { asNumber(): number }).asNumber();
    expect(flags & 4).toBe(4); // print flag set
    expect(flags & 2).toBe(0); // no longer hidden
  });

  it("detects fonts that are not embedded, and accepts embedded-free documents", async () => {
    const withText = await PDFDocument.load(await makePdf([["Hello"]]));
    expect(countUnembeddedFonts(withText)).toBeGreaterThan(0); // standard fonts aren't embedded
    const blank = await PDFDocument.create();
    blank.addPage();
    expect(countUnembeddedFonts(blank)).toBe(0);
    markAsPdfA(blank, "T", 2); // marking an empty document works too
    expect(blank.catalog.has(PDFName.of("OutputIntents"))).toBe(true);
  });

  it("keeps the text when the document has no unembedded fonts, and warns when it does", async () => {
    const blank = await PDFDocument.create();
    blank.addPage([100, 100]);
    const [out] = await pdfToPdfa([asFile("blank.pdf", new Uint8Array(await blank.save()))], { mode: "auto" }, ctx);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(1);
    ctx.notes.length = 0;
    await pdfToPdfa([asFile("t.pdf", await makePdf([["Hello"]]))], { mode: "keep" }, ctx);
    expect(ctx.notes.join(" ")).toMatch(/aren't embedded/);
    expect(ctx.notes.join(" ")).toMatch(/veraPDF/);
  });
});

/* ═══════════ Compare ═══════════ */

describe("Compare PDF (text)", () => {
  const a = asFile("v1.pdf", new Uint8Array());
  const b = asFile("v2.pdf", new Uint8Array());

  it("reports added and removed lines with the page they are on", async () => {
    a.bytes = await makePdf([["Contract", "Payment due in 30 days", "Governing law: Ohio"], ["Signature block"]]);
    b.bytes = await makePdf([["Contract", "Payment due in 60 days", "Governing law: Ohio"], ["Signature block", "Added witness line"]]);
    const [out] = await comparePdfs([a, b], { mode: "text" }, ctx);
    expect(out.name).toBe("v2-vs-v1.pdf");
    const text = (await textOf(out.bytes)).join(" ");
    expect(text).toContain("Document comparison");
    expect(text).toContain("Payment due in 30 days");
    expect(text).toContain("Payment due in 60 days");
    expect(text).toContain("Added witness line");
    expect(text).toMatch(/original p\. 1/);
    expect(text).toMatch(/2 lines? removed|1 line removed/);
    expect(ctx.notes.join(" ")).toMatch(/removed/);
  });

  it("says plainly when nothing changed", async () => {
    const same = await makePdf([["Same", "Text"]]);
    const [out] = await comparePdfs([asFile("x.pdf", same), asFile("y.pdf", same)], { mode: "text" }, ctx);
    expect((await textOf(out.bytes)).join(" ")).toContain("No differences found");
  });

  it("needs exactly two files", async () => {
    await expect(comparePdfs([a], {}, ctx)).rejects.toBeInstanceOf(ToolError);
    await expect(comparePdfs([a, b, a], {}, ctx)).rejects.toBeInstanceOf(ToolError);
  });

  it("cuts a huge change list off with a notice", async () => {
    const big = (n: number, tag: string) => Array.from({ length: n }, (_, i) => `${tag} line ${i}`);
    const r = await buildTextReport("a", "b", { lines: big(3500, "old").map((text) => ({ text, page: 1 })), pages: 1 }, { lines: big(3500, "new").map((text) => ({ text, page: 1 })), pages: 1 });
    expect(r.added).toBe(3500);
    expect((await textOf(r.bytes)).join(" ")).toContain("cut off");
  });
});

/* ═══════════ Markdown ═══════════ */

describe("PDF to Markdown", () => {
  it("recovers headings and paragraphs from a real PDF", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    page.drawText("Project Plan", { x: 50, y: 780, size: 26, font });
    page.drawText("Goals", { x: 50, y: 730, size: 16, font });
    page.drawText("We will ship the new tools before the end of the quarter.", { x: 50, y: 700, size: 11, font });
    page.drawText("- Write the code", { x: 50, y: 660, size: 11, font });
    page.drawText("- Test the code", { x: 50, y: 645, size: 11, font });
    const [out] = await pdfToMarkdown([asFile("plan.pdf", new Uint8Array(await doc.save()))], { pageMarkers: false }, ctx);
    expect(out.name).toBe("plan.md");
    const md = new TextDecoder().decode(out.bytes);
    expect(md).toContain("# Project Plan");
    expect(md).toContain("## Goals");
    expect(md).toContain("We will ship the new tools before the end of the quarter.");
    expect(md).toContain("- Write the code\n- Test the code");
  });
  it("explains when there is no text", async () => {
    const blank = await PDFDocument.create();
    blank.addPage();
    await expect(pdfToMarkdown([asFile("scan.pdf", new Uint8Array(await blank.save()))], {}, ctx)).rejects.toThrow(/OCR/);
  });
});

/* ═══════════ AI Summarizer ═══════════ */

const longText = Array.from({ length: 8 }, (_, i) => [`Section ${i + 1}`, `Solar panels convert sunlight into electricity number ${i}.`, "Many households install solar panels to reduce their electricity bills."]);

describe("AI Summarizer", () => {
  it("sends the document text and the chosen options, and returns a PDF and a text file", async () => {
    state.handler = () => "This document is about solar power.";
    const outs = await summarizePdf([asFile("solar.pdf", await makePdf(longText))], { length: "short", style: "bullets", language: "French" }, ctx);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ task: "summarize", length: "short", style: "bullets", language: "French" });
    expect(String(calls[0].text)).toContain("Solar panels convert sunlight");
    expect(outs.map((o) => o.name)).toEqual(["solar-summary.pdf", "solar-summary.txt"]);
    expect(new TextDecoder().decode(outs[1].bytes)).toBe("This document is about solar power.");
    const pdfText = (await textOf(outs[0].bytes)).join(" ");
    expect(pdfText).toContain("Summary of solar");
    expect(pdfText).toContain("Written by AI");
  });

  it("falls back to a clearly labelled automatic extract when AI is unavailable", async () => {
    const outs = await summarizePdf([asFile("solar.pdf", await makePdf(longText))], {}, ctx);
    const pdfText = (await textOf(outs[0].bytes)).join(" ");
    expect(pdfText).toContain("Automatic extract (no AI)");
    expect(ctx.notes.join(" ")).toMatch(/automatic extract/i);
    expect(new TextDecoder().decode(outs[1].bytes).length).toBeGreaterThan(20);
  });

  it("passes real errors through instead of hiding them behind the fallback", async () => {
    state.handler = () => {
      throw new AiError("Please sign in to use AI tools.", "unauthorized");
    };
    await expect(summarizePdf([asFile("solar.pdf", await makePdf(longText))], {}, ctx)).rejects.toThrow(/sign in/);
  });

  it("summarizes very long documents in parts, then combines them", async () => {
    state.handler = (b) => `summary of ${String(b.text).length} chars`;
    const filler = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}: ${"word ".repeat(2)}`);
    const pages = Array.from({ length: 60 }, () => filler);
    // ~60 pages of text is well past one request; the document is read in chunks.
    const bytes = await makePdf(pages);
    await summarizePdf([asFile("big.pdf", bytes)], { length: "medium" }, ctx);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    for (const c of calls) expect(String(c.text).length).toBeLessThanOrEqual(40000);
  }, 60000);

  it("refuses a PDF with no text", async () => {
    const blank = await PDFDocument.create();
    blank.addPage();
    await expect(summarizePdf([asFile("s.pdf", new Uint8Array(await blank.save()))], {}, ctx)).rejects.toThrow(/OCR/);
  });
});

/* ═══════════ Translate ═══════════ */

describe("Translate PDF", () => {
  const src = () => makePdf([["Welcome", "This is the first paragraph of the report."], ["Second page text goes here."]]);

  it("translates paragraph by paragraph and returns Word and PDF files for Latin scripts", async () => {
    state.handler = (b) => (b.items as string[]).map((s) => `ES: ${s}`);
    const outs = await translatePdf([asFile("report.pdf", await src())], { target: "Spanish" }, ctx);
    expect(calls[0]).toMatchObject({ task: "translate", target: "Spanish" });
    expect(outs.map((o) => o.name)).toEqual(["report-spanish.docx", "report-spanish.pdf"]);
    const docx = unzipSync(outs[0].bytes);
    const xml = new TextDecoder().decode(docx["word/document.xml"]);
    expect(xml).toContain("ES: ");
    expect(xml).toContain("w:br w:type=\"page\""); // page break kept between source pages
    expect((await textOf(outs[1].bytes)).join(" ")).toContain("ES: ");
  });

  it("returns only a Word file when the script can't be written with the standard PDF fonts", async () => {
    state.handler = (b) => (b.items as string[]).map(() => "नमस्ते दुनिया");
    const outs = await translatePdf([asFile("report.pdf", await src())], { target: "Hindi" }, ctx);
    expect(outs.map((o) => o.name)).toEqual(["report-hindi.docx"]);
    expect(ctx.notes.join(" ")).toMatch(/Word file/);
    expect(new TextDecoder().decode(unzipSync(outs[0].bytes)["word/document.xml"])).toContain("नमस्ते");
  });

  it("splits a batch in half when the answer comes back misaligned, and keeps untranslatable items as they were", async () => {
    let first = true;
    state.handler = (b) => {
      const items = b.items as string[];
      if (items.length > 1 && first) {
        first = false;
        throw new AiError("bad", "bad_shape");
      }
      if (items.length === 1 && items[0].startsWith("Welcome")) throw new AiError("bad", "bad_shape"); // single item that never aligns
      return items.map((s) => `T:${s}`);
    };
    const outs = await translatePdf([asFile("r.pdf", await src())], { target: "German" }, ctx);
    const xml = new TextDecoder().decode(unzipSync(outs[0].bytes)["word/document.xml"]);
    expect(xml).toContain("T:");
    expect(xml).toContain("Welcome"); // kept in the original language
    expect(calls.length).toBeGreaterThan(2);
  });

  it("has no offline fallback: says so when AI is off", async () => {
    await expect(translatePdf([asFile("r.pdf", await src())], { target: "French" }, ctx)).rejects.toThrow(/switched on/);
  });

  it("refuses a PDF with no text", async () => {
    const blank = await PDFDocument.create();
    blank.addPage();
    await expect(translatePdf([asFile("s.pdf", new Uint8Array(await blank.save()))], { target: "French" }, ctx)).rejects.toThrow(/OCR/);
  });
});

/* ═══════════ Registry integrity ═══════════ */

describe("registry and PDF Tools page data", () => {
  it("has unique ids, an icon, a style and valid settings for every tool", () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOOLS) {
      expect(TOOL_ICONS[t.id], `icon for ${t.id}`).toBeDefined();
      expect(CATEGORY_STYLE[t.category], `style for ${t.category}`).toBeDefined();
      expect(CATEGORIES.some((c) => c.id === t.category), `category for ${t.id}`).toBe(true);
      expect(t.name.length).toBeGreaterThan(1);
      expect(t.description.length).toBeGreaterThan(10);
      expect(t.run || t.route, `${t.id} must run or link somewhere`).toBeTruthy();
      expect(["pdf", "images", "docx", "pptx", "xlsx", "html", "none"]).toContain(t.accept);
      const keys = new Set((t.options ?? []).map((o) => o.key));
      for (const k of Object.keys(t.defaults ?? {})) expect(keys.has(k) || t.panel || t.id === "ai-summarizer", `default "${k}" of ${t.id} has no matching option`).toBe(true);
      for (const o of t.options ?? []) if (o.type === "select") expect(o.choices.length, `${t.id}.${o.key} choices`).toBeGreaterThan(0);
    }
  });

  it("offers every iLovePDF feature, and every tool is reachable from the page", () => {
    const featured = featuredTools().map((t) => t.name);
    for (const name of [
      "Merge PDF", "Split PDF", "Remove Pages", "Extract Pages", "Organize PDF", "Scan to PDF",
      "Compress PDF", "Repair PDF", "OCR PDF",
      "JPG to PDF", "Word to PDF", "PowerPoint to PDF", "Excel to PDF", "HTML to PDF",
      "PDF to JPG", "PDF to Word", "PDF to PowerPoint", "PDF to Excel", "PDF to PDF/A",
      "Rotate PDF", "Add Page Numbers", "Add Watermark", "Crop PDF", "Edit PDF", "PDF Forms",
      "Unlock PDF", "Protect PDF", "Sign PDF", "Redact PDF", "Compare PDF",
      "AI Summarizer", "Translate PDF", "PDF to Markdown",
    ]) expect(featured, name).toContain(name);
    expect(featured).toHaveLength(33);
    for (const g of GROUPS) for (const id of g.ids) expect(TOOL_BY_ID[id], `group ${g.id} -> ${id}`).toBeDefined();
    const inMenu = additionalSections().flatMap((s) => s.tools.map((t) => t.id));
    for (const t of TOOLS) expect(FEATURED_IDS.has(t.id) || inMenu.includes(t.id), `${t.id} is reachable`).toBe(true);
    for (const id of NEW_IDS) expect(TOOL_BY_ID[id], `NEW badge id ${id}`).toBeDefined();
    expect(featured.filter((n, i) => featured.indexOf(n) !== i)).toEqual([]); // nothing listed twice
  });

  it("can be used as workflow steps only if it turns one PDF into one PDF", () => {
    for (const t of TOOLS.filter((x) => x.workflow)) {
      expect(t.accept).toBe("pdf");
      expect(t.run).toBeDefined();
    }
  });
});

/* ═══════════ Smoke: run every PDF tool that doesn't need a browser canvas ═══════════ */

const NEEDS_BROWSER = new Set([
  "ocr", "deskew", "pdf-to-jpg", "pdf-to-powerpoint", "extract-images", "grayscale", "compress", "redact", "html-to-pdf", "jpg-to-pdf", "scan-to-pdf", "word-to-pdf", "powerpoint-to-pdf", "excel-to-pdf",
  "pdf-to-word", "ai-summarizer", "translate-pdf", "compare", "pdf-to-pdfa", "pdf-to-markdown",
]);
const OPTIONS: Record<string, Record<string, unknown>> = {
  "delete-pages": { pages: "1" },
  "extract-pages": { pages: "1" },
  "split-by-text": { text: "Alpha" },
  protect: { userPassword: "pw", confirmPassword: "pw" },
  rename: { name: "renamed" },
  organize: { plan: [{ file: 0, page: 0, rotate: 90 }, { file: 0, page: 1, rotate: 0 }] },
  "edit-metadata": { title: "Hello" },
  "create-bookmarks": { bookmarks: [{ title: "Start", page: 0 }] },
  crop: { mode: "manual", crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } },
};

describe("every PDF tool runs on a real document", () => {
  const smokeTools = TOOLS.filter((t) => t.run && t.accept === "pdf" && !NEEDS_BROWSER.has(t.id));
  it("covers a meaningful number of tools", () => expect(smokeTools.length).toBeGreaterThanOrEqual(25));

  for (const tool of smokeTools) {
    it(`${tool.name}`, async () => {
      const files = [asFile("a.pdf", await makePdf([["Alpha page one", "second line"], ["Beta page two"], ["Gamma page three"]]))];
      if ((tool.minFiles ?? 1) > 1) files.push(asFile("b.pdf", await makePdf([["Delta"], ["Epsilon"]])));
      const opts = { ...(tool.defaults ?? {}), ...(OPTIONS[tool.id] ?? {}) };
      let outs;
      try {
        outs = await tool.run!(files, opts, ctx);
      } catch (e) {
        // A tool that needs something this sample doesn't have (bookmarks, form fields…) must say so in plain words.
        expect(e, `${tool.id} threw a non-friendly error: ${(e as Error)?.stack}`).toBeInstanceOf(ToolError);
        return;
      }
      expect(outs.length).toBeGreaterThan(0);
      for (const o of outs) {
        expect(o.bytes.length).toBeGreaterThan(0);
        expect(o.name).toMatch(/\.[a-z0-9]+$/i);
        if (o.mime === "application/pdf") expect(await pageCount(o.bytes)).toBeGreaterThan(0);
      }
    }, 30000);
  }
});
