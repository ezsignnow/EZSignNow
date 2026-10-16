import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowDown, faArrowUp, faCloudArrowUp, faPlay, faPlus, faRobot, faSpinner, faTrashCan, faFloppyDisk, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WORKFLOW_TOOLS, TOOL_BY_ID } from "@/lib/pdftools/registry";
import { type InputFile, type Options, type OutputFile, ToolError, PDF_MIME } from "@/lib/pdftools/core";
import { fileId, takeHandOff } from "@/lib/pdftools/handoff";
import { OptionsForm } from "@/components/pdftools/OptionsForm";
import { FileList } from "@/components/pdftools/FileList";
import { Results } from "@/components/pdftools/Results";
import { TOOL_ICONS, CATEGORY_STYLE } from "@/components/pdftools/icons";

interface Step {
  toolId: string;
  options: Options;
}
interface Workflow {
  id: string;
  name: string;
  steps: Step[];
}

const STORE = "ez_pdf_workflows";
const PRESETS: Workflow[] = [
  { id: "preset-share", name: "Prepare for sharing", steps: [{ toolId: "compress", options: { ...TOOL_BY_ID.compress.defaults } }, { toolId: "page-numbers", options: { ...TOOL_BY_ID["page-numbers"].defaults } }] },
  { id: "preset-scan", name: "Clean up scans", steps: [{ toolId: "deskew", options: { ...TOOL_BY_ID.deskew.defaults } }, { toolId: "ocr", options: { ...TOOL_BY_ID.ocr.defaults } }, { toolId: "compress", options: { ...TOOL_BY_ID.compress.defaults } }] },
  { id: "preset-confidential", name: "Confidential copy", steps: [{ toolId: "watermark", options: { ...TOOL_BY_ID.watermark.defaults } }, { toolId: "flatten", options: { ...TOOL_BY_ID.flatten.defaults } }] },
];

function load(): Workflow[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) || "[]");
  } catch {
    return [];
  }
}

export default function PdfWorkflows() {
  const [saved, setSaved] = useState<Workflow[]>(load);
  const [wf, setWf] = useState<Workflow>({ id: "", name: "My workflow", steps: [] });
  const [files, setFiles] = useState<InputFile[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [outputs, setOutputs] = useState<OutputFile[] | null>(null);
  const [wfNotes, setWfNotes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = takeHandOff();
    if (h) setFiles(h);
  }, []);

  const persist = (list: Workflow[]) => {
    setSaved(list);
    try {
      localStorage.setItem(STORE, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };
  const saveWf = () => {
    const id = wf.id && !wf.id.startsWith("preset") ? wf.id : `wf${Date.now()}`;
    const next = { ...wf, id };
    setWf(next);
    persist([next, ...saved.filter((w) => w.id !== id)]);
  };
  const setStep = (i: number, s: Step | null) => setWf((w) => ({ ...w, steps: s ? w.steps.map((x, k) => (k === i ? s : x)) : w.steps.filter((_, k) => k !== i) }));
  const moveStep = (i: number, d: number) =>
    setWf((w) => {
      const steps = [...w.steps];
      const [x] = steps.splice(i, 1);
      steps.splice(i + d, 0, x);
      return { ...w, steps };
    });

  const run = async () => {
    setRunning(true);
    setError("");
    setOutputs(null);
    const results: OutputFile[] = [];
    const notes: string[] = [];
    try {
      for (const f of files) {
        let current: InputFile = f;
        for (let s = 0; s < wf.steps.length; s++) {
          const step = wf.steps[s];
          const tool = TOOL_BY_ID[step.toolId];
          setStatus(`${f.name}: step ${s + 1} of ${wf.steps.length} — ${tool.name}`);
          const out = await tool.run!([current], step.options, { progress: (m) => setStatus(`${f.name}: ${tool.name} — ${m}`), note: (m) => notes.push(m) });
          const pdf = out.find((o) => o.mime === PDF_MIME);
          if (!pdf) throw new ToolError(`${tool.name} didn't produce a PDF.`);
          current = { id: fileId(), name: f.name, type: PDF_MIME, bytes: pdf.bytes };
        }
        results.push({ name: f.name.replace(/\.pdf$/i, "") + "-processed.pdf", mime: PDF_MIME, bytes: current.bytes });
      }
      setOutputs(results);
      setWfNotes(notes);
    } catch (e) {
      setError(e instanceof ToolError ? e.message : `Something went wrong: ${(e as Error).message}`);
    } finally {
      setRunning(false);
      setStatus("");
    }
  };

  return (
    <div className="flex-1 bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <div>
          <Link to="/tools" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /> All PDF tools
          </Link>
          <div className="mt-3 flex items-center gap-4">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${CATEGORY_STYLE.automate}`}><FontAwesomeIcon icon={faRobot} className="h-5 w-5" /></span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Automate</div>
              <h1 className="text-2xl font-bold text-slate-800">Workflows</h1>
            </div>
          </div>
          <p className="mt-2 text-slate-600">Chain tools together and run them on many files at once. Workflows are saved on this device.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">Start from:</span>
          {[...PRESETS, ...saved].map((w) => (
            <Button key={w.id} size="sm" variant={wf.id === w.id ? "default" : "outline"} onClick={() => setWf(JSON.parse(JSON.stringify(w)))}>
              {w.name}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setWf({ id: "", name: "My workflow", steps: [] })}>New</Button>
        </div>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Input aria-label="Workflow name" value={wf.name} onChange={(e) => setWf({ ...wf, name: e.target.value })} className="max-w-xs" />
            <Button variant="outline" onClick={saveWf} disabled={!wf.steps.length}>
              <FontAwesomeIcon icon={faFloppyDisk} className="mr-2" /> Save workflow
            </Button>
            {wf.id && !wf.id.startsWith("preset") && (
              <Button variant="ghost" className="text-red-600" onClick={() => { persist(saved.filter((w) => w.id !== wf.id)); setWf({ id: "", name: "My workflow", steps: [] }); }}>
                Delete
              </Button>
            )}
          </div>
          <ol className="space-y-3">
            {wf.steps.map((s, i) => {
              const tool = TOOL_BY_ID[s.toolId];
              return (
                <li key={i} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{i + 1}</span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${CATEGORY_STYLE[tool.category]}`}><FontAwesomeIcon icon={TOOL_ICONS[tool.id]} className="h-3.5 w-3.5" /></span>
                    <span className="flex-1 font-semibold text-slate-800">{tool.name}</span>
                    <button type="button" aria-label="Move step up" disabled={i === 0} onClick={() => moveStep(i, -1)} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" /></button>
                    <button type="button" aria-label="Move step down" disabled={i === wf.steps.length - 1} onClick={() => moveStep(i, 1)} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" /></button>
                    <button type="button" aria-label="Remove step" onClick={() => setStep(i, null)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" /></button>
                  </div>
                  {tool.options?.length ? <OptionsForm fields={tool.options} value={s.options} onChange={(o) => setStep(i, { ...s, options: o })} idPrefix={`step${i}`} /> : <p className="text-sm text-slate-500">No settings needed.</p>}
                </li>
              );
            })}
          </ol>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><FontAwesomeIcon icon={faPlus} className="mr-2" /> Add step</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-80 w-60 overflow-y-auto">
              {WORKFLOW_TOOLS.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => setWf((w) => ({ ...w, steps: [...w.steps, { toolId: t.id, options: { ...(t.defaults ?? {}) } }] }))}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-5">
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => inputRef.current?.click()}>
              <FontAwesomeIcon icon={faCloudArrowUp} className="mr-2" /> Add PDF files
            </Button>
            <span className="text-sm text-slate-500">Each file goes through every step in order.</span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={async (e) => {
                const list = [...(e.target.files ?? [])];
                e.target.value = "";
                const read = await Promise.all(list.map(async (f) => ({ id: fileId(), name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) })));
                setFiles((c) => [...c, ...read]);
                setOutputs(null);
              }}
            />
          </div>
          {files.length > 0 && <FileList files={files} onChange={setFiles} options={{}} onOptions={() => undefined} />}
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" /> {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" className="bg-emerald-500 px-8 hover:bg-emerald-600" disabled={running || !files.length || !wf.steps.length} onClick={run}>
            <FontAwesomeIcon icon={running ? faSpinner : faPlay} className={`mr-2 ${running ? "animate-spin" : ""}`} /> {running ? "Running…" : "Run workflow"}
          </Button>
          {status && <span className="text-sm text-slate-600">{status}</span>}
        </div>
        {outputs && <Results outputs={outputs} inputSize={files.reduce((s, f) => s + f.bytes.length, 0)} zipName="workflow-results" notes={wfNotes} />}
      </div>
    </div>
  );
}
