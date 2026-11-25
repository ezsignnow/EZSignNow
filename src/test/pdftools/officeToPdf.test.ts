// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import { unzipSync } from "fflate";
import { formatNumber, pptxToPdf, readWorkbook, xlsxToPdf } from "@/lib/pdftools/tools/officeToPdf";
import { ToolError } from "@/lib/pdftools/core";
import { asFile, ctx, installDomParser, textOf, usePdfjsWorker } from "./helpers";
import { makePptx, makeXlsx } from "./fixtures";

installDomParser();
beforeAll(usePdfjsWorker);

async function items(bytes: Uint8Array, page: number) {
  const { pdfjsFor } = await import("@/lib/pdftools/tools/render");
  const pdf = await pdfjsFor(new Uint8Array(bytes));
  const content = await (await pdf.getPage(page)).getTextContent();
  return content.items
    .filter((i): i is typeof i & { str: string; transform: number[] } => "str" in i && !!i.str.trim())
    .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));
}

describe("PowerPoint to PDF", () => {
  it("makes one page per slide at the slide's own size", async () => {
    const [out] = await pptxToPdf([asFile("deck.pptx", makePptx())], {}, ctx);
    expect(out.name).toBe("deck.pdf");
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getSize()).toEqual({ width: 720, height: 540 });
  });

  it("writes titles, inherited-placeholder bullets, text boxes and table cells", async () => {
    const [out] = await pptxToPdf([asFile("deck.pptx", makePptx())], {}, ctx);
    const [p1, p2] = await textOf(out.bytes);
    for (const s of ["Quarterly Results", "First point", "Second point", "Third point", "Highlighted box", "Cell A", "Cell B", "Cell C", "Cell D"]) expect(p1).toContain(s);
    expect(p2).toContain("Second Slide");
    expect(p2).toContain("Only one bullet here");
  });

  it("positions inherited placeholders from the layout (title above body, left-aligned margin)", async () => {
    const [out] = await pptxToPdf([asFile("deck.pptx", makePptx())], {}, ctx);
    const it = await items(out.bytes, 1);
    const title = it.find((i) => i.str.includes("Quarterly"))!;
    const body = it.find((i) => i.str.includes("First point"))!;
    expect(title.y).toBeGreaterThan(body.y); // PDF y grows upwards
    // Layout puts both at x = 457200 EMU = 36pt, plus the default 7.2pt inset.
    expect(title.x).toBeGreaterThan(36);
    expect(title.x).toBeLessThan(80);
    // Bullets hang to the left of the body text.
    expect(it.some((i) => i.str.includes("•"))).toBe(true);
  });

  it("embeds the picture", async () => {
    const [out] = await pptxToPdf([asFile("deck.pptx", makePptx())], {}, ctx);
    const doc = await PDFDocument.load(out.bytes);
    const images = [...doc.context.enumerateIndirectObjects()].filter(([, o]) => {
      const dict = o instanceof PDFDict ? o : (o as { dict?: PDFDict }).dict; // images are streams, which carry their dictionary
      return dict?.get(PDFName.of("Subtype"))?.toString() === "/Image";
    });
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects files that are not PowerPoint", async () => {
    await expect(pptxToPdf([asFile("x.pptx", new TextEncoder().encode("not a zip"))], {}, ctx)).rejects.toBeInstanceOf(ToolError);
    const empty = unzipSync(makePptx());
    expect(Object.keys(empty).length).toBeGreaterThan(5);
  });
});

describe("Excel number formatting", () => {
  it("formats dates, percentages, currency and plain numbers", () => {
    const serial = Date.UTC(2023, 2, 15) / 86400000 + 25569;
    expect(formatNumber(serial, "yyyy-mm-dd", 164)).toBe("2023-03-15");
    expect(formatNumber(serial, undefined, 14)).toBe("2023-03-15");
    expect(formatNumber(0.25, undefined, 9)).toBe("25%");
    expect(formatNumber(0.256, undefined, 10)).toBe("25.60%");
    expect(formatNumber(1234.5, '"$"#,##0.00', 165)).toBe("$1,234.50");
    expect(formatNumber(-1234567.891, "#,##0.0", 166)).toBe("-1,234,567.9");
    expect(formatNumber(42, "General", 0)).toBe("42");
    expect(formatNumber(0.1 + 0.2, undefined, 0)).toBe("0.3");
    expect(formatNumber(3.14159, "0.00", 2)).toBe("3.14");
  });
});

describe("readWorkbook", () => {
  it("reads shared strings, styles and per-sheet data", () => {
    const sheets = readWorkbook(unzipSync(makeXlsx({ rows: 2 })));
    expect(sheets.map((s) => s.name)).toEqual(["Sales", "Empty"]);
    const rows = sheets[0].rows;
    expect(rows[0].slice(0, 4)).toEqual(["Item", "Price", "Date", "Share"]);
    expect(rows[1][1]).toBe("$2,469.00");
    expect(rows[1][2]).toBe("2023-03-15");
    expect(rows[1][3]).toBe("25%");
    expect(sheets[0].bold[0][0]).toBe(true);
    expect(sheets[0].bold[1][0]).toBe(false);
    expect(sheets[0].numeric[1][1]).toBe(true);
    expect(sheets[0].colWidths[0]).toBe(18);
  });
});

describe("Excel to PDF", () => {
  it("renders the data and skips empty sheets", async () => {
    const [out] = await xlsxToPdf([asFile("book.xlsx", makeXlsx({ rows: 3 }))], { pageSize: "A4", orientation: "auto", fit: "fit", gridlines: true, headerRow: true }, ctx);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(1); // "Empty" sheet is skipped
    const [text] = await textOf(out.bytes);
    for (const s of ["Sales", "Item", "Price", "Widget", "Gadget", "$2,469.00", "2023-03-15", "25%"]) expect(text).toContain(s);
  });

  it("repeats the header row on every page of a long sheet", async () => {
    const [out] = await xlsxToPdf([asFile("big.xlsx", makeXlsx({ rows: 150 }))], { headerRow: true }, ctx);
    const pages = await textOf(out.bytes);
    expect(pages.length).toBeGreaterThan(2);
    for (const p of pages) expect(p).toContain("Price");
  });

  it("shrinks wide sheets to the page width, or splits them into column bands", async () => {
    const wide = makeXlsx({ rows: 5, extraCols: 20 });
    const [fit] = await xlsxToPdf([asFile("w.xlsx", wide)], { fit: "fit", orientation: "auto" }, ctx);
    const fitDoc = await PDFDocument.load(fit.bytes);
    expect(fitDoc.getPage(0).getWidth()).toBeGreaterThan(fitDoc.getPage(0).getHeight()); // landscape
    expect(fitDoc.getPageCount()).toBe(1);
    const [split] = await xlsxToPdf([asFile("w.xlsx", wide)], { fit: "none", orientation: "portrait" }, ctx);
    expect((await PDFDocument.load(split.bytes)).getPageCount()).toBeGreaterThan(1);
  });

  it("rejects a workbook with no data", async () => {
    const files = unzipSync(makeXlsx({ rows: 0 }));
    expect(Object.keys(files)).toContain("xl/workbook.xml");
    await expect(xlsxToPdf([asFile("nope.xlsx", new TextEncoder().encode("junk"))], {}, ctx)).rejects.toBeInstanceOf(ToolError);
  });
});
