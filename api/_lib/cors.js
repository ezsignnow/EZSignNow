/**
 * The public site (www.ezsignnow.com) is served as static files from GitHub
 * Pages, which cannot run these API functions. The browser therefore calls
 * this Vercel deployment cross-origin, so every handler must answer CORS
 * preflights and tag responses for the allowed front-end origins.
 *
 * Extra origins can be added with a comma-separated ALLOWED_ORIGINS env var.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.ezsignnow.com",
  "https://ezsignnow.com",
];

function allowedOrigins() {
  const extra = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_ORIGINS, ...extra];
}

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (allowedOrigins().includes(origin)) return true;
  // Local development (vite dev server, preview builds)
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

/**
 * Applies CORS headers. Returns true when the request was a preflight that
 * has already been answered, in which case the handler must return at once.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
