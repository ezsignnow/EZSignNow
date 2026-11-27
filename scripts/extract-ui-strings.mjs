// Collects user-visible English strings from src/ for the runtime page translator.
// Usage:
//   node scripts/extract-ui-strings.mjs            update src/i18n/strings/en.txt in place
//   node scripts/extract-ui-strings.mjs --by-file  show how much text each file contributes
// Existing strings keep their line number, new ones are appended, so the translation files
// (src/i18n/strings/<lang>.txt, same numbers) stay aligned. Translate any new numbers after running.
import ts from "typescript";
import fs from "fs";
import path from "path";

const ROOT = "src";
const SKIP = [/\/test\//, /\/i18n\//, /\/components\/ui\//, /integrations\/supabase/, /\.d\.ts$/, /AdminAnalytics/, /utils\/pdfGenerator/, /pdftools\/reportPdf/, /components\/SEO/, /lib\/pdftools\/(core|crypto|diff|imageFilters|pdfHelpers|textModel|htmlLayout|office)\.ts$/];
const ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "description"]);
const NON_UI_CALLS = new Set(["className", "cn", "clsx", "twMerge", "cva", "querySelector", "querySelectorAll", "getItem", "setItem", "removeItem", "from", "select", "eq", "rpc", "channel", "on", "addEventListener", "removeEventListener", "createElement", "getElementById", "fetch", "require", "import", "console.log", "console.error", "console.warn", "track", "navigate", "get", "set", "has", "startsWith", "endsWith", "includes", "split", "replace", "match", "test", "useState", "Error", "Date"]);

const out = new Map();
function add(text, file) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length < 2 || t.length > 600) return;
  if (!/[A-Za-z]{2}/.test(t)) return;
  if (/^(https?:|#|data:|mailto:|tel:)/.test(t)) return;
  if (/^[/.]/.test(t) && !/\s/.test(t)) return; // paths, extensions (but keep "/ sender / month", ". Offer ends")
  if (/^[\w.-]+@[\w.-]+$/.test(t)) return;
  if (/^[a-z0-9_]+$/.test(t)) return; // ids
  if (/^[a-z][a-zA-Z0-9]+$/.test(t)) return; // camelCase ids
  if (/^[A-Z0-9_]+$/.test(t) && t.length > 4 && t.includes("_")) return; // CONSTS
  if (/^[\w-]+\/[\w.+-]+$/.test(t)) return; // mime
  if (/\.(pdf|png|jpe?g|svg|docx?|xlsx?|pptx?|csv|json|js|ts|tsx|css|html|zip|txt)$/i.test(t) && !t.includes(" ")) return;
  const tokens = t.split(" ");
  if (tokens.every((x) => /^[a-z0-9:[\]/.\-#%_()!&>@,=*+~'"]+$/.test(x)) && tokens.some((x) => /[-:[]/.test(x))) return; // tailwind
  if (/[{};]|=>|\bfunction\b|\breturn\b/.test(t) && !/\{\d+\}/.test(t)) return;
  if (/\[ [A-Z ]+\]|\[\s{3,}\]/.test(t)) return; // fill-in placeholders inside sample document text
  if (/^(rgba?|hsla?|var|calc|url|linear-gradient|radial-gradient)\(/.test(t)) return;
  if (!out.has(t)) out.set(t, file);
}

function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) {
    const base = ts.isIdentifier(e.expression) ? e.expression.text + "." : "";
    return NON_UI_CALLS.has(base + e.name.text) ? base + e.name.text : e.name.text;
  }
  return "";
}

function templateKey(node) {
  let s = node.head.text;
  node.templateSpans.forEach((sp, i) => (s += `{${i}}` + sp.literal.text));
  return s;
}

function visit(node, file, ctx) {
  if (ts.isJsxAttribute(node)) {
    const name = node.name.getText();
    if (name === "className" || name === "style" || name === "key" || name === "id" || name === "to" || name === "href" || name === "src" || name === "type" || name.startsWith("data-") || name === "variant" || name === "size" || name === "htmlFor" || name === "name" || name === "value" || name === "accept" || name === "autoComplete" || name === "role" || name === "align" || name === "side" || name === "icon" || name === "mode" || name === "target" || name === "rel") return;
    const init = node.initializer;
    if (init && ts.isStringLiteral(init)) {
      // Known text attributes always; any other prop only when it reads like a sentence (eyebrow, intro, subtitle…).
      if (ATTRS.has(name) || /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(init.text)) add(init.text, file);
      return;
    }
  }
  if (ts.isCallExpression(node) && NON_UI_CALLS.has(calleeName(node))) return;
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
  if (ts.isPropertyAssignment(node)) {
    const k = node.name.getText().replace(/["']/g, "");
    if (k === "docContent") return;
    if (["className", "class", "color", "bg", "iconBg", "href", "to", "path", "id", "key", "icon", "tab", "status", "type", "value", "src", "url", "route", "slug", "domain", "mime", "accept", "ext", "variant", "format", "tone", "accent", "gradient", "ring", "dot", "border", "text", "style", "font"].includes(k) && !(k === "text" && ts.isStringLiteral(node.initializer) && /\s/.test(node.initializer.text))) {
      const statusLabel = k === "status" && ts.isStringLiteral(node.initializer) && /^[A-Z][a-z]+$/.test(node.initializer.text);
      if (k !== "text" && !statusLabel) return;
    }
  }
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(node.operatorToken.kind)) return;
  if (ts.isCaseClause(node)) { node.statements.forEach((s) => visit(s, file, ctx)); return; }
  if (ts.isElementAccessExpression(node)) return;
  if (ts.isTypeNode(node) || ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) return;

  if (ts.isJsxText(node)) add(node.text, file);
  else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const t = node.text;
    // Plain literals: only keep ones that read like UI text (a space, or a capitalised word).
    if (/\s/.test(t.trim()) || /^[A-Z][a-z]+[.!?]?$/.test(t) || /^[A-Z][a-z]+[A-Z]?[a-z]*$/.test(t)) add(t, file);
  } else if (ts.isTemplateExpression(node)) {
    const k = templateKey(node);
    if (/[A-Za-z]{3}/.test(k.replace(/\{\d+\}/g, "")) && /\s/.test(k)) add(k, file);
  }
  ts.forEachChild(node, (c) => visit(c, file, ctx));
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|ts)$/.test(f) && !SKIP.some((r) => r.test(p))) {
      const src = ts.createSourceFile(p, fs.readFileSync(p, "utf8"), ts.ScriptTarget.Latest, true, p.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      visit(src, p, {});
    }
  }
}
walk(ROOT);
const byFile = process.argv.includes("--by-file");
if (byFile) {
  const counts = {};
  for (const [t, f] of out) counts[f] = (counts[f] || 0) + t.length;
  console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([f, c]) => `${c}\t${f}`).join("\n"));
} else {
  const file = "src/i18n/strings/en.txt";
  const existing = new Map();
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const tab = line.indexOf("\t");
      if (tab > 0) existing.set(line.slice(tab + 1), Number(line.slice(0, tab)));
    }
  }
  let next = Math.max(0, ...existing.values()) + 1;
  const added = [];
  for (const t of [...out.keys()].sort()) {
    if (!existing.has(t)) {
      existing.set(t, next++);
      added.push(t);
    }
  }
  const lines = [...existing.entries()].sort((a, b) => a[1] - b[1]).map(([t, i]) => `${i}\t${t}`);
  fs.writeFileSync(file, lines.join("\n") + "\n");
  console.log(`${existing.size} strings, ${added.length} new`);
}
