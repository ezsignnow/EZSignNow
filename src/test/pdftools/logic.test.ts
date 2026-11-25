import { describe, expect, it } from "vitest";
import { diffSequences, normalizeLine } from "@/lib/pdftools/diff";
import { applyScanFilter, otsuThreshold } from "@/lib/pdftools/imageFilters";
import { buildMatchers, diffPixels, findTextBoxes, toHunks, type TextItem } from "@/lib/pdftools/tools/review";
import { extractiveSummary, linesToMarkdown } from "@/lib/pdftools/tools/intelligence";
import type { TextLine } from "@/lib/pdftools/textModel";

/* ───────────── diff ───────────── */

function apply(ops: ReturnType<typeof diffSequences>) {
  return {
    a: ops.filter((o) => o.type !== "add").map((o) => o.value),
    b: ops.filter((o) => o.type !== "remove").map((o) => o.value),
  };
}

describe("diffSequences", () => {
  it("finds nothing in identical input", () => {
    const ops = diffSequences(["a", "b", "c"], ["a", "b", "c"]);
    expect(ops.every((o) => o.type === "equal")).toBe(true);
  });
  it("detects insertions, deletions and replacements", () => {
    expect(diffSequences(["a", "c"], ["a", "b", "c"]).filter((o) => o.type !== "equal")).toEqual([{ type: "add", b: 1, value: "b" }]);
    expect(diffSequences(["a", "b", "c"], ["a", "c"]).filter((o) => o.type !== "equal")).toEqual([{ type: "remove", a: 1, value: "b" }]);
    const rep = diffSequences(["a", "b", "c"], ["a", "X", "c"]).filter((o) => o.type !== "equal");
    expect(rep.map((o) => o.type).sort()).toEqual(["add", "remove"]);
  });
  it("handles empty sides", () => {
    expect(diffSequences([], ["x"]).map((o) => o.type)).toEqual(["add"]);
    expect(diffSequences(["x"], []).map((o) => o.type)).toEqual(["remove"]);
    expect(diffSequences([], [])).toEqual([]);
  });
  it("reconstructs both inputs exactly for random edits (property test)", () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let round = 0; round < 60; round++) {
      const a = Array.from({ length: Math.floor(rnd() * 40) }, () => String(Math.floor(rnd() * 8)));
      const b = a.filter(() => rnd() > 0.2);
      for (let k = 0; k < rnd() * 6; k++) b.splice(Math.floor(rnd() * (b.length + 1)), 0, `n${Math.floor(rnd() * 5)}`);
      const r = apply(diffSequences(a, b));
      expect(r.a).toEqual(a);
      expect(r.b).toEqual(b);
    }
  });
  it("produces a minimal script for a single change in a long list", () => {
    const a = Array.from({ length: 2000 }, (_, i) => `line ${i}`);
    const b = [...a];
    b[1000] = "changed";
    const changes = diffSequences(a, b).filter((o) => o.type !== "equal");
    expect(changes).toHaveLength(2);
  });
  it("copes with completely different large inputs without hanging", () => {
    const a = Array.from({ length: 3000 }, (_, i) => `a${i}`);
    const b = Array.from({ length: 3000 }, (_, i) => `b${i}`);
    const r = apply(diffSequences(a, b));
    expect(r.a).toEqual(a);
    expect(r.b).toEqual(b);
  });
  it("normalizes whitespace", () => expect(normalizeLine("  a \t b\n")).toBe("a b"));
});

describe("toHunks", () => {
  it("groups nearby changes and keeps context", () => {
    const a = Array.from({ length: 30 }, (_, i) => `l${i}`);
    const b = [...a];
    b[5] = "X";
    b[7] = "Y";
    b[25] = "Z";
    const hunks = toHunks(diffSequences(a, b), 2);
    expect(hunks).toHaveLength(2); // 5 and 7 merge, 25 is separate
    expect(hunks[0].ops.some((o) => o.type === "equal")).toBe(true);
  });
  it("returns no hunks when nothing changed", () => expect(toHunks(diffSequences(["a"], ["a"]))).toEqual([]));
});

/* ───────────── scan filters ───────────── */

const rgba = (grays: number[]) => new Uint8ClampedArray(grays.flatMap((g) => [g, g, g, 255]));

describe("scan filters", () => {
  it("otsu separates dark ink from light paper", () => {
    const t = otsuThreshold(Uint8Array.from([...Array(50).fill(20), ...Array(50).fill(230)]));
    expect(t).toBeGreaterThanOrEqual(20);
    expect(t).toBeLessThan(230);
  });
  it("black and white produces only pure black and white", () => {
    const px = rgba([10, 30, 200, 240, 15, 250, 60, 220]);
    applyScanFilter(px, "bw");
    const values = new Set(Array.from({ length: px.length / 4 }, (_, i) => px[i * 4]));
    expect([...values].sort()).toEqual([0, 255]);
  });
  it("document mode turns off-white paper pure white and keeps ink dark", () => {
    const paper = Array(95).fill(215);
    const ink = Array(5).fill(40);
    const px = rgba([...paper, ...ink]);
    applyScanFilter(px, "document");
    expect(px[0]).toBe(255);
    expect(px[96 * 4]).toBeLessThan(60);
  });
  it("grayscale keeps channels equal; original leaves pixels alone", () => {
    const px = new Uint8ClampedArray([200, 100, 50, 255]);
    const orig = new Uint8ClampedArray(px);
    applyScanFilter(px, "original");
    expect(px).toEqual(orig);
    applyScanFilter(px, "grayscale");
    expect(px[0]).toBe(px[1]);
    expect(px[1]).toBe(px[2]);
  });
});

/* ───────────── redaction matching ───────────── */

const item = (str: string, x: number, width: number, y = 100, size = 10): TextItem => ({ str, x, y, width, size });

describe("redaction matching", () => {
  it("finds literal terms case-insensitively and treats punctuation literally", () => {
    const boxes = findTextBoxes([item("Contact Jane Smith today", 50, 120)], buildMatchers("jane smith", [], false));
    expect(boxes).toHaveLength(1);
    expect(boxes[0].x).toBeGreaterThan(50);
    expect(boxes[0].w).toBeLessThan(120);
    expect(findTextBoxes([item("axb", 0, 30)], buildMatchers("a.b", [], false))).toHaveLength(0);
    expect(findTextBoxes([item("a.b", 0, 30)], buildMatchers("a.b", [], false))).toHaveLength(1);
  });
  it("respects match case", () => {
    expect(findTextBoxes([item("ACME corp", 0, 90)], buildMatchers("acme", [], true))).toHaveLength(0);
    expect(findTextBoxes([item("ACME corp", 0, 90)], buildMatchers("ACME", [], true))).toHaveLength(1);
  });
  it("covers a match that spans two text fragments with a box on each", () => {
    const boxes = findTextBoxes([item("mail jane.doe@", 50, 70), item("example.com now", 120, 80)], buildMatchers("", ["email"], false));
    expect(boxes).toHaveLength(2);
    expect(boxes[0].x).toBeLessThan(boxes[1].x);
  });
  it("detects emails, phones, SSNs and card numbers", () => {
    const text = "Mail a.b@c.io call (555) 123-4567 ssn 123-45-6789 card 4111 1111 1111 1111 end";
    const one = (preset: string) => findTextBoxes([item(text, 0, text.length * 5)], buildMatchers("", [preset], false));
    expect(one("email")).toHaveLength(1);
    expect(one("phone").length).toBeGreaterThanOrEqual(1);
    expect(one("ssn")).toHaveLength(1);
    expect(one("card")).toHaveLength(1);
  });
  it("ignores text with nothing to redact and empty term lines", () => {
    expect(findTextBoxes([item("nothing here", 0, 60)], buildMatchers("\n  \n", [], false))).toEqual([]);
    expect(findTextBoxes([item("nothing here", 0, 60)], buildMatchers("zzz", [], false))).toEqual([]);
  });
  it("keeps separate lines separate", () => {
    const boxes = findTextBoxes([item("secret", 0, 40, 100), item("secret", 0, 40, 130)], buildMatchers("secret", [], false));
    expect(boxes).toHaveLength(2);
    expect(boxes[0].y).not.toBe(boxes[1].y);
  });
});

describe("visual diff pixels", () => {
  const px = (grays: number[]) => rgba(grays);
  it("reports no change for identical pages", () => {
    const a = px([255, 0, 255, 255, 0, 255, 255, 255, 255]);
    const out = new Uint8ClampedArray(a.length);
    expect(diffPixels(a, a, 3, 3, out)).toBe(0);
  });
  it("colours removed ink red and added ink green", () => {
    const w = 9;
    const blank = Array(w * w).fill(255);
    const onlyA = [...blank];
    onlyA[0] = 0;
    const onlyB = [...blank];
    onlyB[w * w - 1] = 0;
    const out = new Uint8ClampedArray(w * w * 4);
    const changed = diffPixels(px(onlyA), px(onlyB), w, w, out);
    expect(changed).toBe(2);
    expect([out[0], out[1], out[2]]).toEqual([220, 38, 38]);
    const last = (w * w - 1) * 4;
    expect([out[last], out[last + 1], out[last + 2]]).toEqual([22, 163, 74]);
  });
  it("tolerates a one-pixel shift", () => {
    const w = 7;
    const a = Array(w * w).fill(255);
    const b = [...a];
    a[3 * w + 3] = 0;
    b[3 * w + 4] = 0;
    expect(diffPixels(px(a), px(b), w, w, new Uint8ClampedArray(w * w * 4))).toBe(0);
  });
});

/* ───────────── markdown and summaries ───────────── */

const line = (text: string, y: number, size = 10, x = 50, pieces?: string[]): TextLine => {
  const ps = (pieces ?? [text]).map((t, i) => ({ x: x + i * 150, end: x + i * 150 + t.length * 5, text: t, size }));
  return { x, y, size, pieces: ps, text };
};

describe("linesToMarkdown", () => {
  it("turns big text into headings, wraps paragraphs and lists items", () => {
    const md = linesToMarkdown([
      {
        width: 600,
        lines: [
          line("Annual Report", 60, 24),
          line("Overview", 100, 15),
          line("This is the first line of a", 130),
          line("paragraph that wraps.", 142),
          line("• Alpha item", 180),
          line("• Beta item", 195),
          line("1. First step", 230),
          line("2. Second step", 245),
        ],
      },
    ]);
    expect(md).toContain("# Annual Report");
    expect(md).toContain("## Overview");
    expect(md).toContain("This is the first line of a paragraph that wraps.");
    expect(md).toContain("- Alpha item\n- Beta item");
    expect(md).toContain("1. First step\n2. Second step");
  });
  it("builds a table from aligned rows", () => {
    const md = linesToMarkdown([
      { width: 600, lines: [line("Name  Qty  Price", 100, 10, 50, ["Name", "Qty", "Price"]), line("a", 114, 10, 50, ["Apple", "3", "1.50"]), line("b", 128, 10, 50, ["Pear", "5", "2.00"])] },
    ]);
    expect(md).toContain("| Name | Qty | Price |");
    expect(md).toContain("| --- | --- | --- |");
    expect(md).toContain("| Apple | 3 | 1.50 |");
  });
  it("heals hyphenated line breaks, escapes markdown characters and adds page markers", () => {
    const md = linesToMarkdown(
      [
        { width: 600, lines: [line("An inter-", 100), line("national *deal*", 112)] },
        { width: 600, lines: [line("Page two", 100)] },
      ],
      { pageMarkers: true },
    );
    expect(md).toContain("international \\*deal\\*");
    expect(md).toContain("<!-- Page 2 -->");
  });
});

describe("extractiveSummary", () => {
  const text =
    "Solar panels convert sunlight into electricity for homes and businesses. " +
    "Solar energy adoption has grown quickly as panel prices have fallen across many markets. " +
    "Many households now install solar panels to reduce their electricity bills. " +
    "The weather today was pleasant and mild with light winds in the afternoon. " +
    "Governments support solar energy with incentives that lower installation costs for panels.";
  it("returns the requested number of sentences, in original order", () => {
    const s = extractiveSummary(text, 2, false);
    const sentences = s.split(/(?<=\.)\s/);
    expect(sentences).toHaveLength(2);
    expect(text.indexOf(sentences[0])).toBeLessThan(text.indexOf(sentences[1]));
  });
  it("prefers sentences about the dominant topic over off-topic ones", () => {
    expect(extractiveSummary(text, 3, false)).not.toContain("weather");
  });
  it("formats bullets and survives short input", () => {
    expect(extractiveSummary(text, 2, true).split("\n").every((l) => l.startsWith("- "))).toBe(true);
    expect(extractiveSummary("Tiny.", 3, false)).toBe("Tiny.");
  });
});
