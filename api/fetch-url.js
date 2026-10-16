import { applyCors } from "./_lib/cors.js";
import { fetchPublicHtml } from "./_lib/fetchUrl.js";

/** Fetches a public web page for the HTML to PDF tool (browsers can't read other sites directly). */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const url = typeof req.query?.url === "string" ? req.query.url : new URL(req.url, "http://x").searchParams.get("url");
  if (!url) return res.status(400).json({ error: "Missing url" });
  try {
    const { html, finalUrl } = await fetchPublicHtml(url);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Final-Url", finalUrl);
    res.setHeader("Access-Control-Expose-Headers", "X-Final-Url");
    return res.status(200).send(html);
  } catch (err) {
    return res.status(400).json({ error: err.message || "Couldn't fetch that page" });
  }
}
