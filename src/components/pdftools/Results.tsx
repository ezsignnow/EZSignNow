import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faFileZipper, faFloppyDisk, faPenToSquare, faArrowRight, faCircleCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { type OutputFile, PDF_MIME, zipOutputs } from "@/lib/pdftools/core";
import { TOOLS } from "@/lib/pdftools/registry";
import { handOff, fileId } from "@/lib/pdftools/handoff";
import { saveToMyDocuments } from "@/lib/pdftools/documents";
import { formatSize } from "./FileList";

export function downloadBytes(name: string, mime: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

export function Results({ outputs, inputSize, zipName, notes = [] }: { outputs: OutputFile[]; inputSize: number; zipName: string; notes?: string[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const pdfs = outputs.filter((o) => o.mime === PDF_MIME);
  const total = outputs.reduce((s, o) => s + o.bytes.length, 0);

  const save = async (o: OutputFile) => {
    if (!user) return;
    setSaving(o.name);
    try {
      const id = await saveToMyDocuments(user, o.name, o.bytes);
      setSaved((s) => ({ ...s, [o.name]: id }));
      toast({ title: "Saved to your documents", description: o.name });
    } catch (e) {
      toast({ title: "Couldn't save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };
  const continueWith = (toolId: string, route?: string) => {
    handOff(pdfs.map((o) => ({ id: fileId(), name: o.name, type: PDF_MIME, bytes: o.bytes })));
    navigate(route ?? `/tools/${toolId}`);
  };

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5" data-results>
      <div className="flex flex-wrap items-center gap-3">
        <FontAwesomeIcon icon={faCircleCheck} className="h-6 w-6 text-emerald-600" />
        <div className="flex-1">
          <div className="font-semibold text-slate-800">Done! {outputs.length === 1 ? "Your file is ready." : `${outputs.length} files are ready.`}</div>
          {inputSize > 0 && pdfs.length === outputs.length && outputs.length === 1 && (
            <div className="text-sm text-slate-600">
              {formatSize(inputSize)} → {formatSize(total)}
              {total < inputSize && <span className="ml-1 font-medium text-emerald-700">({Math.round((1 - total / inputSize) * 100)}% smaller)</span>}
            </div>
          )}
        </div>
        {outputs.length > 1 && (
          <Button onClick={() => { const z = zipOutputs(outputs, zipName); downloadBytes(z.name, z.mime, z.bytes); }}>
            <FontAwesomeIcon icon={faFileZipper} className="mr-2" /> Download all (ZIP)
          </Button>
        )}
        {pdfs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Continue with <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
              {pdfs.length === 1 && (
                <DropdownMenuItem onSelect={() => continueWith("edit", "/edit")}>
                  <FontAwesomeIcon icon={faPenToSquare} className="mr-2 h-3.5 w-3.5" /> Edit in PDF editor
                </DropdownMenuItem>
              )}
              {TOOLS.filter((t) => t.accept === "pdf" && t.run && (t.multiple || pdfs.length === 1)).map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => continueWith(t.id)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {notes.length > 0 && (
        <ul className="space-y-1 text-sm text-slate-700">
          {notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}
      <ul className="divide-y divide-emerald-100 rounded-lg border border-emerald-100 bg-white">
        {outputs.map((o) => (
          <li key={o.name} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{o.name}</span>
            <span className="text-xs text-slate-500">{formatSize(o.bytes.length)}</span>
            {o.mime === PDF_MIME && user && (
              saved[o.name] ? (
                <Button size="sm" variant="ghost" onClick={() => navigate(`/document/${saved[o.name]}/prepare`)}>Send for signature</Button>
              ) : (
                <Button size="sm" variant="ghost" disabled={saving === o.name} onClick={() => save(o)}>
                  <FontAwesomeIcon icon={saving === o.name ? faSpinner : faFloppyDisk} className={`mr-1.5 h-3.5 w-3.5 ${saving === o.name ? "animate-spin" : ""}`} /> Save to my documents
                </Button>
              )
            )}
            <Button size="sm" onClick={() => downloadBytes(o.name, o.mime, o.bytes)}>
              <FontAwesomeIcon icon={faDownload} className="mr-1.5 h-3.5 w-3.5" /> Download
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
