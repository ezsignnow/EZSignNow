import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faChevronRight,
  faCirclePlus,
  faCloudArrowUp,
  faDownload,
  faFileCirclePlus,
  faFloppyDisk,
  faPaperclip,
  faPaperPlane,
  faSpinner,
  faTableCellsLarge,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditorToolbar, type SavedSignature } from "@/components/editor/EditorToolbar";
import { EditorPageView, type DrawDefaults } from "@/components/editor/EditorPageView";
import { PropertiesBar } from "@/components/editor/PropertiesBar";
import {
  AttachmentsDialog,
  FindReplaceDialog,
  FormEditDialog,
  LinkDialog,
  SignatureDialog,
  StampDialog,
} from "@/components/editor/EditorDialogs";
import type {
  EditorObject,
  EditorPage,
  EditorState,
  PageImageBox,
  PageTextItem,
  TextObject,
  Tool,
} from "@/components/editor/types";
import { BASELINE_RATIO } from "@/components/editor/types";
import { blankPage, getExistingFields, getPageImages, getPageText, loadPdf, renderPage, type ExistingField } from "@/components/editor/pdfSource";
import { exportPdf } from "@/components/editor/exportPdf";
import { clamp, imageAspect, measureText, moveObject, readFileAsDataUrl, uid } from "@/components/editor/geometry";
import { logDocumentEvent } from "@/utils/auditLogger";
import { takeHandOff } from "@/lib/pdftools/handoff";

const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const EMPTY_STATE: EditorState = { pages: [], objects: [], existingFieldEdits: [], attachments: [], fieldValues: {} };
const MAX_HISTORY = 100;

interface DocRow {
  id: string;
  title: string;
  status: string;
  file_url: string;
  file_name: string;
}

function signaturesKey(userId: string | undefined) {
  return `ez_editor_signatures_${userId ?? "anon"}`;
}

/** Thumbnail of one page for the page overview panel. */
function PageThumb({ pdfPage, page, index, onClick }: { pdfPage: PDFPageProxy | null; page: EditorPage; index: number; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!pdfPage || !ref.current) return;
    const task = renderPage(pdfPage, ref.current, 110 / page.width, false);
    task.promise.catch(() => undefined);
    return () => task.cancel();
  }, [pdfPage, page.width]);
  const swap = page.rotation === 90 || page.rotation === 270;
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1" aria-label={`Go to page ${index + 1}`}>
      <div className="flex items-center justify-center bg-white shadow ring-1 ring-slate-200 group-hover:ring-2 group-hover:ring-blue-400" style={{ width: 110, height: swap ? 110 * (page.width / page.height) : 110 * (page.height / page.width), overflow: "hidden" }}>
        <div style={{ width: 110, height: 110 * (page.height / page.width), transform: `rotate(${page.rotation}deg)`, flexShrink: 0 }}>
          {pdfPage ? <canvas ref={ref} className="h-full w-full" /> : null}
        </div>
      </div>
      <span className="text-xs text-slate-500">{index + 1}</span>
    </button>
  );
}

export default function PdfEditor() {
  const { id: documentId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const [showModeHint, setShowModeHint] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // ── Document source ──
  const [docRow, setDocRow] = useState<DocRow | null>(null);
  const [title, setTitle] = useState("Untitled document");
  const [sourceBytes, setSourceBytes] = useState<Uint8Array | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfPages, setPdfPages] = useState<Record<number, PDFPageProxy>>({});
  const [loading, setLoading] = useState(!!documentId);
  const [started, setStarted] = useState(false);

  // ── Editor state with undo history ──
  const [state, setStateRaw] = useState<EditorState>(EMPTY_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const past = useRef<EditorState[]>([]);
  const [historyLen, setHistoryLen] = useState(0);
  const [dirty, setDirty] = useState(false);

  const checkpoint = useCallback(() => {
    past.current.push(stateRef.current);
    if (past.current.length > MAX_HISTORY) past.current.shift();
    setHistoryLen(past.current.length);
    setDirty(true);
  }, []);
  const setSilently = useCallback((fn: (s: EditorState) => EditorState) => {
    setStateRaw((s) => {
      const next = fn(s);
      stateRef.current = next;
      return next;
    });
  }, []);
  const commit = useCallback(
    (fn: (s: EditorState) => EditorState) => {
      checkpoint();
      setSilently(fn);
    },
    [checkpoint, setSilently],
  );

  // ── UI state ──
  const [tool, setTool] = useState<Tool>({ type: "select" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showThumbs, setShowThumbs] = useState(false);
  const [defaults, setDefaults] = useState<DrawDefaults>({
    fontFamily: "Helvetica",
    fontSize: 12,
    textColor: "#000000",
    inkColor: "#1d4ed8",
    inkWidth: 2,
    shapeColor: "#dc2626",
    shapeWidth: 2,
    highlightColor: "#fde047",
  });
  const [textItems, setTextItems] = useState<Record<string, PageTextItem[]>>({});
  const [imageBoxes, setImageBoxes] = useState<Record<string, PageImageBox[]>>({});
  const [busy, setBusy] = useState<null | "save" | "download" | "send">(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dialogs
  const [linkEditId, setLinkEditId] = useState<string | null>(null);
  const [sigDialog, setSigDialog] = useState<null | "signature" | "initials">(null);
  const [stampDialog, setStampDialog] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [formEditOpen, setFormEditOpen] = useState(false);
  const [existingFields, setExistingFields] = useState<ExistingField[] | null>(null);
  /** The PDF's own form fields, shown as fillable inputs. */
  const [fillFields, setFillFields] = useState<ExistingField[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);

  // Saved signatures (per user, on this device only)
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  useEffect(() => {
    try {
      setSavedSignatures(JSON.parse(localStorage.getItem(signaturesKey(user?.id)) || "[]"));
    } catch {
      setSavedSignatures([]);
    }
  }, [user?.id]);
  const persistSignatures = (list: SavedSignature[]) => {
    setSavedSignatures(list);
    try {
      localStorage.setItem(signaturesKey(user?.id), JSON.stringify(list.slice(0, 6)));
    } catch {
      /* storage full or unavailable — keep in memory only */
    }
  };

  // ── Loading ──
  const openBytes = useCallback(async (bytes: Uint8Array | null) => {
    setTextItems({});
    setImageBoxes({});
    setExistingFields(null);
    past.current = [];
    setHistoryLen(0);
    setDirty(false);
    setSelectedId(null);
    setEditingId(null);
    setFillFields([]);
    if (!bytes) {
      setSourceBytes(null);
      setPdfDoc(null);
      setPdfPages({});
      setSilently(() => ({ ...EMPTY_STATE, pages: [blankPage()] }));
      setStarted(true);
      return;
    }
    const loaded = await loadPdf(bytes);
    const pages: Record<number, PDFPageProxy> = {};
    for (let i = 0; i < loaded.doc.numPages; i++) pages[i] = await loaded.doc.getPage(i + 1);
    setSourceBytes(bytes);
    setPdfDoc(loaded.doc);
    setPdfPages(pages);
    setSilently(() => ({ ...EMPTY_STATE, pages: loaded.pages }));
    setStarted(true);
    getExistingFields(loaded.doc).then(setFillFields).catch(() => setFillFields([]));
  }, [setSilently]);

  useEffect(() => {
    if (!documentId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("documents").select("id,title,status,file_url,file_name").eq("id", documentId).single();
        if (error || !data) throw error || new Error("Document not found");
        const path = data.file_url.split("/documents/")[1];
        if (!path) throw new Error("Document file not found");
        const { data: blob, error: dlErr } = await supabase.storage.from("documents").download(decodeURIComponent(path));
        if (dlErr || !blob) throw dlErr || new Error("Could not download the PDF");
        if (cancelled) return;
        setDocRow(data as DocRow);
        setTitle(data.title);
        await openBytes(new Uint8Array(await blob.arrayBuffer()));
      } catch (err) {
        toast({ title: "Couldn't open document", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, user, openBytes, toast]);

  // Files handed over from the PDF tools open straight away.
  useEffect(() => {
    if (documentId) return;
    const handed = takeHandOff();
    if (handed?.[0]) {
      setTitle(handed[0].name.replace(/\.pdf$/i, ""));
      openBytes(handed[0].bytes).catch((err) => toast({ title: "Couldn't open PDF", description: String(err?.message ?? err), variant: "destructive" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit the first page to the available width once a document is open.
  const fitted = useRef(false);
  useEffect(() => {
    if (!started || fitted.current || !state.pages.length || !scrollRef.current) return;
    fitted.current = true;
    const avail = scrollRef.current.clientWidth - 64;
    const widest = Math.max(...state.pages.map((p) => p.width));
    const target = clamp(avail / widest, 0.5, 1.5);
    setZoom(ZOOM_LEVELS.reduce((best, z) => (z <= target && z > best ? z : best), 0.5));
  }, [started, state.pages]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ── Object helpers ──
  const selected = useMemo(() => state.objects.find((o) => o.id === selectedId) ?? null, [state.objects, selectedId]);
  const fieldCounter = useRef(0);
  const lastFieldEdit = useRef<string | null>(null);
  const nextFieldIndex = useCallback(() => {
    fieldCounter.current = Math.max(fieldCounter.current, stateRef.current.objects.filter((o) => o.kind === "field").length) + 1;
    return fieldCounter.current;
  }, []);

  const create = useCallback(
    (objs: EditorObject[], opts?: { select?: string; edit?: boolean }) => {
      commit((s) => ({ ...s, objects: [...s.objects, ...objs] }));
      if (opts?.select) setSelectedId(opts.select);
      setEditingId(opts?.edit ? opts.select ?? null : null);
    },
    [commit],
  );

  const update = useCallback(
    (id: string, fn: (o: EditorObject) => EditorObject) => setSilently((s) => ({ ...s, objects: s.objects.map((o) => (o.id === id ? fn(o) : o)) })),
    [setSilently],
  );

  const removeObject = useCallback(
    (id: string) => {
      commit((s) => ({ ...s, objects: s.objects.filter((o) => o.id !== id) }));
      setSelectedId(null);
      setEditingId(null);
    },
    [commit],
  );

  const endEditing = useCallback((id: string | null) => {
    setEditingId((current) => {
      if (current && current !== id) {
        const obj = stateRef.current.objects.find((o) => o.id === current);
        if (obj?.kind === "text" && !obj.text.trim()) {
          setSilently((s) => ({ ...s, objects: s.objects.filter((o) => o.id !== current) }));
          setSelectedId((sel) => (sel === current ? null : sel));
        }
      }
      return id;
    });
  }, [setSilently]);

  const patchSelected = (patch: Partial<EditorObject>) => {
    if (!selectedId) return;
    update(selectedId, (o) => {
      const next = { ...o, ...patch } as EditorObject;
      if (next.kind === "text") {
        const m = measureText(next.text, next.fontFamily, next.fontSize, next.bold, next.italic);
        return { ...next, w: Math.max(m.w, 30), h: m.h };
      }
      return next;
    });
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const copy = moveObject({ ...selected, id: uid() }, 12, 12);
    create([copy], { select: copy.id });
  };

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    setHistoryLen(past.current.length);
    setSilently(() => prev);
    setSelectedId(null);
    setEditingId(null);
  }, [setSilently]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable=true]");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        undo();
        return;
      }
      if (typing || document.querySelector("[role=dialog]")) return;
      if (e.key === "Escape") {
        setTool({ type: "select" });
        setSelectedId(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeObject(selectedId);
      } else if (selectedId && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        commit((s) => ({ ...s, objects: s.objects.map((o) => (o.id === selectedId ? moveObject(o, dx, dy) : o)) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, undo, removeObject, commit]);

  // ── Page operations ──
  const pageOps = {
    delete: (pageId: string) => {
      if (stateRef.current.pages.length <= 1) return;
      commit((s) => ({ ...s, pages: s.pages.filter((p) => p.id !== pageId), objects: s.objects.filter((o) => o.pageId !== pageId) }));
    },
    rotate: (pageId: string, dir: 1 | -1) =>
      commit((s) => ({
        ...s,
        pages: s.pages.map((p) => (p.id === pageId ? { ...p, rotation: (((p.rotation + dir * 90) % 360) + 360) % 360 as EditorPage["rotation"] } : p)),
      })),
    insertAt: (index: number) =>
      commit((s) => {
        const ref = s.pages[Math.min(index, s.pages.length - 1)];
        const pages = [...s.pages];
        pages.splice(index, 0, blankPage(ref?.width ?? 612, ref?.height ?? 792));
        return { ...s, pages };
      }),
  };
  const changeZoom = (dir: 1 | -1) => {
    const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom - 0.001);
    setZoom(ZOOM_LEVELS[clamp((idx < 0 ? ZOOM_LEVELS.length - 1 : idx) + dir, 0, ZOOM_LEVELS.length - 1)]);
  };

  // ── Page analysis (lazy) ──
  const ensureTextItems = useCallback(
    async (page: EditorPage): Promise<PageTextItem[]> => {
      if (page.sourceIndex === null) return [];
      const cached = textItems[page.id];
      if (cached) return cached;
      const items = await getPageText(pdfPages[page.sourceIndex]);
      setTextItems((t) => ({ ...t, [page.id]: items }));
      return items;
    },
    [pdfPages, textItems],
  );
  const ensureImageBoxes = useCallback(
    async (page: EditorPage) => {
      if (page.sourceIndex === null || imageBoxes[page.id]) return;
      const boxes = await getPageImages(pdfPages[page.sourceIndex]);
      setImageBoxes((b) => ({ ...b, [page.id]: boxes }));
    },
    [pdfPages, imageBoxes],
  );

  /** Position of a substring inside a text item, using the item's real width. */
  const substringBox = (item: PageTextItem, start: number, length: number) => {
    const full = measureText(item.str, item.fontFamily, item.fontSize, item.bold, item.italic).w - 4 || 1;
    const before = start ? measureText(item.str.slice(0, start), item.fontFamily, item.fontSize, item.bold, item.italic).w - 4 : 0;
    const part = measureText(item.str.slice(start, start + length), item.fontFamily, item.fontSize, item.bold, item.italic).w - 4;
    const scale = item.width / full;
    return { x: item.x + before * scale, w: Math.max(part * scale, 2) };
  };

  const findAndReplace = async (find: string, replace: string, matchCase: boolean) => {
    const flags = matchCase ? "g" : "gi";
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const created: EditorObject[] = [];
    for (const page of stateRef.current.pages) {
      const items = await ensureTextItems(page);
      for (const item of items) {
        for (const m of item.str.matchAll(re)) {
          const { x, w } = substringBox(item, m.index ?? 0, m[0].length);
          const top = item.baseline - item.fontSize * 0.92;
          created.push({ id: uid(), pageId: page.id, kind: "whiteout", x: x - 0.5, y: top - 0.5, w: w + 1, h: item.fontSize * 1.18 + 1, color: "#ffffff" });
          if (replace) {
            const t: TextObject = {
              id: uid(),
              pageId: page.id,
              kind: "text",
              x: x - 2,
              y: item.baseline - item.fontSize * BASELINE_RATIO,
              w: 0,
              h: 0,
              text: replace,
              fontFamily: item.fontFamily,
              fontSize: Math.round(item.fontSize * 10) / 10,
              color: "#000000",
              bold: item.bold,
              italic: item.italic,
            };
            const mm = measureText(t.text, t.fontFamily, t.fontSize, t.bold, t.italic);
            created.push({ ...t, w: mm.w, h: mm.h });
          }
        }
      }
    }
    if (created.length) create(created);
    return created.filter((o) => o.kind === "whiteout").length;
  };

  const detectFields = async () => {
    const created: EditorObject[] = [];
    for (const page of stateRef.current.pages) {
      const items = await ensureTextItems(page);
      for (const item of items) {
        for (const m of item.str.matchAll(/_{3,}/g)) {
          const { x, w } = substringBox(item, m.index ?? 0, m[0].length);
          if (w < 20) continue;
          const n = nextFieldIndex();
          created.push({ id: uid(), pageId: page.id, kind: "field", fieldType: "text", name: `Text${n}`, x, y: item.baseline - item.fontSize * 1.05, w, h: item.fontSize * 1.25 });
        }
      }
    }
    if (created.length) create(created);
    toast({
      title: created.length ? `Added ${created.length} form field${created.length === 1 ? "" : "s"}` : "No blank lines found",
      description: created.length ? "Fields were placed over blank underscore lines. Adjust them as needed." : "Detect fields looks for blank lines like ______ in the document text.",
    });
  };

  const openFormEdit = async () => {
    setFormEditOpen(true);
    setExistingFields(pdfDoc ? fillFields : []);
  };

  const handleNewImage = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please choose an image under 15 MB.", variant: "destructive" });
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setTool({ type: "place-image", dataUrl, aspect: await imageAspect(dataUrl), as: "image" });
  };

  const placeSignature = async (dataUrl: string) => {
    setTool({ type: "place-image", dataUrl, aspect: await imageAspect(dataUrl), as: "signature" });
  };

  // ── Output ──
  const buildPdf = async () => {
    endEditing(null);
    const result = await exportPdf(sourceBytes, stateRef.current);
    if (result.replacedCharacters) {
      toast({ title: "Some characters were replaced", description: "A few characters aren't supported by the built-in PDF fonts and were written as “?”." });
    }
    return result.bytes;
  };

  const download = async () => {
    setBusy("download");
    try {
      const bytes = await buildPdf();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title.replace(/[\\/:*?"<>|]+/g, "_") || "document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch (err) {
      toast({ title: "Couldn't create the PDF", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  /** Saves the edited PDF to the user's documents. Returns the document id. */
  const saveToDocuments = async (): Promise<string | null> => {
    if (!user) return null;
    const bytes = await buildPdf();
    const path = `${user.id}/${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, new Blob([bytes], { type: "application/pdf" }), { contentType: "application/pdf" });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
    const fileName = `${title || "document"}.pdf`;

    let id: string;
    if (docRow && docRow.status === "draft") {
      const { error } = await supabase
        .from("documents")
        .update({ title, file_url: urlData.publicUrl, file_name: fileName, file_size: bytes.length, updated_at: new Date().toISOString() })
        .eq("id", docRow.id);
      if (error) throw error;
      id = docRow.id;
    } else {
      const newTitle = docRow ? `${title} (edited)` : title;
      const { data, error } = await supabase
        .from("documents")
        .insert({ owner_id: user.id, title: newTitle, file_url: urlData.publicUrl, file_name: fileName, file_size: bytes.length, status: "draft" })
        .select()
        .single();
      if (error || !data) throw error || new Error("Could not create the document");
      id = data.id;
      logDocumentEvent(id, "upload", undefined, user.email || undefined, (user.user_metadata?.full_name || "Document Owner") as string).catch(() => undefined);
    }

    // The saved file becomes the new starting point for further edits.
    setDocRow({ id, title: docRow && docRow.status !== "draft" ? `${title} (edited)` : title, status: "draft", file_url: urlData.publicUrl, file_name: fileName });
    await openBytes(bytes);
    if (documentId !== id) navigate(`/document/${id}/edit`, { replace: true });
    return id;
  };

  const save = async (thenSend: boolean) => {
    setBusy(thenSend ? "send" : "save");
    try {
      const id = await saveToDocuments();
      if (!id) return;
      if (thenSend) navigate(`/document/${id}/prepare`);
      else toast({ title: "Saved to your documents" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-slate-500">
        <FontAwesomeIcon icon={faSpinner} className="h-5 w-5 animate-spin" /> Opening document…
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex flex-1 flex-col items-center bg-white px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-800">Online PDF editor</h1>
        <p className="mt-2 text-lg text-slate-500">Edit PDF files: add text, images, links, form fields, signatures and annotations.</p>
        <label
          className="mt-10 flex w-full max-w-xl cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 hover:border-emerald-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) {
              setTitle(f.name.replace(/\.pdf$/i, ""));
              await openBytes(new Uint8Array(await f.arrayBuffer())).catch((err) => toast({ title: "Couldn't open PDF", description: String(err?.message ?? err), variant: "destructive" }));
            }
          }}
        >
          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-lg font-semibold text-white shadow hover:bg-emerald-600">
            <FontAwesomeIcon icon={faCloudArrowUp} /> Upload PDF file
          </span>
          <span className="text-sm text-slate-500">or drop a PDF here</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setTitle(f.name.replace(/\.pdf$/i, ""));
              await openBytes(new Uint8Array(await f.arrayBuffer())).catch((err) => toast({ title: "Couldn't open PDF", description: String(err?.message ?? err), variant: "destructive" }));
            }}
          />
        </label>
        <button type="button" className="mt-4 text-emerald-600 hover:underline" onClick={() => openBytes(null)}>
          or start with a blank document
        </button>
        <button type="button" className="mt-2 text-sm text-slate-500 hover:underline" onClick={() => navigate("/dashboard?tab=documents&status=all")}>
          Edit one of your documents instead
        </button>
      </div>
    );
  }

  const linkObj = state.objects.find((o) => o.id === linkEditId);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-slate-100">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Button>
        <FontAwesomeIcon icon={faFilePdf} className="h-5 w-5 text-red-500" />
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          className="min-w-0 flex-1 rounded px-2 py-1 text-base font-semibold text-slate-800 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Document title"
        />
        {docRow && docRow.status !== "draft" && (
          <span className="hidden text-xs text-amber-600 md:inline">This document was already sent — saving creates an edited copy.</span>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowThumbs((v) => !v)} aria-pressed={showThumbs} title="Page overview">
          <FontAwesomeIcon icon={faTableCellsLarge} />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)} title="Attachments">
          <FontAwesomeIcon icon={faPaperclip} />
          {state.attachments.length > 0 && <span className="ml-1 text-xs">{state.attachments.length}</span>}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-30 space-y-1 border-b border-slate-200 bg-slate-100/95 px-4 pt-3 pb-1 backdrop-blur">
        <EditorToolbar
          tool={tool}
          onTool={(t) => {
            endEditing(null);
            setSelectedId(null);
            setTool(t);
          }}
          onFindReplace={() => setFindOpen(true)}
          onNewImage={handleNewImage}
          onCustomStamp={() => setStampDialog(true)}
          onNewSignature={(k) => setSigDialog(k)}
          savedSignatures={savedSignatures}
          onUseSignature={(s) => placeSignature(s.dataUrl)}
          onDeleteSignature={(id) => persistSignatures(savedSignatures.filter((s) => s.id !== id))}
          onDetectFields={detectFields}
          onFormEdit={openFormEdit}
          onPublish={() => save(true)}
          showAnnotations={showAnnotations}
          onToggleAnnotations={() => setShowAnnotations((v) => !v)}
          onUndo={undo}
          canUndo={historyLen > 0}
        />
        <PropertiesBar
          tool={tool}
          selected={selected}
          defaults={defaults}
          onDefaults={(p) => setDefaults((d) => ({ ...d, ...p }))}
          onCheckpoint={checkpoint}
          onPatch={patchSelected}
          onDelete={() => selectedId && removeObject(selectedId)}
          onDuplicate={duplicateSelected}
          onEditLink={() => setLinkEditId(selectedId)}
        />
      </div>

      {showModeHint && (mode === "fill" || mode === "forms") && (
        <div className="flex items-center justify-center gap-3 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {mode === "fill"
            ? fillFields.length
              ? `This PDF has ${fillFields.length} fillable field${fillFields.length === 1 ? "" : "s"} — click them to fill them in. Use Sign to add your signature.`
              : "Click anywhere to type (Text), add ✓ marks from Forms, and use Sign to add your signature."
            : "Use Forms in the toolbar to add text fields, checkboxes, drop-downs, radio buttons and signature boxes."}
          <button type="button" className="font-medium underline" onClick={() => setShowModeHint(false)}>Got it</button>
        </div>
      )}

      <div className="flex flex-1">
        {showThumbs && (
          <aside className="sticky top-[120px] hidden max-h-[calc(100vh-120px)] w-40 shrink-0 space-y-3 overflow-y-auto border-r border-slate-200 bg-white p-3 md:block">
            {state.pages.map((p, i) => (
              <PageThumb
                key={p.id}
                page={p}
                index={i}
                pdfPage={p.sourceIndex !== null ? pdfPages[p.sourceIndex] ?? null : null}
                onClick={() => scrollRef.current?.querySelector(`[data-page-index="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              />
            ))}
          </aside>
        )}

        {/* Pages */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto px-4 pb-28 pt-6">
          <div className="flex w-max min-w-full flex-col items-center gap-8">
            {state.pages.map((page, i) => (
              <EditorPageView
                key={page.id}
                page={page}
                index={i}
                pageCount={state.pages.length}
                pdfPage={page.sourceIndex !== null ? pdfPages[page.sourceIndex] ?? null : null}
                zoom={zoom}
                showAnnotations={showAnnotations}
                objects={state.objects.filter((o) => o.pageId === page.id)}
                selectedId={selectedId}
                editingId={editingId}
                tool={tool}
                defaults={defaults}
                textItems={page.sourceIndex === null ? [] : textItems[page.id]}
                imageBoxes={page.sourceIndex === null ? [] : imageBoxes[page.id]}
                nextFieldIndex={nextFieldIndex}
                onCheckpoint={checkpoint}
                onCreate={create}
                onUpdate={update}
                onSelect={setSelectedId}
                onEdit={endEditing}
                onToolDone={() => setTool({ type: "select" })}
                onLinkCreated={(id) => setLinkEditId(id)}
                onDeletePage={() => pageOps.delete(page.id)}
                onRotate={(dir) => pageOps.rotate(page.id, dir)}
                onZoom={changeZoom}
                onInsertBefore={() => pageOps.insertAt(i)}
                onNeedTextItems={() => ensureTextItems(page)}
                onNeedImageBoxes={() => ensureImageBoxes(page)}
                fillFields={page.sourceIndex === null ? undefined : fillFields.filter((f) => f.pageIndex === page.sourceIndex && !state.existingFieldEdits.some((e) => e.name === f.name && e.deleted))}
                fieldValues={state.fieldValues}
                onFieldValue={(name, value) => {
                  // Typing in the same field only records one undo step.
                  if (lastFieldEdit.current !== name) checkpoint();
                  lastFieldEdit.current = name;
                  setSilently((st) => ({ ...st, fieldValues: { ...st.fieldValues, [name]: value } }));
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => pageOps.insertAt(state.pages.length)}
              className="flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-50"
            >
              <FontAwesomeIcon icon={faCirclePlus} /> Insert page here
            </button>
          </div>
        </div>
      </div>

      {/* Apply changes */}
      <div className="pointer-events-none fixed bottom-4 left-64 right-0 z-40 flex justify-center">
        <div className="pointer-events-auto rounded-xl bg-amber-100/90 p-2 shadow-lg">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" disabled={!!busy} className="bg-emerald-500 text-base font-semibold hover:bg-emerald-600">
                {busy ? <FontAwesomeIcon icon={faSpinner} className="mr-2 animate-spin" /> : null}
                Apply changes <FontAwesomeIcon icon={faChevronRight} className="ml-2 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" className="w-64">
              <DropdownMenuItem onSelect={() => save(false)}>
                <FontAwesomeIcon icon={faFloppyDisk} className="mr-2 h-4 w-4 text-slate-500" /> Save to my documents
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={download}>
                <FontAwesomeIcon icon={faDownload} className="mr-2 h-4 w-4 text-slate-500" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => save(true)}>
                <FontAwesomeIcon icon={faPaperPlane} className="mr-2 h-4 w-4 text-slate-500" /> Save &amp; send for signature
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/edit")}>
                <FontAwesomeIcon icon={faFileCirclePlus} className="mr-2 h-4 w-4 text-slate-500" /> Edit another PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialogs */}
      <LinkDialog
        open={!!linkObj}
        onOpenChange={(o) => {
          if (!o) {
            // A brand-new link with no destination is discarded.
            if (linkObj && linkObj.kind === "link" && !linkObj.url && !linkObj.targetPage) {
              setSilently((s) => ({ ...s, objects: s.objects.filter((x) => x.id !== linkObj.id) }));
              setSelectedId(null);
            }
            setLinkEditId(null);
          }
        }}
        initial={linkObj && linkObj.kind === "link" ? { url: linkObj.url, targetPage: linkObj.targetPage } : {}}
        pageCount={state.pages.length}
        onSave={(v) => {
          if (linkEditId) commit((s) => ({ ...s, objects: s.objects.map((o) => (o.id === linkEditId ? { ...o, ...v } : o)) }));
          setLinkEditId(null);
        }}
      />
      <SignatureDialog
        open={!!sigDialog}
        kind={sigDialog ?? "signature"}
        onOpenChange={(o) => !o && setSigDialog(null)}
        onDone={(dataUrl, remember) => {
          if (remember) persistSignatures([{ id: uid("s"), kind: sigDialog ?? "signature", dataUrl }, ...savedSignatures]);
          setSigDialog(null);
          placeSignature(dataUrl);
        }}
      />
      <StampDialog
        open={stampDialog}
        onOpenChange={setStampDialog}
        onDone={(label, color) => {
          setStampDialog(false);
          setTool({ type: "stamp", label, color });
        }}
      />
      <FindReplaceDialog open={findOpen} onOpenChange={setFindOpen} onReplace={findAndReplace} />
      <FormEditDialog
        open={formEditOpen}
        onOpenChange={setFormEditOpen}
        fields={existingFields}
        edits={state.existingFieldEdits}
        onChange={(edits) => commit((s) => ({ ...s, existingFieldEdits: edits }))}
      />
      <AttachmentsDialog open={attachOpen} onOpenChange={setAttachOpen} attachments={state.attachments} onChange={(a) => commit((s) => ({ ...s, attachments: a }))} />
    </div>
  );
}
