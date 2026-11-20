// Regenerates public/sitemap.xml: the public marketing pages plus one page per
// PDF tool (/tools/<id>), read from src/lib/pdftools/registry.ts.
// Run with `npm run sitemap` after adding pages or tools.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.ezsignnow.com";

const pages = [
  ["/", "1.0", "weekly"],
  ["/forms", "0.8", "weekly"],
  ["/compare/signnow", "0.8", "monthly"],
  ["/security", "0.7", "monthly"],
  ["/blog", "0.7", "weekly"],
  ["/company", "0.5", "monthly"],
  ["/support", "0.5", "monthly"],
  ["/try-for-free", "0.6", "monthly"],
  ["/signup", "0.5", "monthly"],
  ["/login", "0.3", "yearly"],
];

// The PDF tools (/tools, /tools/<id>, /edit) currently require sign-in, so
// Google would only see the login page. Set INCLUDE_TOOLS to true once they
// are public; each tool page is a strong search landing page.
const INCLUDE_TOOLS = false;

// Tools that open their own page (route: "/edit...") are already covered above.
const registry = fs.readFileSync(path.join(root, "src/lib/pdftools/registry.ts"), "utf8");
const toolsBlock = registry.slice(registry.indexOf("export const TOOLS"));
const tools = [];
const toolMatches = INCLUDE_TOOLS
  ? toolsBlock.matchAll(/\{\s*id:\s*"([a-z0-9-]+)"([\s\S]*?)(?=\n\s*\{\s*id:|\n\];)/g)
  : [];
for (const m of toolMatches) {
  const [, id, body] = m;
  if (/route:\s*"/.test(body) || id === "workflows") continue;
  tools.push([`/tools/${id}`, "0.7", "monthly"]);
}

const today = new Date().toISOString().slice(0, 10);
const urls = [...pages, ...tools]
  .map(
    ([p, priority, freq]) => `  <url>
    <loc>${SITE}${p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join("\n");

fs.writeFileSync(
  path.join(root, "public/sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);
console.log(`sitemap.xml: ${pages.length} pages + ${tools.length} PDF tools`);
