import { applyCors } from "./_lib/cors.js";
import { handleAiPdf } from "./_lib/aiPdf.js";

/** AI Summarizer and Translate PDF. Needs ANTHROPIC_API_KEY; callers must be signed in. */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const env = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://tjsvkdvuspihphtcldot.supabase.co",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_WgE6pWIOVhWvIc6VQpspvg_I70scyVl",
  };
  const { status, json } = await handleAiPdf(req.body, req.headers.authorization, env);
  return res.status(status).json(json);
}
