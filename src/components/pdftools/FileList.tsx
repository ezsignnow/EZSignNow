import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faArrowDown, faXmark, faFilePdf, faFileImage, faFileWord, faFileCode } from "@fortawesome/free-solid-svg-icons";
import type { InputFile, Options } from "@/lib/pdftools/core";
import type { FileSettings } from "@/lib/pdftools/tools/pages";
import { usePageCount } from "./Thumbs";

export const formatSize = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function PageCount({ bytes }: { bytes: Uint8Array }) {
  const n = usePageCount(bytes);
  if (n === null) return <span className="text-slate-400">…</span>;
  if (n < 0) return <span className="text-amber-600">can't preview</span>;
  return <span>{n} page{n === 1 ? "" : "s"}</span>;
}

export function FileList({
  files,
  onChange,
  options,
  onOptions,
  perFile,
}: {
  files: InputFile[];
  onChange: (f: InputFile[]) => void;
  options: Options;
  onOptions: (o: Options) => void;
  /** Show per-file page ranges ("pages") and/or a reverse toggle. */
  perFile?: { pages?: boolean; reverse?: boolean };
}) {
  const settings = (options.fileSettings as Record<string, FileSettings>) ?? {};
  const setSetting = (id: string, patch: FileSettings) => onOptions({ ...options, fileSettings: { ...settings, [id]: { ...settings[id], ...patch } } });
  const move = (i: number, d: number) => {
    const next = [...files];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {files.map((f, i) => {
        const isPdf = /pdf/.test(f.type) || /\.pdf$/i.test(f.name);
        const icon = isPdf ? faFilePdf : /image/.test(f.type) ? faFileImage : /\.docx$/i.test(f.name) ? faFileWord : faFileCode;
        return (
          <li key={f.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <FontAwesomeIcon icon={icon} className={`h-5 w-5 ${isPdf ? "text-red-500" : "text-slate-400"}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{f.name}</div>
              <div className="text-xs text-slate-500">
                {formatSize(f.bytes.length)}
                {isPdf && (
                  <>
                    {" · "}
                    <PageCount bytes={f.bytes} />
                  </>
                )}
              </div>
            </div>
            {perFile?.pages && isPdf && (
              <input
                aria-label={`Pages of ${f.name}`}
                placeholder="All pages"
                value={settings[f.id]?.pages ?? ""}
                onChange={(e) => setSetting(f.id, { pages: e.target.value })}
                className="h-8 w-28 rounded-md border border-slate-200 px-2 text-xs"
              />
            )}
            {perFile?.reverse && (
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={!!settings[f.id]?.reverse} onChange={(e) => setSetting(f.id, { reverse: e.target.checked })} />
                Reverse
              </label>
            )}
            {files.length > 1 && (
              <div className="flex">
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                  <FontAwesomeIcon icon={faArrowUp} className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="Move down" disabled={i === files.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                  <FontAwesomeIcon icon={faArrowDown} className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((x) => x.id !== f.id))} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
