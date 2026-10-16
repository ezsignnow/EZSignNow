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
