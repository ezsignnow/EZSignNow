import { describe, it, expect, vi } from "vitest";
import {
  activeStep,
  allSignersDone,
  canSignNow,
  decodeFieldMeta,
  decodeSignerData,
  displayStatus,
  encodeFieldMeta,
  encodeSignerData,
  insertFieldRows,
  isFieldComplete,
  normalizeFieldRow,
  parseChoices,
  signatureImage,
  signersWhoseTurn,
  signingPath,
  stepCount,
} from "@/lib/signing/workflow";

const signer = (id: string, order_num: number, status = "pending") => ({
  id,
  name: id.toUpperCase(),
  email: `${id}@example.com`,
  order_num,
  status,
});

describe("signing order", () => {
  it("lets everyone in the first step sign, and nobody after them", () => {
    const list = [signer("a", 1), signer("b", 1), signer("c", 2), signer("cc", 0)];
    expect(activeStep(list)).toBe(1);
    expect(signersWhoseTurn(list).map((s) => s.id)).toEqual(["a", "b"]);
    expect(canSignNow(list[2], list)).toBe(false);
    expect(canSignNow(list[3], list)).toBe(false); // copy recipient never signs
    expect(stepCount(list)).toBe(2);
  });

  it("moves to the next step only when the whole step has signed", () => {
    const halfway = [signer("a", 1, "signed"), signer("b", 1), signer("c", 2)];
    expect(activeStep(halfway)).toBe(1);
    const stepDone = [signer("a", 1, "signed"), signer("b", 1, "signed"), signer("c", 2)];
    expect(activeStep(stepDone)).toBe(2);
    expect(canSignNow(stepDone[2], stepDone)).toBe(true);
  });

  it("is complete when every signer has signed, ignoring copy recipients", () => {
    const list = [signer("a", 1, "signed"), signer("cc", 0)];
    expect(allSignersDone(list)).toBe(true);
    expect(activeStep(list)).toBeNull();
  });

  it("stops everyone once someone declines", () => {
    const list = [signer("a", 1, "declined"), signer("b", 1)];
    expect(activeStep(list)).toBeNull();
    expect(canSignNow(list[1], list)).toBe(false);
    expect(displayStatus("pending", list)).toBe("declined");
    expect(displayStatus("completed", list)).toBe("completed");
  });

  it("builds per-signer links", () => {
    expect(signingPath("doc1", "s 1")).toBe("/document/doc1/view?signer=s%201");
    expect(signingPath("doc1")).toBe("/document/doc1/view");
  });
});

describe("field metadata", () => {
  it("keeps plain types and tooltips untouched", () => {
    expect(encodeFieldMeta({ type: "text", tooltip: "Your job title" })).toEqual({
      field_type: "text",
      tooltip: "Your job title",
    });
  });

  it("round-trips new types through the legacy encoding", () => {
    const stored = encodeFieldMeta({ type: "dropdown", tooltip: "Pick one", options: ["Red", "Blue"] }, true);
    expect(stored.field_type).toBe("text");
    expect(decodeFieldMeta(stored.field_type, stored.tooltip)).toEqual({
      type: "dropdown",
      tooltip: "Pick one",
      options: ["Red", "Blue"],
    });
  });

  it("normalizes rows once", () => {
    const row = { field_type: "text", tooltip: encodeFieldMeta({ type: "initials" }, true).tooltip };
    const once = normalizeFieldRow(row);
    expect(once.field_type).toBe("initials");
    expect(normalizeFieldRow(once).field_type).toBe("initials");
  });

  it("parses choices from commas and new lines without duplicates", () => {
    expect(parseChoices("Yes, No\nMaybe\n\nYes")).toEqual(["Yes", "No", "Maybe"]);
  });

  it("retries with the legacy encoding when the check constraint rejects new types", async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: "23514", message: "violates check constraint" } })
      .mockResolvedValueOnce({ error: null });
    const client = { from: () => ({ insert }) };
    const result = await insertFieldRows(client, [
      { document_id: "d", __meta: { type: "number" } },
    ]);
    expect(result).toEqual({ error: null, legacy: true });
    expect(insert.mock.calls[0][0][0].field_type).toBe("number");
    expect(insert.mock.calls[1][0][0].field_type).toBe("text");
  });
});

describe("signer payload", () => {
  it("reads old bare signature images", () => {
    const old = { signature_data: "data:image/png;base64,AAAA" };
    expect(signatureImage(old)).toBe("data:image/png;base64,AAAA");
  });

  it("round-trips the JSON envelope", () => {
    const raw = encodeSignerData({ signature: "data:image/png;base64,BBBB", values: { f1: "42" }, senderEmail: "s@x.com" });
    const decoded = decodeSignerData(raw);
    expect(decoded.signature).toBe("data:image/png;base64,BBBB");
    expect(decoded.values).toEqual({ f1: "42" });
    expect(decoded.senderEmail).toBe("s@x.com");
  });

  it("checks required fields by type", () => {
    expect(isFieldComplete("checkbox", "true", {})).toBe(true);
    expect(isFieldComplete("checkbox", "", {})).toBe(false);
    expect(isFieldComplete("initials", undefined, { initials: "data:x" })).toBe(true);
    expect(isFieldComplete("text", "  ", {})).toBe(false);
  });
});
