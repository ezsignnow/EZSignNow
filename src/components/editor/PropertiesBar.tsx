import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBold, faItalic, faTrashCan, faClone, faLink } from "@fortawesome/free-solid-svg-icons";
import type { EditorObject, FontFamily, Tool } from "./types";
import type { DrawDefaults } from "./EditorPageView";

interface PropertiesBarProps {
  tool: Tool;
  selected: EditorObject | null;
  defaults: DrawDefaults;
  onDefaults: (patch: Partial<DrawDefaults>) => void;
  onCheckpoint: () => void;
  onPatch: (patch: Partial<EditorObject>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditLink: () => void;
}

const HINTS: Partial<Record<Tool["type"], string>> = {
  select: "Select an item to move, resize or change it. Choose a tool above to add something new.",
  text: "Click anywhere to add text, or click existing text on the page to edit it.",
  symbol: "Click on the page to place the symbol.",
  link: "Drag over an area of the page to turn it into a link.",
  field: "Click on the page to place the form field.",
  "place-image": "Click on the page where the image should go.",
  stamp: "Click on the page to place the stamp.",
  "delete-image": "Click an image outlined in red to remove it.",
  whiteout: "Drag over the area to cover it.",
  comment: "Click on the page to add a comment note.",
  markup: "Drag over the text you want to mark.",
  ink: "Hold and drag to draw freehand.",
  shape: "Drag on the page to draw the shape.",
};

const label = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
const field = "h-8 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";
const iconBtn = (on: boolean) =>
  `h-8 w-8 rounded-md border text-sm ${on ? "border-blue-400 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`;

function ColorInput({ value, onChange, title }: { value: string; onChange: (v: string) => void; title: string }) {
  return (
    <label className="flex items-center gap-1.5" title={title}>
      <span className={label}>{title}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5" />
    </label>
  );
}

export function PropertiesBar({ tool, selected, defaults, onDefaults, onCheckpoint, onPatch, onDelete, onDuplicate, onEditLink }: PropertiesBarProps) {
  const patch = (p: Partial<EditorObject>) => {
    onCheckpoint();
    onPatch(p);
  };

  if (!selected) {
    return (
      <div className="flex min-h-[44px] flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
        <span>{HINTS[tool.type]}</span>
        {(tool.type === "text" || tool.type === "symbol") && (
          <>
            <select className={field} value={defaults.fontFamily} onChange={(e) => onDefaults({ fontFamily: e.target.value as FontFamily })} aria-label="Font">
              <option value="Helvetica">Helvetica</option>
              <option value="Times">Times New Roman</option>
              <option value="Courier">Courier</option>
            </select>
            <input type="number" min={4} max={144} className={`${field} w-16`} value={defaults.fontSize} onChange={(e) => onDefaults({ fontSize: Number(e.target.value) || 12 })} aria-label="Font size" />
            <ColorInput title="Color" value={defaults.textColor} onChange={(v) => onDefaults({ textColor: v })} />
          </>
        )}
        {tool.type === "ink" && (
          <>
            <ColorInput title="Color" value={defaults.inkColor} onChange={(v) => onDefaults({ inkColor: v })} />
            <input type="range" min={1} max={12} value={defaults.inkWidth} onChange={(e) => onDefaults({ inkWidth: Number(e.target.value) })} aria-label="Pen width" />
          </>
        )}
        {tool.type === "shape" && (
          <>
            <ColorInput title="Color" value={defaults.shapeColor} onChange={(v) => onDefaults({ shapeColor: v })} />
            <input type="range" min={1} max={12} value={defaults.shapeWidth} onChange={(e) => onDefaults({ shapeWidth: Number(e.target.value) })} aria-label="Line width" />
          </>
        )}
        {tool.type === "markup" && tool.kind === "highlight" && (
          <ColorInput title="Color" value={defaults.highlightColor} onChange={(v) => onDefaults({ highlightColor: v })} />
        )}
      </div>
    );
  }

  const o = selected;
  return (
    <div className="flex min-h-[44px] flex-wrap items-center justify-center gap-3 text-sm">
      {o.kind === "text" && (
        <>
          <select className={field} value={o.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value as FontFamily })} aria-label="Font">
            <option value="Helvetica">Helvetica</option>
            <option value="Times">Times New Roman</option>
            <option value="Courier">Courier</option>
          </select>
          <input type="number" min={4} max={144} step={0.5} className={`${field} w-16`} value={o.fontSize} onFocus={onCheckpoint} onChange={(e) => onPatch({ fontSize: Math.max(4, Number(e.target.value) || 4) })} aria-label="Font size" />
          <button type="button" className={iconBtn(o.bold)} onClick={() => patch({ bold: !o.bold })} aria-label="Bold" aria-pressed={o.bold}>
            <FontAwesomeIcon icon={faBold} />
          </button>
          <button type="button" className={iconBtn(o.italic)} onClick={() => patch({ italic: !o.italic })} aria-label="Italic" aria-pressed={o.italic}>
            <FontAwesomeIcon icon={faItalic} />
          </button>
          <ColorInput title="Color" value={o.color} onChange={(v) => patch({ color: v })} />
        </>
      )}

      {(o.kind === "symbol" || o.kind === "whiteout" || o.kind === "highlight" || o.kind === "underline" || o.kind === "strikeout" || o.kind === "comment" || o.kind === "stamp" || o.kind === "ink") && (
        <ColorInput title="Color" value={o.color} onChange={(v) => patch({ color: v })} />
      )}

      {o.kind === "ink" && (
        <input type="range" min={1} max={12} value={o.strokeWidth} onPointerDown={onCheckpoint} onChange={(e) => onPatch({ strokeWidth: Number(e.target.value) })} aria-label="Pen width" />
      )}

      {o.kind === "comment" && (
        <input className={`${field} w-72`} placeholder="Comment text" value={o.text} onFocus={onCheckpoint} onChange={(e) => onPatch({ text: e.target.value })} aria-label="Comment text" autoFocus={!o.text} />
      )}

      {o.kind === "stamp" && (
        <input className={`${field} w-44`} value={o.label} onFocus={onCheckpoint} onChange={(e) => onPatch({ label: e.target.value.toUpperCase() })} aria-label="Stamp text" />
      )}

      {o.kind === "shape" && (
        <>
          <ColorInput title="Line" value={o.stroke} onChange={(v) => patch({ stroke: v })} />
          {(o.shape === "rect" || o.shape === "ellipse") && (
            <>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={o.fill !== null} onChange={(e) => patch({ fill: e.target.checked ? "#dbeafe" : null })} />
                <span className={label}>Fill</span>
              </label>
              {o.fill !== null && <input type="color" value={o.fill} onChange={(e) => patch({ fill: e.target.value })} className="h-8 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5" aria-label="Fill color" />}
            </>
          )}
          <input type="range" min={1} max={12} value={o.strokeWidth} onPointerDown={onCheckpoint} onChange={(e) => onPatch({ strokeWidth: Number(e.target.value) })} aria-label="Line width" />
        </>
      )}

      {o.kind === "link" && (
        <>
          <span className="max-w-xs truncate text-slate-600">{o.targetPage ? `Goes to page ${o.targetPage}` : o.url || "No destination yet"}</span>
          <button type="button" onClick={onEditLink} className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 hover:bg-slate-50">
            <FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5" /> Edit link
          </button>
        </>
      )}

      {o.kind === "field" && (
        <>
          {o.fieldType === "radio" ? (
            <>
              <span className={label}>Group</span>
              <input className={`${field} w-28`} value={o.groupName ?? ""} onFocus={onCheckpoint} onChange={(e) => onPatch({ groupName: e.target.value })} aria-label="Radio group" />
              <span className={label}>Value</span>
              <input className={`${field} w-28`} value={o.value ?? ""} onFocus={onCheckpoint} onChange={(e) => onPatch({ value: e.target.value })} aria-label="Radio value" />
            </>
          ) : (
            <>
              <span className={label}>Name</span>
              <input className={`${field} w-36`} value={o.name} onFocus={onCheckpoint} onChange={(e) => onPatch({ name: e.target.value })} aria-label="Field name" />
            </>
          )}
          {o.fieldType === "dropdown" && (
            <>
              <span className={label}>Choices</span>
              <input
                className={`${field} w-64`}
                value={(o.options ?? []).join(", ")}
                onFocus={onCheckpoint}
                onChange={(e) => onPatch({ options: e.target.value.split(",").map((s) => s.trim()) })}
                placeholder="Comma-separated"
                aria-label="Drop-down choices"
              />
            </>
          )}
          {o.fieldType !== "radio" && (
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={!!o.required} onChange={(e) => patch({ required: e.target.checked })} />
              <span className={label}>Required</span>
            </label>
          )}
        </>
      )}

      <span className="mx-1 h-6 w-px bg-slate-200" />
      <button type="button" onClick={onDuplicate} className="flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50" title="Duplicate">
        <FontAwesomeIcon icon={faClone} className="h-3.5 w-3.5" /> Duplicate
      </button>
      <button type="button" onClick={onDelete} className="flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-red-600 hover:bg-red-50" title="Delete (Del)">
        <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  );
}
