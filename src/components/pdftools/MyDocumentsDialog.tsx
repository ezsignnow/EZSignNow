import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/AuthContext";
import { listMyDocuments, downloadDocument, type DocSummary } from "@/lib/pdftools/documents";
import type { InputFile } from "@/lib/pdftools/core";

export function MyDocumentsDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (f: InputFile) => void }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocSummary[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !user) return;
    setDocs(null);
    setError("");
    listMyDocuments(user.id).then(setDocs).catch((e) => setError(e.message ?? String(e)));
  }, [open, user]);
  const shown = (docs ?? []).filter((d) => d.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose from my documents</DialogTitle>
          <DialogDescription>Pick a PDF you've already uploaded to EZSignNow.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-[50vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!docs && !error && <p className="py-6 text-center text-sm text-slate-500"><FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" />Loading…</p>}
          {docs && !shown.length && <p className="py-6 text-center text-sm text-slate-500">No documents found.</p>}
          <ul className="divide-y divide-slate-100">
            {shown.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={!!loadingId}
                  onClick={async () => {
                    setLoadingId(d.id);
                    try {
                      onPick(await downloadDocument(d));
                      onOpenChange(false);
                    } catch (e) {
                      setError((e as Error).message ?? String(e));
                    } finally {
                      setLoadingId(null);
                    }
                  }}
                  className="flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-slate-50"
                >
                  <FontAwesomeIcon icon={loadingId === d.id ? faSpinner : faFilePdf} className={`h-4 w-4 ${loadingId === d.id ? "animate-spin text-slate-400" : "text-red-500"}`} />
                  <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                  <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString()}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
