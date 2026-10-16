import { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashCan,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faRotateLeft,
  faRotateRight,
  faCirclePlus,
} from "@fortawesome/free-solid-svg-icons";
import type {
  EditorObject,
  EditorPage,
  PageImageBox,
  PageTextItem,
  TextObject,
  Tool,
} from "./types";
import { BASELINE_RATIO } from "./types";
import { clamp, clientToPage, displaySize, inkBounds, measureText, moveObject, resizeObject, uid } from "./geometry";
import { renderPage, type ExistingField } from "./pdfSource";
import { ObjectView } from "./ObjectView";

export interface DrawDefaults {
  fontFamily: TextObject["fontFamily"];
  fontSize: number;
  textColor: string;
  inkColor: string;
  inkWidth: number;
  shapeColor: string;
  shapeWidth: number;
  highlightColor: string;
}

interface EditorPageViewProps {
  page: EditorPage;
  index: number;
  pageCount: number;
  pdfPage: PDFPageProxy | null;
  zoom: number;
  showAnnotations: boolean;
  objects: EditorObject[];
  selectedId: string | null;
  editingId: string | null;
  tool: Tool;
  defaults: DrawDefaults;
  textItems: PageTextItem[] | undefined;
  imageBoxes: PageImageBox[] | undefined;
  nextFieldIndex: () => number;
  onCheckpoint: () => void;
  onCreate: (objs: EditorObject[], opts?: { select?: string; edit?: boolean }) => void;
  onUpdate: (id: string, updater: (o: EditorObject) => EditorObject) => void;
  onSelect: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  onToolDone: () => void;
  onLinkCreated: (id: string) => void;
  onDeletePage: () => void;
  onRotate: (dir: 1 | -1) => void;
  onZoom: (dir: 1 | -1) => void;
  onInsertBefore: () => void;
  onNeedTextItems: () => void;
  onNeedImageBoxes: () => void;
  /** The PDF's own form fields on this page, shown as fillable inputs. */
  fillFields?: ExistingField[];
  fieldValues?: Record<string, string | boolean>;
  onFieldValue?: (name: string, value: string | boolean) => void;
}

/** Current value of an existing field: what the user typed, else what the PDF holds. */
function currentValue(f: ExistingField, values: Record<string, string | boolean> | undefined) {
  if (values && f.name in values) return values[f.name];
  const v = f.value;
  if (f.checkBox) return v !== null && v !== undefined && v !== "Off" && v !== false && (v === true || v === f.exportValue || v === "Yes" || v === "On");
  if (Array.isArray(v)) return v[0] ?? "";
  return v === null || v === undefined || v === "Off" ? "" : String(v);
}

type Drag =
  | { mode: "move"; id: string; start: { x: number; y: number }; orig: EditorObject; moved: boolean }
  | { mode: "resize"; id: string; start: { x: number; y: number }; orig: EditorObject }
  | { mode: "create"; start: { x: number; y: number } }
  | { mode: "ink"; points: { x: number; y: number }[] };

const DRAG_TOOLS = new Set(["link", "whiteout", "markup", "shape"]);

export function EditorPageView(props: EditorPageViewProps) {
  const {
    page,
    index,
    pageCount,
    pdfPage,
    zoom,
    showAnnotations,
    objects,
    selectedId,
    editingId,
    tool,
    defaults,
    textItems,
    imageBoxes,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const lastDownRef = useRef<{ id: string; time: number } | null>(null);
  const [draft, setDraft] = useState<EditorObject | null>(null);
  const [rendering, setRendering] = useState(false);

  // Render the PDF page (re-render on zoom / annotation toggle). Only one
  // render may use a canvas at a time, so cancel any render still running.
  const renderTaskRef = useRef<ReturnType<typeof renderPage> | null>(null);
  useEffect(() => {
    if (!pdfPage || !canvasRef.current) return;
    let cancelled = false;
    setRendering(true);
    const start = async () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        await renderTaskRef.current.promise.catch(() => undefined);
      }
      if (cancelled || !canvasRef.current) return;
      const task = renderPage(pdfPage, canvasRef.current, zoom, showAnnotations);
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (err) {
        if ((err as Error)?.name !== "RenderingCancelledException") console.error("Page render failed", err);
      } finally {
        if (renderTaskRef.current === task) renderTaskRef.current = null;
        if (!cancelled) setRendering(false);
      }
    };
    start();
    return () => {
      cancelled = true;
    };
  }, [pdfPage, zoom, showAnnotations]);

  // Lazily analyse the page when a tool needs existing text / images.
  useEffect(() => {
    if (tool.type === "text" && !textItems && pdfPage) props.onNeedTextItems();
    if (tool.type === "delete-image" && !imageBoxes && pdfPage) props.onNeedImageBoxes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool.type, pdfPage]);

  const toPage = (e: { clientX: number; clientY: number }) => {
    const rect = outerRef.current!.getBoundingClientRect();
    const p = clientToPage(e.clientX, e.clientY, rect, page, zoom);
    return { x: clamp(p.x, 0, page.width), y: clamp(p.y, 0, page.height) };
  };

  const fitInPage = <T extends EditorObject>(o: T): T => ({
    ...o,
    x: clamp(o.x, 0, Math.max(0, page.width - o.w)),
    y: clamp(o.y, 0, Math.max(0, page.height - o.h)),
  });

  const newText = (x: number, y: number, text = "", over?: Partial<TextObject>): TextObject => {
    const base: TextObject = {
      id: uid(),
      pageId: page.id,
      kind: "text",
      x,
      y,
      w: 0,
      h: 0,
      text,
      fontFamily: defaults.fontFamily,
      fontSize: defaults.fontSize,
      color: defaults.textColor,
      bold: false,
      italic: false,
      ...over,
    };
    const m = measureText(base.text, base.fontFamily, base.fontSize, base.bold, base.italic);
    return { ...base, w: Math.max(m.w, 30), h: m.h };
  };

  /** Single-click placement for point tools. */
  const placeAt = (p: { x: number; y: number }) => {
    const id = uid();
    const at = (w: number, h: number) => ({ id, pageId: page.id, x: p.x - w / 2, y: p.y - h / 2, w, h });
    switch (tool.type) {
      case "text": {
        const t = newText(p.x, p.y - defaults.fontSize * 0.6);
        props.onCreate([fitInPage(t)], { select: t.id, edit: true });
        return;
      }
      case "symbol":
        props.onCreate([fitInPage({ ...at(18, 18), kind: "symbol", symbol: tool.symbol, color: defaults.textColor })], { select: id });
        break;
      case "comment":
        props.onCreate([fitInPage({ ...at(22, 22), kind: "comment", text: "", color: "#f59e0b" })], { select: id });
        break;
      case "stamp": {
        const w = Math.max(90, tool.label.length * 12 + 30);
        props.onCreate([fitInPage({ ...at(w, 38), kind: "stamp", label: tool.label, color: tool.color })], { select: id });
        break;
      }
      case "place-image": {
        const w = tool.as === "signature" ? 150 : 180;
        const h = w / (tool.aspect || 1);
        props.onCreate([fitInPage({ ...at(w, h), kind: tool.as, dataUrl: tool.dataUrl })], { select: id });
        break;
      }
      case "field": {
        const n = props.nextFieldIndex();
        const sizes = { text: [160, 22], multiline: [200, 60], dropdown: [140, 22], radio: [14, 14], checkbox: [14, 14], signature: [180, 48] } as const;
        const [w, h] = sizes[tool.fieldType];
        const names = { text: "Text", multiline: "Text", dropdown: "Dropdown", radio: "Radio", checkbox: "Checkbox", signature: "Signature" };
        props.onCreate(
          [
            fitInPage({
              ...at(w, h),
              kind: "field",
              fieldType: tool.fieldType,
              name: `${names[tool.fieldType]}${n}`,
              ...(tool.fieldType === "dropdown" ? { options: ["Option 1", "Option 2", "Option 3"] } : {}),
              ...(tool.fieldType === "radio" ? { groupName: "Group1", value: `Choice${n}` } : {}),
            }),
          ],
          { select: id },
        );
        break;
      }
      default:
        return;
    }
    props.onToolDone();
  };

  /** Box for a drag between two points (or a default box for a click). */
  const draftFor = (start: { x: number; y: number }, end: { x: number; y: number }): EditorObject | null => {
    const tiny = Math.abs(end.x - start.x) < 4 && Math.abs(end.y - start.y) < 4;
    let x = Math.min(start.x, end.x);
    let y = Math.min(start.y, end.y);
    let w = Math.abs(end.x - start.x);
    let h = Math.abs(end.y - start.y);
    const id = draft?.id ?? uid();
    const def = (dw: number, dh: number) => {
      if (tiny) {
        x = start.x;
        y = start.y - dh / 2;
        w = dw;
        h = dh;
      }
    };
    switch (tool.type) {
      case "whiteout":
        def(120, 24);
        return { id, pageId: page.id, kind: "whiteout", x, y, w, h, color: "#ffffff" };
      case "link":
        def(120, 20);
        return { id, pageId: page.id, kind: "link", x, y, w, h };
      case "markup":
        def(120, 14);
        return { id, pageId: page.id, kind: tool.kind, x, y, w, h, color: tool.kind === "highlight" ? defaults.highlightColor : defaults.textColor };
      case "shape": {
        const isLine = tool.shape === "line" || tool.shape === "arrow";
        if (tiny) {
          x = start.x;
          y = start.y;
          w = 100;
          h = isLine ? 0 : 60;
        }
        return {
          id,
          pageId: page.id,
          kind: "shape",
          shape: tool.shape,
          x,
          y,
          w,
          h,
          stroke: defaults.shapeColor,
          fill: null,
          strokeWidth: defaults.shapeWidth,
          ...(isLine && !tiny ? { flipX: end.x < start.x, flipY: end.y < start.y } : {}),
        };
      }
      default:
        return null;
    }
  };

  const onOverlayPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Stop the browser moving focus to the page on mousedown, which would
    // immediately blur a text box created by this click.
    e.preventDefault();
    const p = toPage(e);
    if (editingId) props.onEdit(null);

    if (tool.type === "select") {
      props.onSelect(null);
      return;
    }
    if (tool.type === "ink") {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { mode: "ink", points: [p] };
      setDraft({ id: uid(), pageId: page.id, kind: "ink", points: [p], color: defaults.inkColor, strokeWidth: defaults.inkWidth, ...inkBounds([p], defaults.inkWidth) });
      return;
    }
    if (DRAG_TOOLS.has(tool.type)) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { mode: "create", start: p };
      setDraft(draftFor(p, p));
      return;
    }
    placeAt(p);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = toPage(e);
    if (drag.mode === "ink") {
      drag.points.push(p);
      setDraft((d) => (d && d.kind === "ink" ? { ...d, points: [...drag.points], ...inkBounds(drag.points, d.strokeWidth) } : d));
    } else if (drag.mode === "create") {
      setDraft(draftFor(drag.start, p));
    } else if (drag.mode === "move") {
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < 2) return;
      if (!drag.moved) {
        props.onCheckpoint();
        drag.moved = true;
      }
      const moved = fitInPage(moveObject(drag.orig, dx, dy));
      props.onUpdate(drag.id, () => moved);
    } else if (drag.mode === "resize") {
      const w = Math.max(4, drag.orig.w + (p.x - drag.start.x));
      const h = Math.max(drag.orig.kind === "shape" && (drag.orig.shape === "line" || drag.orig.shape === "arrow") ? 0 : 4, drag.orig.h + (p.y - drag.start.y));
      let next = resizeObject(drag.orig, Math.min(w, page.width - drag.orig.x), Math.min(h, page.height - drag.orig.y));
      if (next.kind === "symbol") {
        const s = Math.max(next.w, next.h);
        next = { ...next, w: s, h: s };
      }
      props.onUpdate(drag.id, () => next);
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if ((drag.mode === "create" || drag.mode === "ink") && draft) {
      if (draft.kind === "ink" && draft.points.length < 2) {
        setDraft(null);
        return;
      }
      props.onCreate([draft], { select: draft.kind === "ink" ? undefined : draft.id });
      if (draft.kind === "link") props.onLinkCreated(draft.id);
      setDraft(null);
      if (draft.kind !== "ink" && draft.kind !== "highlight" && draft.kind !== "underline" && draft.kind !== "strikeout") props.onToolDone();
    }
  };

  const onObjectPointerDown = (e: React.PointerEvent, obj: EditorObject) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    // Text tool click, or a double-click with the select tool, edits text.
    // (Detected here because pointer capture for moving swallows dblclick, and
    // pointer events don't carry a click count.)
    const now = Date.now();
    const isDouble = lastDownRef.current?.id === obj.id && now - lastDownRef.current.time < 450;
    lastDownRef.current = { id: obj.id, time: now };
    if (obj.kind === "text" && (tool.type === "text" || isDouble)) {
      e.preventDefault();
      props.onSelect(obj.id);
      props.onEdit(obj.id);
      return;
    }
    props.onSelect(obj.id);
    (outerRef.current?.querySelector("[data-overlay]") as HTMLElement | null)?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: "move", id: obj.id, start: toPage(e), orig: obj, moved: false };
  };

  const onResizeStart = (e: React.PointerEvent, obj: EditorObject) => {
    props.onCheckpoint();
    (outerRef.current?.querySelector("[data-overlay]") as HTMLElement | null)?.setPointerCapture(e.pointerId);
    dragRef.current = { mode: "resize", id: obj.id, start: toPage(e), orig: obj };
  };

  /** Clicking printed text with the Text tool: cover it and add an editable copy. */
  const editExistingText = (e: React.PointerEvent, item: PageTextItem) => {
    e.stopPropagation();
    e.preventDefault();
    const top = item.baseline - item.fontSize * 0.92;
    const height = item.fontSize * 1.18;
    const cover: EditorObject = { id: uid(), pageId: page.id, kind: "whiteout", x: item.x - 1, y: top - 1, w: item.width + 2, h: height + 2, color: "#ffffff" };
    const text = newText(item.x - 2, item.baseline - item.fontSize * BASELINE_RATIO, item.str, {
      fontFamily: item.fontFamily,
      fontSize: Math.round(item.fontSize * 10) / 10,
      bold: item.bold,
      italic: item.italic,
      color: "#000000",
    });
    props.onCreate([cover, text], { select: text.id, edit: true });
  };

  const deleteImage = (e: React.PointerEvent, box: PageImageBox) => {
    e.stopPropagation();
    // Pad slightly so anti-aliased image edges don't show around the cover.
    props.onCreate([{ id: uid(), pageId: page.id, kind: "whiteout", x: box.x - 1.5, y: box.y - 1.5, w: box.w + 3, h: box.h + 3, color: "#ffffff" }]);
  };

  const { width: dw, height: dh } = displaySize(page);
  const interactiveObjects = tool.type === "select" || tool.type === "text";
  const cursor =
    tool.type === "select" ? "default" : tool.type === "text" ? "text" : tool.type === "delete-image" ? "default" : "crosshair";

  return (
    <div className="flex flex-col items-center gap-2" data-page-index={index}>
      {/* Page controls */}
      <div className="flex items-center gap-3 select-none">
        <span className="text-2xl font-light text-blue-400 w-8 text-right">{index + 1}</span>
        <div className="flex rounded-md border border-blue-300 bg-white text-blue-600 overflow-hidden shadow-sm">
          {[
            { icon: faTrashCan, label: "Delete page", onClick: props.onDeletePage, disabled: pageCount <= 1 },
            { icon: faMagnifyingGlassPlus, label: "Zoom in", onClick: () => props.onZoom(1) },
            { icon: faMagnifyingGlassMinus, label: "Zoom out", onClick: () => props.onZoom(-1) },
            { icon: faRotateLeft, label: "Rotate left", onClick: () => props.onRotate(-1) },
            { icon: faRotateRight, label: "Rotate right", onClick: () => props.onRotate(1) },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              title={b.label}
              aria-label={b.label}
              disabled={b.disabled}
              onClick={b.onClick}
              className="px-2.5 py-1.5 border-r last:border-r-0 border-blue-200 hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              <FontAwesomeIcon icon={b.icon} className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={props.onInsertBefore}
          className="flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium text-blue-600 shadow-sm hover:bg-blue-50"
        >
          <FontAwesomeIcon icon={faCirclePlus} className="h-3.5 w-3.5" />
          Insert page here
        </button>
      </div>

      {/* Page */}
      <div ref={outerRef} className="relative bg-white shadow-md ring-1 ring-slate-200" style={{ width: dw * zoom, height: dh * zoom }}>
        <div
          className="absolute"
          style={{
            width: page.width * zoom,
            height: page.height * zoom,
            left: ((dw - page.width) * zoom) / 2,
            top: ((dh - page.height) * zoom) / 2,
            transform: `rotate(${page.rotation}deg)`,
          }}
        >
          {pdfPage && <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />}
          {rendering && <div className="absolute inset-0 animate-pulse bg-slate-50" />}

          <div
            data-overlay
            className="absolute inset-0 overflow-hidden"
            style={{ cursor, touchAction: "none" }}
            onPointerDown={onOverlayPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {tool.type === "text" &&
              textItems?.map((t, i) => (
                <div
                  key={i}
                  title="Click to edit this text"
                  onPointerDown={(e) => editExistingText(e, t)}
                  className="absolute rounded-[2px] hover:bg-blue-200/40 hover:outline hover:outline-1 hover:outline-blue-400"
                  style={{ left: t.x * zoom, top: (t.baseline - t.fontSize * 0.92) * zoom, width: t.width * zoom, height: t.fontSize * 1.18 * zoom, cursor: "text" }}
                />
              ))}

            {tool.type === "delete-image" &&
              imageBoxes?.map((b, i) => (
                <div
                  key={i}
                  title="Click to delete this image"
                  onPointerDown={(e) => deleteImage(e, b)}
                  className="absolute cursor-pointer border-2 border-dashed border-red-400 bg-red-400/10 hover:bg-red-400/30"
                  style={{ left: b.x * zoom, top: b.y * zoom, width: b.w * zoom, height: b.h * zoom }}
                />
              ))}

            {tool.type === "select" &&
              props.fillFields?.map((f, i) => {
                if (f.readOnly || f.type === "Sig") return null;
                const v = currentValue(f, props.fieldValues);
                const style: React.CSSProperties = { left: f.rect.x * zoom, top: f.rect.y * zoom, width: f.rect.w * zoom, height: f.rect.h * zoom };
                const fs = Math.max(7, Math.min(12, f.rect.h * 0.62)) * zoom;
                const stop = (e: React.PointerEvent) => e.stopPropagation();
                const common = "absolute rounded-[2px] border border-blue-400/70 bg-[#eef4ff] text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-300";
                if (f.checkBox || f.radioButton) {
                  const on = f.radioButton ? v === f.exportValue : !!v;
                  return (
                    <button
                      key={`ff${i}`}
                      type="button"
                      role={f.radioButton ? "radio" : "checkbox"}
                      aria-checked={on}
                      aria-label={f.name}
                      title={f.name}
                      onPointerDown={stop}
                      onClick={() => props.onFieldValue?.(f.name, f.radioButton ? f.exportValue ?? "On" : !on)}
                      className={`${common} flex items-center justify-center ${f.radioButton ? "rounded-full" : ""}`}
                      style={{ ...style, fontSize: f.rect.h * zoom * 0.8, lineHeight: 1 }}
                    >
                      {on ? (f.radioButton ? "●" : "✓") : ""}
                    </button>
                  );
                }
                if (f.type === "Ch" && f.options?.length) {
                  return (
                    <select key={`ff${i}`} aria-label={f.name} title={f.name} onPointerDown={stop} value={String(v)} onChange={(e) => props.onFieldValue?.(f.name, e.target.value)} className={common} style={{ ...style, fontSize: fs, padding: 0 }}>
                      <option value=""></option>
                      {f.options.map((o) => (
                        <option key={o.exportValue} value={o.exportValue}>{o.displayValue}</option>
                      ))}
                    </select>
                  );
                }
                if (f.type !== "Tx") return null;
                return f.multiLine ? (
                  <textarea key={`ff${i}`} aria-label={f.name} title={f.name} onPointerDown={stop} onKeyDown={(e) => e.stopPropagation()} value={String(v)} onChange={(e) => props.onFieldValue?.(f.name, e.target.value)} className={`${common} resize-none`} style={{ ...style, fontSize: fs, padding: 2 * zoom }} />
                ) : (
                  <input key={`ff${i}`} aria-label={f.name} title={f.name} onPointerDown={stop} onKeyDown={(e) => e.stopPropagation()} value={String(v)} onChange={(e) => props.onFieldValue?.(f.name, e.target.value)} className={common} style={{ ...style, fontSize: fs, padding: `0 ${2 * zoom}px` }} />
                );
              })}

            {objects.map((o) => (
              <ObjectView
                key={o.id}
                obj={o}
                zoom={zoom}
                selected={o.id === selectedId}
                editing={o.id === editingId}
                interactive={interactiveObjects}
                onPointerDown={onObjectPointerDown}
                onResizeStart={onResizeStart}
                onDoubleClick={(obj) => {
                  if (obj.kind === "text") {
                    props.onSelect(obj.id);
                    props.onEdit(obj.id);
                  }
                }}
                onTextChange={(obj, text) =>
                  props.onUpdate(obj.id, (cur) => {
                    if (cur.kind !== "text") return cur;
                    const m = measureText(text, cur.fontFamily, cur.fontSize, cur.bold, cur.italic);
                    return { ...cur, text, w: Math.max(m.w, 30), h: m.h };
                  })
                }
                onTextBlur={() => props.onEdit(null)}
              />
            ))}
            {draft && <ObjectView obj={draft} zoom={zoom} selected={false} editing={false} interactive={false} onPointerDown={() => {}} onResizeStart={() => {}} onDoubleClick={() => {}} onTextChange={() => {}} onTextBlur={() => {}} />}
          </div>
        </div>
      </div>
    </div>
  );
}
