// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { envelopeRecipients, allOnEnvelope } from "../../api/_lib/documentRecipients.js";

const DOC = "2b7c2f4e-1111-4222-8333-444455556666";
const env = { url: "https://example.supabase.co", anonKey: "anon-key" };

function rowsFetch(rows: unknown, ok = true) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(rows), { status: ok ? 200 : 401 }));
}

describe("email endpoints only send to a document's envelope", () => {
  it("collects signatory and sender addresses, scoped to the document", async () => {
    const f = rowsFetch([
      { email: "Signer@Example.com", signature_data: JSON.stringify({ v: 2, senderEmail: "owner@example.com" }) },
      { email: "cc@example.com", signature_data: null },
    ]);
    const allowed = await envelopeRecipients(DOC, "Bearer user-token", env, f);
    expect([...allowed].sort()).toEqual(["cc@example.com", "owner@example.com", "signer@example.com"]);
    const [url, init] = f.mock.calls[0];
    expect(url).toContain(`document_id=eq.${DOC}`);
    const h = init!.headers as Record<string, string>;
    expect(h["x-signing-document"]).toBe(DOC);
    expect(h.Authorization).toBe("Bearer user-token");
    expect(allOnEnvelope(["signer@example.com", "OWNER@example.com"], allowed)).toBe(true);
    expect(allOnEnvelope(["signer@example.com", "stranger@evil.test"], allowed)).toBe(false);
  });

  it("rejects bad ids and documents the caller can't see", async () => {
    const f = rowsFetch([]);
    expect(await envelopeRecipients("not-a-uuid", undefined, env, f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
    expect(await envelopeRecipients(DOC, undefined, env, f)).toBeNull();
    expect((f.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe("Bearer anon-key");
    expect(await envelopeRecipients(DOC, undefined, env, rowsFetch({ message: "denied" }, false))).toBeNull();
    expect(allOnEnvelope(["a@b.c"], null)).toBe(false);
    expect(allOnEnvelope([], new Set(["a@b.c"]))).toBe(false);
  });
});
