import { describe, it, expect } from "vitest";
import { PageTranslator, buildPhraseBook } from "@/i18n/pageTranslator";

const EN = "1\tUpload, sign, done\n2\t{0} of {1} signed\n3\tSave\n4\tWork email\n5\tEmail\n";
const HI = "1\tअपलोड करें, हस्ताक्षर करें, हो गया\n2\t{1} में से {0} ने हस्ताक्षर किए\n3\tसहेजें\n4\tकार्य ईमेल\n5\tईमेल\n";
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("PageTranslator", () => {
  it("translates text, patterns, decorations and attributes, and restores English", async () => {
    document.body.innerHTML = `<div id="root"><h2> Upload, sign, done </h2><span id="p">2 of 3 signed</span><label id="l">Email:</label><input id="i" placeholder="Work email"><p id="u">Save the date</p><div data-no-translate><b id="x">Save</b></div></div>`;
    const tr = new PageTranslator();
    tr.start(document.body);
    tr.setPhraseBook(buildPhraseBook(EN, HI));
    const $ = (id: string) => document.getElementById(id)!;
    expect(document.querySelector("h2")!.textContent).toBe(" अपलोड करें, हस्ताक्षर करें, हो गया ");
    expect($("p").textContent).toBe("3 में से 2 ने हस्ताक्षर किए");
    expect($("l").textContent).toBe("ईमेल:");
    expect($("i").getAttribute("placeholder")).toBe("कार्य ईमेल");
    expect($("u").textContent).toBe("Save the date"); // partial matches are left alone
    expect($("x").textContent).toBe("Save"); // opted out

    // New nodes and React-style text updates are picked up
    const b = document.createElement("button");
    b.textContent = "Save";
    $("root").appendChild(b);
    await flush();
    expect(b.textContent).toBe("सहेजें");
    $("p").firstChild!.nodeValue = "3 of 3 signed";
    await flush();
    expect($("p").textContent).toBe("3 में से 3 ने हस्ताक्षर किए");

    // Back to English
    tr.setPhraseBook(new Map());
    expect(b.textContent).toBe("Save");
    expect($("p").textContent).toBe("3 of 3 signed");
    expect($("i").getAttribute("placeholder")).toBe("Work email");
    tr.stop();
  });
});
