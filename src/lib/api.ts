/**
 * Builds the URL for a serverless API route.
 *
 * The production site is static (GitHub Pages), so API calls must go to the
 * Vercel deployment named in VITE_API_BASE_URL. When it is unset (local
 * `npm run dev`, or the Vercel deployment itself) calls stay same-origin and
 * are served by the Vite dev middleware or Vercel's /api functions.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * JSON headers for an API call, with the signed-in user's session token when
 * there is one. The email endpoints use it to check, through Supabase Row
 * Level Security, that the recipients are on the caller's document.
 */
export async function apiJsonHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    // Loaded lazily so the PDF tools that only need apiUrl() don't pull in the auth client.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* signed out or storage unavailable: send without a token */
  }
  return headers;
}
