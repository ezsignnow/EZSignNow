import { CATEGORIES, TOOLS, TOOL_BY_ID } from "./registry";
import type { ToolDef } from "./core";

/**
 * How the PDF Tools page groups its main features (the same families the
 * iLovePDF menu uses). Anything in the registry that isn't listed here shows
 * up in the "Additional features" menu on the left.
 */
export interface ToolGroup {
  id: string;
  name: string;
  /** Icon tile colours for cards in this group. */
  style: string;
  ids: string[];
}

export const GROUPS: ToolGroup[] = [
  { id: "organize", name: "Organize PDF", style: "bg-rose-50 text-rose-500", ids: ["merge", "split-by-pages", "delete-pages", "extract-pages", "organize", "scan-to-pdf"] },
  { id: "optimize", name: "Optimize PDF", style: "bg-green-50 text-green-600", ids: ["compress", "repair", "ocr"] },
  { id: "to-pdf", name: "Convert to PDF", style: "bg-amber-50 text-amber-600", ids: ["jpg-to-pdf", "word-to-pdf", "powerpoint-to-pdf", "excel-to-pdf", "html-to-pdf"] },
  { id: "from-pdf", name: "Convert from PDF", style: "bg-sky-50 text-sky-600", ids: ["pdf-to-jpg", "pdf-to-word", "pdf-to-powerpoint", "pdf-to-excel", "pdf-to-pdfa"] },
  { id: "edit", name: "Edit PDF", style: "bg-fuchsia-50 text-fuchsia-600", ids: ["rotate", "page-numbers", "watermark", "crop", "edit", "create-forms"] },
  { id: "security", name: "PDF Security", style: "bg-blue-50 text-blue-700", ids: ["unlock", "protect", "fill-sign", "redact", "compare"] },
  { id: "intelligence", name: "PDF Intelligence", style: "bg-violet-50 text-violet-600", ids: ["ai-summarizer", "translate-pdf", "pdf-to-markdown"] },
];

/** Tools to flag with a "New" badge. */
export const NEW_IDS = new Set(["create-forms", "redact", "compare", "ai-summarizer", "translate-pdf", "pdf-to-markdown", "pdf-to-pdfa", "excel-to-pdf", "powerpoint-to-pdf", "scan-to-pdf"]);

export const FEATURED_IDS = new Set(GROUPS.flatMap((g) => g.ids));

/** The tools that appear in the main grid, in menu order. */
export function featuredTools(groupId?: string): ToolDef[] {
  const groups = groupId ? GROUPS.filter((g) => g.id === groupId) : GROUPS;
  return groups.flatMap((g) => g.ids.map((id) => TOOL_BY_ID[id]).filter(Boolean));
}

export function groupOf(toolId: string): ToolGroup | undefined {
  return GROUPS.find((g) => g.ids.includes(toolId));
}

/** Everything else, grouped by the registry's own categories, for the left menu. */
export function additionalSections(): { name: string; tools: ToolDef[] }[] {
  return CATEGORIES.map((c) => ({ name: c.name, tools: TOOLS.filter((t) => t.category === c.id && !FEATURED_IDS.has(t.id)) })).filter((s) => s.tools.length);
}
