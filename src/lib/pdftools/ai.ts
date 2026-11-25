import { supabase } from "@/integrations/supabase/client";
import { apiUrl } from "@/lib/api";
import { ToolError } from "./core";

/** The AI service isn't switched on, or can't be reached. Tools with an offline fallback catch this. */
export class AiUnavailableError extends ToolError {}

export class AiError extends ToolError {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Calls the site's AI endpoint (see api/ai-pdf.js) as the signed-in user. */
export async function callAi(body: Record<string, unknown>): Promise<unknown> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AiError("Please sign in to use AI tools.", "unauthorized");
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/ai-pdf"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiUnavailableError("Couldn't reach the AI service. Check your connection and try again.");
  }
  const json = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string; code?: string };
  if (res.ok) return json.result;
  if (res.status === 503 || json.code === "ai_not_configured") throw new AiUnavailableError(json.error ?? "AI isn't available right now.");
  throw new AiError(json.error ?? `The AI service failed (${res.status}).`, json.code);
}
