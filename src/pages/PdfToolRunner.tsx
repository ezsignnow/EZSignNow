import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCloudArrowUp, faFolderOpen, faSpinner, faTriangleExclamation, faPlay, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { TOOL_BY_ID, CATEGORIES } from "@/lib/pdftools/registry";
import { type InputFile, type Options, type OutputFile, ToolError, baseName } from "@/lib/pdftools/core";
import { fileId, recordRecent, takeHandOff } from "@/lib/pdftools/handoff";
import { OptionsForm } from "@/components/pdftools/OptionsForm";
import { FileList } from "@/components/pdftools/FileList";
import { Results } from "@/components/pdftools/Results";
import { MyDocumentsDialog } from "@/components/pdftools/MyDocumentsDialog";
import { BookmarksPanel, CropPanel, MetadataPanel, OrganizePanel, SelectPagesPanel, SplitPointsPanel } from "@/components/pdftools/panels";
import { TOOL_ICONS, CATEGORY_STYLE } from "@/components/pdftools/icons";

const ACCEPT: Record<string, string> = {
  pdf: "application/pdf,.pdf",
  images: "image/jpeg,image/png,image/gif,image/webp,image/bmp,.jpg,.jpeg,.png,.gif,.webp,.bmp",
  docx: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: ".html,.htm,text/html",
};
const KIND_LABEL: Record<string, string> = { pdf: "PDF", images: "image", docx: "Word (.docx)", html: "HTML" };

function matches(kind: string, f: File) {
  const n = f.name.toLowerCase();
  if (kind === "pdf") return f.type === "application/pdf" || n.endsWith(".pdf");
  if (kind === "images") return f.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/.test(n);
  if (kind === "docx") return n.endsWith(".docx");
  if (kind === "html") return /\.html?$/.test(n) || f.type === "text/html";
  return true;
}

export default function PdfToolRunner() {
  const { toolId = "" } = useParams();
  const tool = TOOL_BY_ID[toolId];
  const [files, setFiles] = useState<InputFile[]>([]);
  const [options, setOptions] = useState<Options>(() => ({ ...(tool?.defaults ?? {}) }));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [fraction, setFraction] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [outputs, setOutputs] = useState<OutputFile[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOptions({ ...(tool?.defaults ?? {}) });
    setOutputs(null);
    setError("");
    const handed = takeHandOff();
    setFiles(handed && tool ? (tool.multiple ? handed : handed.slice(0, 1)) : []);
  }, [toolId, tool]);

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      if (!tool) return;
      setError("");
      setOutputs(null);
      const arr = [...list];
      const bad = arr.filter((f) => !matches(tool.accept, f));
      if (bad.length) setError(`${bad.map((b) => b.name).join(", ")} ${bad.length === 1 ? "isn't" : "aren't"} ${KIND_LABEL[tool.accept] === "image" ? "an image" : `a ${KIND_LABEL[tool.accept]} file`}.`);
      const good = await Promise.all(
        arr.filter((f) => matches(tool.accept, f)).map(async (f) => ({ id: fileId(), name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) })),
      );
      if (!good.length) return;
      setFiles((cur) => (tool.multiple ? [...cur, ...good] : good.slice(0, 1)));
      if (!tool.multiple) setOptions((o) => ({ ...(tool.defaults ?? {}), ...o, plan: undefined, crop: undefined, pages: tool.defaults?.pages, rotations: undefined, bookmarks: undefined }));
    },
    [tool],
  );

  const changeFiles = (next: InputFile[]) => {
    // Removing or reordering files invalidates the Organize page plan.
    if (tool?.panel === "organize" && (next.length < files.length || next.some((f, i) => files[i]?.id !== f.id))) setOptions((o) => ({ ...o, plan: undefined }));
    setFiles(next);
    setOutputs(null);
  };

  const minFiles = tool?.minFiles ?? 1;
  const canRun = !!tool?.run && files.length >= minFiles && !running;
  const inputSize = useMemo(() => files.reduce((s, f) => s + f.bytes.length, 0), [files]);

  if (!tool) return <Navigate to="/tools" replace />;
  if (tool.route) return <Navigate to={tool.route} replace />;

  const run = async () => {
    if (!tool.run) return;
    setRunning(true);
    setError("");
    setOutputs(null);
    setProgress("Working…");
    setFraction(undefined);
    const collected: string[] = [];
    try {
      const out = await tool.run(files, options, {
        progress: (m, f) => {
          setProgress(m);
          setFraction(f);
        },
        note: (m) => collected.push(m),
      });
      setNotes(collected);
      setOutputs(out);
      recordRecent(tool.id);
      setTimeout(() => document.querySelector("[data-results]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    } catch (e) {
      if (!(e instanceof ToolError)) console.error(e);
      setError(e instanceof ToolError ? e.message : `Something went wrong: ${(e as Error)?.message ?? e}`);
    } finally {
      setRunning(false);
      setProgress("");
    }
  };

  const single = files[0];
  const panel = tool.panel;
  const category = CATEGORIES.find((c) => c.id === tool.category);
  const showPanel = files.length > 0 && panel && panel !== "file-order";

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <div>
          <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> All PDF tools
          </Link>
          <div className="mt-3 flex items-center gap-4">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${CATEGORY_STYLE[tool.category]}`}>
              <FontAwesomeIcon icon={TOOL_ICONS[tool.id]} className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{category?.name}</div>
              <h1 className="text-2xl font-bold text-slate-800">{tool.name}</h1>
            </div>
          </div>
          <p className="mt-2 text-slate-600">{tool.description}</p>
        </div>

        {/* Files */}
        {tool.accept !== "none" && (
          <section className="space-y-3">
            {(files.length === 0 || tool.multiple) && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 ${files.length ? "py-5" : "py-10"} text-center ${dragging ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => inputRef.current?.click()} className="bg-emerald-500 hover:bg-emerald-600">
                    <FontAwesomeIcon icon={faCloudArrowUp} className="mr-2" />
                    {files.length ? "Add more files" : `Upload ${KIND_LABEL[tool.accept]} file${tool.multiple ? "s" : ""}`}
                  </Button>
                  {tool.accept === "pdf" && (
                    <Button variant="outline" onClick={() => setPickOpen(true)}>
                      <FontAwesomeIcon icon={faFolderOpen} className="mr-2" /> From my documents
                    </Button>
                  )}
                </div>
                <span className="text-sm text-slate-500">
                  or drop {tool.multiple ? "files" : "a file"} here{tool.minFiles === 0 ? " (optional)" : ""}
                  {tool.minFiles && tool.minFiles > 1 ? ` — at least ${tool.minFiles} needed` : ""}
                </span>
                <input ref={inputRef} type="file" className="hidden" accept={ACCEPT[tool.accept]} multiple={!!tool.multiple} onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              </div>
            )}
            {files.length > 0 && (
              <FileList
                files={files}
                onChange={changeFiles}
                options={options}
                onOptions={setOptions}
                perFile={panel === "file-order" && tool.accept === "pdf" && tool.id !== "bates" ? { pages: true, reverse: tool.id === "alternate-mix" } : undefined}
              />
            )}
          </section>
        )}

        {/* Options */}
        {(tool.options?.length || showPanel) && (files.length > 0 || minFiles === 0) && (
          <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
            {tool.options?.length ? <OptionsForm fields={tool.options} value={options} onChange={setOptions} idPrefix={tool.id} /> : null}
            {showPanel && single && (
              <div className={tool.options?.length ? "border-t border-slate-100 pt-5" : ""}>
                {panel === "select-pages" && (tool.id !== "rotate" || files.length === 1) && (
                  <SelectPagesPanel file={single} options={options} onOptions={setOptions} mode={tool.id === "rotate" ? "rotate" : "select"} />
                )}
                {panel === "organize" && <OrganizePanel files={files} options={options} onOptions={setOptions} />}
                {panel === "crop" && <CropPanel file={single} options={options} onOptions={setOptions} />}
                {panel === "split-points" && <SplitPointsPanel file={single} options={options} onOptions={setOptions} />}
                {panel === "bookmarks" && <BookmarksPanel file={single} options={options} onOptions={setOptions} />}
                {panel === "metadata" && <MetadataPanel key={single.id} file={single} options={options} onOptions={setOptions} />}
              </div>
            )}
          </section>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" /> {error}
          </div>
        )}

        {/* Run */}
        {tool.run && (files.length > 0 || minFiles === 0) && !outputs && (
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={run} disabled={!canRun} className="bg-emerald-500 px-8 text-base hover:bg-emerald-600">
              {running ? <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> : <FontAwesomeIcon icon={faPlay} className="mr-2 h-3.5 w-3.5" />}
              {running ? "Working…" : tool.name}
            </Button>
            {running && (
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <div className="text-sm text-slate-600">{progress}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full bg-emerald-500 transition-all ${fraction === undefined ? "w-1/3 animate-pulse" : ""}`} style={fraction !== undefined ? { width: `${Math.max(4, fraction * 100)}%` } : undefined} />
                </div>
              </div>
            )}
            {!running && files.length < minFiles && <span className="text-sm text-slate-500">Add at least {minFiles} files.</span>}
          </div>
        )}

        {outputs && (
          <>
            <Results outputs={outputs} inputSize={inputSize} zipName={`${single ? baseName(single.name) : tool.id}-${tool.id}`} notes={notes} />
            <Button variant="ghost" onClick={() => { setOutputs(null); setFiles([]); setOptions({ ...(tool.defaults ?? {}) }); }}>
              <FontAwesomeIcon icon={faRotateLeft} className="mr-2" /> Start over
            </Button>
            <Button variant="ghost" onClick={() => setOutputs(null)}>Change options and run again</Button>
          </>
        )}
      </div>
      <MyDocumentsDialog open={pickOpen} onOpenChange={setPickOpen} onPick={(f) => setFiles((cur) => (tool.multiple ? [...cur, f] : [f]))} />
    </div>
  );
}
