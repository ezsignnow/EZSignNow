import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faClockRotateLeft, faMagnifyingGlass, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { TOOLS, TOOL_BY_ID } from "@/lib/pdftools/registry";
import { GROUPS, NEW_IDS, additionalSections, featuredTools, groupOf } from "@/lib/pdftools/catalog";
import { recentTools } from "@/lib/pdftools/handoff";
import { CATEGORY_STYLE, TOOL_ICONS } from "@/components/pdftools/icons";
import type { ToolDef } from "@/lib/pdftools/core";

const toolPath = (t: ToolDef) => t.route ?? `/tools/${t.id}`;

function ToolCard({ tool }: { tool: ToolDef }) {
  const style = groupOf(tool.id)?.style ?? CATEGORY_STYLE[tool.category];
  return (
    <Link
      to={toolPath(tool)}
      data-tool-card
      data-tool-id={tool.id}
      className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ba114]"
    >
      {NEW_IDS.has(tool.id) && <span className="absolute right-3 top-3 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">New</span>}
      <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${style}`}>
        <FontAwesomeIcon icon={TOOL_ICONS[tool.id]} className="h-5 w-5" />
      </span>
      <h3 className="text-[15px] font-semibold text-slate-900">{tool.name}</h3>
      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-slate-500">{tool.description}</p>
    </Link>
  );
}

function Pill({ active, children, ...rest }: { active: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

export default function PdfTools() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const group = params.get("group") ?? "all";
  const [q, setQ] = useState("");
  const recent = useMemo(() => recentTools().map((id) => TOOL_BY_ID[id]).filter(Boolean), []);
  const extra = useMemo(additionalSections, []);
  const name = (user?.user_metadata?.full_name as string | undefined)?.trim() || user?.email?.split("@")[0] || "there";

  const searching = q.trim().length > 0;
  const shown = searching
    ? TOOLS.filter((t) => `${t.name} ${t.description}`.toLowerCase().includes(q.trim().toLowerCase()))
    : featuredTools(group === "all" ? undefined : group);

  const setGroup = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("group");
    else next.set("group", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-[28px]">Hi {name}, let&rsquo;s get started</h1>
          <p className="mt-1 text-sm text-slate-500">Everything you need to work with PDFs. Files are processed in your browser and never uploaded.</p>
          <div className="relative mx-auto mt-5 max-w-md">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search all PDF tools" value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-full bg-white pl-10" aria-label="Search tools" />
          </div>
          {!searching && (
            <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter tools">
              <Pill active={group === "all"} onClick={() => setGroup("all")}>All</Pill>
              <Link to="/tools/workflows" className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900">Workflows</Link>
              {GROUPS.map((g) => (
                <Pill key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>{g.name}</Pill>
              ))}
            </div>
          )}
        </header>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Left: additional features */}
          {!searching && (
            <aside className="lg:sticky lg:top-6 lg:w-64 lg:shrink-0" aria-label="Additional features">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Additional features</h2>
                {recent.length > 0 && (
                  <div className="mt-3">
                    <h3 className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Recent <FontAwesomeIcon icon={faClockRotateLeft} className="h-2.5 w-2.5" />
                    </h3>
                    {recent.map((t) => (
                      <MenuLink key={t.id} tool={t} />
                    ))}
                  </div>
                )}
                {extra.map((s) => (
                  <div key={s.name} className="mt-3">
                    <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.name}</h3>
                    {s.tools.map((t) => (
                      <MenuLink key={t.id} tool={t} />
                    ))}
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Right: all features */}
          <section className="min-w-0 flex-1" aria-label="All features">
            {searching && <p className="mb-4 text-sm text-slate-500">{shown.length} result{shown.length === 1 ? "" : "s"} for &ldquo;{q.trim()}&rdquo;</p>}
            {shown.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No tools match &ldquo;{q.trim()}&rdquo;.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" data-tool-grid>
                {shown.map((t) => (
                  <ToolCard key={t.id} tool={t} />
                ))}
                {!searching && group === "all" && (
                  <Link
                    to="/tools/workflows"
                    data-workflow-card
                    className="flex flex-col justify-between rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900">Create a workflow</h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">Chain your favourite tools, run them on many files at once and reuse the recipe any time.</p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-rose-600">
                      <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Create workflow <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                    </span>
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MenuLink({ tool }: { tool: ToolDef }) {
  return (
    <Link
      to={toolPath(tool)}
      title={tool.description}
      data-menu-link
      data-tool-id={tool.id}
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${CATEGORY_STYLE[tool.category]}`}>
        <FontAwesomeIcon icon={TOOL_ICONS[tool.id]} className="h-3 w-3" />
      </span>
      {tool.name}
    </Link>
  );
}
