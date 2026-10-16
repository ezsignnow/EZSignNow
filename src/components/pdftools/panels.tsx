import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRotateLeft,
  faRotateRight,
  faTrashCan,
  faClone,
  faFileCirclePlus,
  faScissors,
  faPlus,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faArrowDown,
  faWandMagicSparkles,
  faBookmark,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InputFile, Options } from "@/lib/pdftools/core";
import { parsePageRanges } from "@/lib/pdftools/core";
import type { PlanItem, CropRect } from "@/lib/pdftools/tools/pages";
import type { BookmarkEntry } from "@/lib/pdftools/tools/stamp";
import { readMetadata } from "@/lib/pdftools/tools/stamp";
import { bookmarkPages } from "@/lib/pdftools/tools/split";
import { pdfjsFor } from "@/lib/pdftools/tools/render";
import { pageLines } from "@/lib/pdftools/textModel";
import { renderPageToCanvas } from "@/lib/pdfjs";
import { PageThumb, usePageCount } from "./Thumbs";

/** Turns 0-based indexes into a compact "1-3, 5" string. */
export function indexesToRanges(idx: number[]): string {
  const s = [...new Set(idx)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(j > i ? `${s[i] + 1}-${s[j] + 1}` : `${s[i] + 1}`);
    i = j;
  }
  return parts.join(", ");
}

const safeParse = (v: string, n: number) => {
  try {
    return v.trim() ? parsePageRanges(v, n) : [];
  } catch {
    return [];
  }
};

/* ───────────── Select pages (and per-page rotate) ───────────── */

export function SelectPagesPanel({ file, options, onOptions, mode }: { file: InputFile; options: Options; onOptions: (o: Options) => void; mode: "select" | "rotate" }) {
  const count = usePageCount(file.bytes) ?? 0;
  const selected = new Set(safeParse(String(options.pages ?? ""), count));
  const rotations = (options.rotations as Record<number, number>) ?? {};
  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onOptions({ ...options, pages: indexesToRanges([...next]) });
  };
  const rotate = (i: number, d: number) => onOptions({ ...options, rotations: { ...rotations, [i]: ((((rotations[i] ?? 0) + d) % 360) + 360) % 360 } });
  const rotateAll = (d: number) => onOptions({ ...options, rotations: Object.fromEntries(Array.from({ length: count }, (_, i) => [i, ((((rotations[i] ?? 0) + d) % 360) + 360) % 360])) });
  if (count <= 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === "select" ? (
          <>
            <Button size="sm" variant="outline" onClick={() => onOptions({ ...options, pages: `1-${count}` })}>Select all</Button>
            <Button size="sm" variant="outline" onClick={() => onOptions({ ...options, pages: "" })}>Clear</Button>
            <Button size="sm" variant="outline" onClick={() => onOptions({ ...options, pages: "odd" })}>Odd</Button>
            <Button size="sm" variant="outline" onClick={() => onOptions({ ...options, pages: "even" })}>Even</Button>
            <span className="text-sm text-slate-500">{selected.size} of {count} selected</span>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => rotateAll(-90)}><FontAwesomeIcon icon={faRotateLeft} className="mr-1.5" />All left</Button>
            <Button size="sm" variant="outline" onClick={() => rotateAll(90)}><FontAwesomeIcon icon={faRotateRight} className="mr-1.5" />All right</Button>
            <Button size="sm" variant="outline" onClick={() => onOptions({ ...options, rotations: {} })}>Reset</Button>
            <span className="text-sm text-slate-500">Click a page to turn it 90°. Pages you turn here are used instead of the settings above.</span>
          </>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {Array.from({ length: count }, (_, i) => {
          const on = mode === "select" ? selected.has(i) : !!rotations[i];
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => (mode === "select" ? toggle(i) : rotate(i, 90))}
                aria-pressed={on}
                aria-label={mode === "select" ? `Select page ${i + 1}` : `Rotate page ${i + 1}`}
                className={`relative rounded-md p-1 transition ${on ? "bg-blue-100 ring-2 ring-blue-500" : "hover:bg-slate-100"}`}
              >
                <div className="flex h-[150px] items-center justify-center">
                  <PageThumb bytes={file.bytes} index={i} width={mode === "rotate" && (rotations[i] ?? 0) % 180 ? 140 : 104} rotate={mode === "rotate" ? rotations[i] ?? 0 : 0} />
                </div>
                {on && mode === "select" && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">✓</span>}
              </button>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                {mode === "rotate" && (
                  <button type="button" aria-label={`Rotate page ${i + 1} left`} onClick={() => rotate(i, -90)} className="rounded p-1 hover:bg-slate-100">
                    <FontAwesomeIcon icon={faRotateLeft} className="h-3 w-3" />
                  </button>
                )}
                {i + 1}
                {mode === "rotate" && rotations[i] ? ` · ${rotations[i]}°` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Organize ───────────── */

export function OrganizePanel({ files, options, onOptions }: { files: InputFile[]; options: Options; onOptions: (o: Options) => void }) {
  const plan = (options.plan as PlanItem[]) ?? [];
  const [counts, setCounts] = useState<number[]>([]);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileKey = files.map((f) => f.id).join("|");

  useEffect(() => {
    let alive = true;
    Promise.all(files.map((f) => pdfjsFor(f.bytes).then((d) => d.numPages).catch(() => 0))).then((c) => {
      if (!alive) return;
      setCounts(c);
      // Keep pages from files still present, append pages of new files.
      const known = new Set(plan.filter((p) => !("blank" in p)).map((p) => (p as { file: number }).file));
      const kept = plan.filter((p) => "blank" in p || (p as { file: number }).file < files.length);
      const added: PlanItem[] = [];
      c.forEach((n, fi) => {
        if (!known.has(fi)) for (let i = 0; i < n; i++) added.push({ file: fi, page: i, rotate: 0 });
      });
      if (added.length || kept.length !== plan.length) onOptions({ ...options, plan: [...kept, ...added] });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  const setPlan = (p: PlanItem[]) => onOptions({ ...options, plan: p });
  const update = (i: number, fn: (p: PlanItem) => PlanItem | PlanItem[] | null) => {
    const next: PlanItem[] = [];
    plan.forEach((p, k) => {
      if (k !== i) return void next.push(p);
      const r = fn(p);
      if (Array.isArray(r)) next.push(...r);
      else if (r) next.push(r);
    });
    setPlan(next);
  };
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...plan];
    const [x] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, x);
    setPlan(next);
  };
  const blankSize = () => {
    const first = plan.find((p) => !("blank" in p)) as { file: number; page: number } | undefined;
    return { width: 595.28, height: 841.89, ...(first ? {} : {}) };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button size="sm" variant="outline" onClick={() => setPlan([...plan].reverse())}>Reverse order</Button>
        <Button size="sm" variant="outline" onClick={() => setPlan(counts.flatMap((n, fi) => Array.from({ length: n }, (_, i) => ({ file: fi, page: i, rotate: 0 }))))}>Reset</Button>
        <Button size="sm" variant="outline" onClick={() => setPlan([...plan, { blank: true, ...blankSize() }])}><FontAwesomeIcon icon={faPlus} className="mr-1.5" />Blank page</Button>
        <span className="text-slate-500">Drag pages to reorder. {plan.length} page{plan.length === 1 ? "" : "s"}.</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {plan.map((p, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(i);
            }}
            onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current !== null) move(dragFrom.current, i);
              dragFrom.current = null;
              setDragOver(null);
            }}
            className={`group flex cursor-grab flex-col items-center gap-1 rounded-lg p-1.5 ${dragOver === i ? "bg-blue-50 ring-2 ring-blue-400" : ""}`}
            data-plan-index={i}
          >
            <div className="flex h-[150px] items-center justify-center">
              {"blank" in p ? (
                <div className="flex h-[146px] w-[104px] items-center justify-center bg-white text-xs text-slate-400 ring-1 ring-dashed ring-slate-300">Blank</div>
              ) : (
                <PageThumb bytes={files[p.file].bytes} index={p.page} width={p.rotate % 180 ? 140 : 104} rotate={p.rotate} />
              )}
            </div>
            <div className="text-xs text-slate-500">
              {i + 1}
              {!("blank" in p) && files.length > 1 ? ` · file ${p.file + 1} p${p.page + 1}` : ""}
            </div>
            <div className="flex gap-0.5 opacity-70 group-hover:opacity-100">
              {!("blank" in p) && (
                <>
                  <button type="button" title="Rotate left" aria-label={`Rotate page ${i + 1} left`} onClick={() => update(i, (x) => ({ ...(x as { file: number; page: number; rotate: number }), rotate: ((x as { rotate: number }).rotate + 270) % 360 }))} className="rounded p-1 hover:bg-slate-200"><FontAwesomeIcon icon={faRotateLeft} className="h-3 w-3" /></button>
                  <button type="button" title="Rotate right" aria-label={`Rotate page ${i + 1} right`} onClick={() => update(i, (x) => ({ ...(x as { file: number; page: number; rotate: number }), rotate: ((x as { rotate: number }).rotate + 90) % 360 }))} className="rounded p-1 hover:bg-slate-200"><FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" /></button>
                </>
              )}
              <button type="button" title="Duplicate" aria-label={`Duplicate page ${i + 1}`} onClick={() => update(i, (x) => [x, { ...x }])} className="rounded p-1 hover:bg-slate-200"><FontAwesomeIcon icon={faClone} className="h-3 w-3" /></button>
              <button type="button" title="Insert blank page after" aria-label={`Insert blank page after ${i + 1}`} onClick={() => update(i, (x) => [x, { blank: true, ...blankSize() }])} className="rounded p-1 hover:bg-slate-200"><FontAwesomeIcon icon={faFileCirclePlus} className="h-3 w-3" /></button>
              <button type="button" title="Delete" aria-label={`Delete page ${i + 1}`} onClick={() => update(i, () => null)} className="rounded p-1 text-red-600 hover:bg-red-100"><FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" /></button>
              <button type="button" title="Move left" aria-label={`Move page ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)} className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"><FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></button>
              <button type="button" title="Move right" aria-label={`Move page ${i + 1} later`} disabled={i === plan.length - 1} onClick={() => move(i + 1, i)} className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"><FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Crop ───────────── */

export function CropPanel({ file, options, onOptions }: { file: InputFile; options: Options; onOptions: (o: Options) => void }) {
  const count = usePageCount(file.bytes) ?? 0;
  const [pageIdx, setPageIdx] = useState(0);
  const [img, setImg] = useState<{ url: string; w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const rect = options.crop as CropRect | undefined;

  useEffect(() => {
    let alive = true;
    (async () => {
      const doc = await pdfjsFor(file.bytes);
      const page = await doc.getPage(pageIdx + 1);
      const vp = page.getViewport({ scale: 1 });
      const scale = Math.min(560 / vp.width, 640 / vp.height);
      const c = await renderPageToCanvas(page, scale * 1.5);
      if (alive) setImg({ url: c.toDataURL("image/jpeg", 0.85), w: vp.width * scale, h: vp.height * scale });
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [file.bytes, pageIdx]);

  if (options.mode === "auto") return <p className="text-sm text-slate-500">White margins will be detected separately on each page.</p>;
  const frac = (e: React.PointerEvent) => {
    const b = boxRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)), y: Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)) };
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Button size="icon" variant="outline" aria-label="Previous page" disabled={pageIdx === 0} onClick={() => setPageIdx((p) => p - 1)}><FontAwesomeIcon icon={faChevronLeft} /></Button>
        Page {pageIdx + 1} of {Math.max(count, 1)}
        <Button size="icon" variant="outline" aria-label="Next page" disabled={pageIdx >= count - 1} onClick={() => setPageIdx((p) => p + 1)}><FontAwesomeIcon icon={faChevronRight} /></Button>
        <span className="text-slate-500">Drag on the page to mark the area to keep.</span>
        {rect && <Button size="sm" variant="ghost" onClick={() => onOptions({ ...options, crop: undefined })}>Clear</Button>}
      </div>
      {img && (
        <div
          ref={boxRef}
          className="relative cursor-crosshair select-none bg-white shadow ring-1 ring-slate-200"
          style={{ width: img.w, height: img.h, touchAction: "none" }}
          data-crop-box
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            start.current = frac(e);
            onOptions({ ...options, crop: { x: start.current.x, y: start.current.y, w: 0, h: 0 } });
          }}
          onPointerMove={(e) => {
            if (!start.current) return;
            const p = frac(e);
            const s = start.current;
            onOptions({ ...options, crop: { x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) } });
          }}
          onPointerUp={() => (start.current = null)}
        >
          <img src={img.url} alt="" draggable={false} className="h-full w-full" />
          {rect && rect.w > 0 && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-slate-900/40" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rect.x * 100}% ${rect.y * 100}%, ${rect.x * 100}% ${(rect.y + rect.h) * 100}%, ${(rect.x + rect.w) * 100}% ${(rect.y + rect.h) * 100}%, ${(rect.x + rect.w) * 100}% ${rect.y * 100}%, ${rect.x * 100}% ${rect.y * 100}%)` }} />
              <div className="pointer-events-none absolute border-2 border-dashed border-blue-500" style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── Split points ───────────── */

export function SplitPointsPanel({ file, options, onOptions }: { file: InputFile; options: Options; onOptions: (o: Options) => void }) {
  const count = usePageCount(file.bytes) ?? 0;
  const mode = String(options.mode ?? "every");
  const cuts = useMemo(() => {
    const set = new Set<number>(); // cut after page index i
    if (mode === "every") {
      const n = Math.max(1, Number(options.every) || 1);
      for (let i = n - 1; i < count - 1; i += n) set.add(i);
    } else if (mode === "after") safeParse(String(options.splitPoints ?? ""), count).forEach((i) => i < count - 1 && set.add(i));
    else if (mode === "odd") for (let i = 0; i < count - 1; i += 2) set.add(i);
    else if (mode === "even") for (let i = 1; i < count - 1; i += 2) set.add(i);
    return set;
  }, [mode, options.every, options.splitPoints, count]);
  if (count <= 0 || mode === "ranges") return null;
  const toggle = (i: number) => {
    const next = new Set(cuts);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onOptions({ ...options, mode: "after", splitPoints: indexesToRanges([...next]) });
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">Click the scissors between pages to choose where to split. This makes {cuts.size + 1} file{cuts.size ? "s" : ""}.</p>
      <div className="flex flex-wrap items-center gap-y-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <PageThumb bytes={file.bytes} index={i} width={84} />
              <span className="text-xs text-slate-500">{i + 1}</span>
            </div>
            {i < count - 1 && (
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={cuts.has(i)}
                aria-label={`Split after page ${i + 1}`}
                className={`mx-1.5 flex h-24 w-7 items-center justify-center rounded-md ${cuts.has(i) ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-100 hover:text-slate-600"}`}
              >
                <FontAwesomeIcon icon={faScissors} className="h-3.5 w-3.5 rotate-90" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Bookmarks ───────────── */

export function BookmarksPanel({ file, options, onOptions }: { file: InputFile; options: Options; onOptions: (o: Options) => void }) {
  const count = usePageCount(file.bytes) ?? 0;
  const list = (options.bookmarks as BookmarkEntry[]) ?? [];
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const set = (l: BookmarkEntry[]) => onOptions({ ...options, bookmarks: l });
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    bookmarkPages(file.bytes).then((b) => {
      if (b.length && !list.length) {
        set(b.map((x) => ({ title: x.title, page: x.page + 1, level: Math.min(3, x.level) })));
        setNote(`Loaded ${b.length} existing bookmark${b.length === 1 ? "" : "s"}.`);
      }
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.bytes]);

  const detect = async () => {
    setBusy(true);
    try {
      const doc = await pdfjsFor(file.bytes);
      const found: BookmarkEntry[] = [];
      const all: { size: number }[] = [];
      const perPage: { page: number; lines: Awaited<ReturnType<typeof pageLines>> }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const lines = await pageLines(await doc.getPage(i));
        perPage.push({ page: i, lines });
        all.push(...lines);
      }
      const sizes = all.map((l) => l.size).sort((a, b) => a - b);
      const body = sizes[Math.floor(sizes.length / 2)] ?? 11;
      for (const p of perPage) for (const l of p.lines) {
        if (l.text.length > 3 && l.text.length < 90 && l.size >= body * 1.25) found.push({ title: l.text, page: p.page, level: l.size >= body * 1.6 ? 1 : 2 });
      }
      if (!found.length) setNote("No headings were found (no text larger than the body text).");
      else {
        set(found);
        setNote(`Found ${found.length} heading${found.length === 1 ? "" : "s"}. Review them before saving.`);
      }
    } finally {
      setBusy(false);
    }
  };
  const upd = (i: number, patch: Partial<BookmarkEntry>) => set(list.map((b, k) => (k === i ? { ...b, ...patch } : b)));
  const mv = (i: number, d: number) => {
    const n = [...list];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    set(n);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => set([...list, { title: "", page: 1, level: 1 }])}><FontAwesomeIcon icon={faPlus} className="mr-1.5" />Add bookmark</Button>
        <Button size="sm" variant="outline" onClick={detect} disabled={busy}><FontAwesomeIcon icon={faWandMagicSparkles} className="mr-1.5" />{busy ? "Detecting…" : "Detect headings"}</Button>
        {list.length > 0 && <Button size="sm" variant="ghost" onClick={() => set([])}>Clear all</Button>}
        {note && <span className="text-sm text-slate-500">{note}</span>}
      </div>
      {list.length === 0 && <p className="text-sm text-slate-500">No bookmarks yet. Add them one by one or detect headings automatically.</p>}
      <ul className="space-y-1.5">
        {list.map((b, i) => (
          <li key={i} className="flex items-center gap-2" style={{ paddingLeft: (b.level - 1) * 24 }}>
            <FontAwesomeIcon icon={faBookmark} className="h-3.5 w-3.5 text-slate-400" />
            <Input aria-label={`Bookmark ${i + 1} title`} className="h-8 flex-1" placeholder="Title" value={b.title} onChange={(e) => upd(i, { title: e.target.value })} />
            <span className="text-xs text-slate-500">page</span>
            <Input aria-label={`Bookmark ${i + 1} page`} className="h-8 w-16" type="number" min={1} max={count || undefined} value={b.page} onChange={(e) => upd(i, { page: Number(e.target.value) || 1 })} />
            <button type="button" title="Outdent" aria-label="Outdent" disabled={b.level <= 1} onClick={() => upd(i, { level: b.level - 1 })} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" /></button>
            <button type="button" title="Indent" aria-label="Indent" disabled={b.level >= 3 || i === 0} onClick={() => upd(i, { level: b.level + 1 })} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" /></button>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => mv(i, -1)} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><FontAwesomeIcon icon={faArrowUp} className="h-3 w-3" /></button>
            <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => mv(i, 1)} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30"><FontAwesomeIcon icon={faArrowDown} className="h-3 w-3" /></button>
            <button type="button" aria-label="Remove" onClick={() => set(list.filter((_, k) => k !== i))} className="rounded p-1.5 text-red-600 hover:bg-red-50"><FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Metadata ───────────── */

const META_FIELDS: { key: string; label: string; type?: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords (comma separated)" },
  { key: "creator", label: "Creator (application)" },
  { key: "producer", label: "Producer" },
  { key: "created", label: "Created", type: "datetime-local" },
  { key: "modified", label: "Modified", type: "datetime-local" },
];

export function MetadataPanel({ file, options, onOptions }: { file: InputFile; options: Options; onOptions: (o: Options) => void }) {
  const [loaded, setLoaded] = useState<string | null>(null);
  useEffect(() => {
    if (loaded === file.id) return;
    readMetadata(file.bytes)
      .then((m) => {
        onOptions({ ...options, ...m });
        setLoaded(file.id);
      })
      .catch(() => setLoaded(file.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {META_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`meta-${f.key}`}>{f.label}</Label>
          <Input id={`meta-${f.key}`} type={f.type ?? "text"} value={String(options[f.key] ?? "")} onChange={(e) => onOptions({ ...options, [f.key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}
