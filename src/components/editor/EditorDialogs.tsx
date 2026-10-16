import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SignaturePad, SignaturePadRef } from "@/components/signature/SignaturePad";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faTrashCan, faPaperclip, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import type { EditorAttachment, ExistingFieldEdit } from "./types";
import type { ExistingField } from "./pdfSource";
import { bytesToBase64, readFileAsDataUrl, uid } from "./geometry";

/* ───────────────────────── Link ───────────────────────── */

export function LinkDialog({
  open,
  onOpenChange,
  initial,
  pageCount,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: { url?: string; targetPage?: number };
  pageCount: number;
  onSave: (v: { url?: string; targetPage?: number }) => void;
}) {
  const [mode, setMode] = useState<"url" | "page">("url");
  const [url, setUrl] = useState("");
  const [pageNum, setPageNum] = useState(1);
  useEffect(() => {
    if (!open) return;
    setMode(initial.targetPage ? "page" : "url");
    setUrl(initial.url ?? "");
    setPageNum(initial.targetPage ?? 1);
  }, [open, initial.url, initial.targetPage]);

  const valid = mode === "url" ? url.trim().length > 0 : pageNum >= 1 && pageNum <= pageCount;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link</DialogTitle>
          <DialogDescription>Choose where this area of the page should take the reader.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["url", "page"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-md border px-3 py-2 text-sm ${mode === m ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:bg-slate-50"}`}>
                {m === "url" ? "External web address" : "Page in this document"}
              </button>
            ))}
          </div>
          {mode === "url" ? (
            <div className="space-y-1.5">
              <Label htmlFor="link-url">Web address</Label>
              <Input id="link-url" autoFocus placeholder="https://example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="link-page">Page number (1–{pageCount})</Label>
              <Input id="link-page" type="number" min={1} max={pageCount} value={pageNum} onChange={(e) => setPageNum(Number(e.target.value))} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={() => onSave(mode === "url" ? { url: url.trim(), targetPage: undefined } : { targetPage: pageNum, url: undefined })}>
            Save link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Signature ───────────────────────── */

/** Crops transparent / white margins so a placed signature hugs its ink. */
export function trimImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
      let minX = width, minY = height, maxX = -1, maxY = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const visible = data[i + 3] > 16 && !(data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245);
          if (visible) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) return resolve(dataUrl);
      const pad = 6;
      const out = document.createElement("canvas");
      out.width = maxX - minX + 1 + pad * 2;
      out.height = maxY - minY + 1 + pad * 2;
      out.getContext("2d")?.drawImage(c, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
      resolve(out.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function SignatureDialog({
  open,
  kind,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  kind: "signature" | "initials";
  onOpenChange: (o: boolean) => void;
  onDone: (dataUrl: string, save: boolean) => void;
}) {
  const padRef = useRef<SignaturePadRef>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [save, setSave] = useState(true);
  const [error, setError] = useState("");

  const finish = async (raw: string | null) => {
    if (!raw) {
      setError(`Please draw or type your ${kind === "initials" ? "initials" : "signature"} first.`);
      return;
    }
    setError("");
    onDone(await trimImage(raw), save);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kind === "initials" ? "New initials" : "New signature"}</DialogTitle>
          <DialogDescription>Draw, type or upload it, then click on the page where it should go.</DialogDescription>
        </DialogHeader>
        <SignaturePad ref={padRef} width={380} height={150} />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox checked={save} onCheckedChange={(v) => setSave(v === true)} />
            Remember on this device
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <FontAwesomeIcon icon={faUpload} className="mr-2 h-3.5 w-3.5" /> Upload image
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) finish(await readFileAsDataUrl(f));
            }}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => finish(padRef.current && !padRef.current.isEmpty() ? padRef.current.getSignature() : null)}>Use {kind}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Custom stamp ───────────────────────── */

export function StampDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (label: string, color: string) => void }) {
  const [text, setText] = useState("RECEIVED");
  const [color, setColor] = useState("#1d4ed8");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Custom stamp</DialogTitle>
          <DialogDescription>Type the stamp text and pick a color.</DialogDescription>
        </DialogHeader>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="stamp-text">Text</Label>
            <Input id="stamp-text" value={text} maxLength={30} onChange={(e) => setText(e.target.value.toUpperCase())} />
          </div>
          <input type="color" aria-label="Stamp color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded border p-0.5" />
        </div>
        <div className="flex justify-center py-2">
          <span className="rounded-sm border-[3px] px-3 py-1 text-lg font-bold" style={{ borderColor: color, color }}>
            {text || "STAMP"}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!text.trim()} onClick={() => onDone(text.trim(), color)}>
            Place stamp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Find & Replace ───────────────────────── */

export function FindReplaceDialog({
  open,
  onOpenChange,
  onReplace,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReplace: (find: string, replace: string, matchCase: boolean) => Promise<number>;
}) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    if (open) setResult("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find &amp; Replace</DialogTitle>
          <DialogDescription>Replaces matching text on every page. Each match is covered and rewritten in a similar font.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="fr-find">Find</Label>
            <Input id="fr-find" autoFocus value={find} onChange={(e) => setFind(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fr-replace">Replace with</Label>
            <Input id="fr-replace" value={replace} onChange={(e) => setReplace(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={matchCase} onCheckedChange={(v) => setMatchCase(v === true)} /> Match case
          </label>
          {result && <p className="text-sm text-slate-600">{result}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            disabled={!find || busy}
            onClick={async () => {
              setBusy(true);
              const n = await onReplace(find, replace, matchCase);
              setBusy(false);
              setResult(n ? `Replaced ${n} match${n === 1 ? "" : "es"}.` : "No matches found.");
            }}
          >
            {busy ? "Replacing…" : "Replace all"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Existing form fields ───────────────────────── */

export function FormEditDialog({
  open,
  onOpenChange,
  fields,
  edits,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fields: ExistingField[] | null;
  edits: ExistingFieldEdit[];
  onChange: (edits: ExistingFieldEdit[]) => void;
}) {
  const names = fields ? [...new Set(fields.map((f) => f.name))] : [];
  const editFor = (name: string) => edits.find((e) => e.name === name) ?? { name };
  const update = (name: string, patch: Partial<ExistingFieldEdit>) => {
    const next = edits.filter((e) => e.name !== name);
    next.push({ ...editFor(name), ...patch });
    onChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Existing form fields</DialogTitle>
          <DialogDescription>Rename or remove the fillable fields this PDF already has.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {fields === null && <p className="text-sm text-slate-500">Reading fields…</p>}
          {fields && names.length === 0 && <p className="text-sm text-slate-500">This PDF has no form fields. Use Forms → Add new form fields to create some.</p>}
          {names.map((name) => {
            const f = fields!.find((x) => x.name === name)!;
            const e = editFor(name);
            return (
              <div key={name} className={`flex items-center gap-2 rounded-md border p-2 ${e.deleted ? "border-red-200 bg-red-50/60" : "border-slate-200"}`}>
                <div className="w-20 shrink-0 text-xs text-slate-500">
                  {f.type || "Field"} · p{f.pageIndex + 1}
                </div>
                <Input className="h-8" disabled={e.deleted} value={e.newName ?? name} onChange={(ev) => update(name, { newName: ev.target.value })} aria-label={`Name of ${name}`} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={e.deleted ? "text-slate-600" : "text-red-600"}
                  aria-label={e.deleted ? `Keep ${name}` : `Delete ${name}`}
                  onClick={() => update(name, { deleted: !e.deleted })}
                >
                  <FontAwesomeIcon icon={e.deleted ? faRotateLeft : faTrashCan} />
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Attachments ───────────────────────── */

export function AttachmentsDialog({
  open,
  onOpenChange,
  attachments,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  attachments: EditorAttachment[];
  onChange: (a: EditorAttachment[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
          <DialogDescription>Files attached here are embedded inside the PDF.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {attachments.length === 0 && <p className="text-sm text-slate-500">No files attached yet.</p>}
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm">
              <FontAwesomeIcon icon={faPaperclip} className="text-slate-400" />
              <span className="flex-1 truncate">{a.name}</span>
              <span className="text-xs text-slate-400">{(a.size / 1024).toFixed(0)} KB</span>
              <Button variant="ghost" size="icon" aria-label={`Remove ${a.name}`} onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}>
                <FontAwesomeIcon icon={faTrashCan} className="text-red-600" />
              </Button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            const added: EditorAttachment[] = [];
            for (const f of files) {
              if (f.size > 20 * 1024 * 1024) continue;
              const bytes = new Uint8Array(await f.arrayBuffer());
              added.push({ id: uid("a"), name: f.name, mimeType: f.type, size: f.size, data: bytesToBase64(bytes) });
            }
            onChange([...attachments, ...added]);
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FontAwesomeIcon icon={faPaperclip} className="mr-2 h-3.5 w-3.5" /> Attach files
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
