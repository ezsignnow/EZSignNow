import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { CATEGORIES, TOOLS, TOOL_BY_ID } from "@/lib/pdftools/registry";
import { recentTools } from "@/lib/pdftools/handoff";
import { CATEGORY_STYLE, TOOL_ICONS } from "@/components/pdftools/icons";
import type { ToolDef } from "@/lib/pdftools/core";

function ToolLink({ tool }: { tool: ToolDef }) {
  return (
    <Link
      to={tool.route ?? `/tools/${tool.id}`}
      title={tool.description}
      className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${CATEGORY_STYLE[tool.category]}`}>
        <FontAwesomeIcon icon={TOOL_ICONS[tool.id]} className="h-3.5 w-3.5" />
      </span>
      {tool.name}
    </Link>
  );
}

export default function PdfTools() {
  const [q, setQ] = useState("");
  const recent = useMemo(() => recentTools().map((id) => TOOL_BY_ID[id]).filter(Boolean), []);
  const filtered = q.trim() ? TOOLS.filter((t) => `${t.name} ${t.description}`.toLowerCase().includes(q.toLowerCase())) : null;

  return (
    <div className="flex-1 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">PDF Tools</h1>
            <p className="text-slate-500">Everything you need to work with PDFs. Files are processed in your browser.</p>
          </div>
          <div className="relative w-full max-w-xs">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search tools" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Search tools" />
          </div>
        </div>

        {filtered ? (
          <div className="mt-8 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <ToolLink key={t.id} tool={t} />
            ))}
            {!filtered.length && <p className="text-slate-500">No tools match “{q}”.</p>}
          </div>
        ) : (
          <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3 xl:columns-4">
            {recent.length > 0 && (
              <section className="mb-7 break-inside-avoid">
                <h2 className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Recent <FontAwesomeIcon icon={faClockRotateLeft} className="h-3 w-3" />
                </h2>
                {recent.map((t) => (
                  <ToolLink key={t.id} tool={t} />
                ))}
              </section>
            )}
            {CATEGORIES.map((c) => (
              <section key={c.id} className="mb-7 break-inside-avoid">
                <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{c.name}</h2>
                {TOOLS.filter((t) => t.category === c.id).map((t) => (
                  <ToolLink key={t.id} tool={t} />
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
