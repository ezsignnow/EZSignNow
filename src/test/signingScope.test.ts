import { afterEach, describe, expect, it, vi } from "vitest";

// The public signing RLS policies only match the document named in the
// x-signing-document header, so the signing page must send it on every
// Supabase request and stop sending it once the page is left.
describe("signing document scope header", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function headersSentFor(scope: string | null) {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { supabase, setSigningDocumentScope } = await vi.importActual<typeof import("@/integrations/supabase/client")>(
      "@/integrations/supabase/client"
    );
    setSigningDocumentScope(scope);
    await supabase.from("documents").select("*").eq("id", "doc-1");
    setSigningDocumentScope(null);
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/rest/v1/documents"));
    expect(call).toBeTruthy();
    const init = (call as unknown as [RequestInfo, RequestInit])[1];
    return new Headers(init?.headers);
  }

  it("sends the document id while a signing page is open", async () => {
    const headers = await headersSentFor("2b7c2f4e-1111-4222-8333-444455556666");
    expect(headers.get("x-signing-document")).toBe("2b7c2f4e-1111-4222-8333-444455556666");
    expect(headers.get("apikey")).toBeTruthy();
  });

  it("sends no scope header otherwise", async () => {
    const headers = await headersSentFor(null);
    expect(headers.get("x-signing-document")).toBeNull();
  });
});
