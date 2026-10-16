import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 12000;

/** True for loopback, private, link-local and other non-public addresses. */
function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

async function assertPublic(url) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http and https addresses are allowed");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard web ports are allowed");
  const addrs = await dns.lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("That address isn't allowed");
}

/** Fetches a public web page's HTML, following up to 3 redirects. */
export async function fetchPublicHtml(raw) {
  let url = new URL(raw);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; EZSignNow-HTML-to-PDF/1.0)", Accept: "text/html,application/xhtml+xml" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = new URL(res.headers.get("location"), url);
        continue;
      }
      if (!res.ok) throw new Error(`The site answered ${res.status}`);
      const type = res.headers.get("content-type") || "";
      if (!/html|xml|text\/plain/i.test(type)) throw new Error("That address isn't a web page");
      const reader = res.body.getReader();
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) throw new Error("The page is too large");
        chunks.push(value);
      }
      return { html: Buffer.concat(chunks).toString("utf8"), finalUrl: url.toString() };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects");
}
