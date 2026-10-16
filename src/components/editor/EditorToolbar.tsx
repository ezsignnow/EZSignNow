import { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faICursor,
  faCaretDown,
  faLink,
  faRectangleList,
  faImage,
  faSignature,
  faEraser,
  faPenNib,
  faShapes,
  faDeleteLeft,
  faMagnifyingGlass,
  faFont,
  faAlignLeft,
  faListUl,
  faCircleDot,
  faSquareCheck,
  faWandMagicSparkles,
  faPenToSquare,
  faPaperPlane,
  faTrashCan,
  faStamp,
  faComment,
  faStrikethrough,
  faHighlighter,
  faUnderline,
  faPencil,
  faEye,
  faEyeSlash,
  faCircle,
  faSquare,
  faMinus,
  faArrowRightLong,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Tool } from "./types";
import { STAMP_PRESETS, SYMBOLS } from "./types";
import { SYMBOL_LABELS, SYMBOL_PATHS } from "./symbols";

export interface SavedSignature {
  id: string;
  kind: "signature" | "initials";
  dataUrl: string;
}

interface EditorToolbarProps {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onFindReplace: () => void;
  onNewImage: (file: File) => void;
  onCustomStamp: () => void;
  onNewSignature: (kind: SavedSignature["kind"]) => void;
  savedSignatures: SavedSignature[];
  onUseSignature: (sig: SavedSignature) => void;
  onDeleteSignature: (id: string) => void;
  onDetectFields: () => void;
  onFormEdit: () => void;
  onPublish: () => void;
  showAnnotations: boolean;
  onToggleAnnotations: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

const btn =
  "flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-blue-700 hover:bg-blue-50 border-r border-blue-300 last:border-r-0 whitespace-nowrap focus:outline-none focus-visible:bg-blue-100";
const active = "bg-blue-100 text-blue-800 shadow-[inset_0_2px_4px_rgba(37,99,235,0.15)]";

function ToolIcon({ icon }: { icon: IconDefinition }) {
  return <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />;
}

function SymbolGlyph({ symbol }: { symbol: string }) {
  const def = SYMBOL_PATHS[symbol];
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path d={def.path} fill={def.mode === "fill" ? "currentColor" : "none"} stroke={def.mode === "stroke" ? "currentColor" : "none"} strokeWidth={def.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EditorToolbar(p: EditorToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const t = p.tool;
  const is = (type: Tool["type"]) => t.type === type;

  return (
    <div className="mx-auto flex w-fit max-w-full flex-wrap items-stretch justify-center rounded-md border border-blue-300 bg-white shadow-sm overflow-hidden">
      {/* Text + Find & Replace */}
      <button type="button" className={`${btn} ${is("text") ? active : ""}`} onClick={() => p.onTool(is("text") ? { type: "select" } : { type: "text" })} title="Add or edit text">
        <ToolIcon icon={faICursor} /> Text
      </button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className={`${btn} px-1.5`} aria-label="More text tools">
          <FontAwesomeIcon icon={faCaretDown} className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={p.onFindReplace}>
            <ToolIcon icon={faMagnifyingGlass} /> <span className="ml-2">Find &amp; Replace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Links */}
      <button type="button" className={`${btn} ${is("link") ? active : ""}`} onClick={() => p.onTool(is("link") ? { type: "select" } : { type: "link" })} title="Drag over an area to make it a link">
        <ToolIcon icon={faLink} /> Links
      </button>

      {/* Forms */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className={`${btn} ${is("field") || is("symbol") ? active : ""}`}>
          <ToolIcon icon={faRectangleList} /> Forms <FontAwesomeIcon icon={faCaretDown} className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Add text and symbols</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => p.onTool({ type: "text" })}>
            <ToolIcon icon={faICursor} /> <span className="ml-2">Text</span>
          </DropdownMenuItem>
          <div className="grid grid-cols-5 gap-1 px-2 pb-1.5">
            {SYMBOLS.map((s) => (
              <DropdownMenuItem
                key={s}
                title={SYMBOL_LABELS[s]}
                aria-label={SYMBOL_LABELS[s]}
                onSelect={() => p.onTool({ type: "symbol", symbol: s })}
                className={`justify-center rounded border ${t.type === "symbol" && t.symbol === s ? "border-blue-500 bg-blue-50" : "border-transparent"}`}
              >
                <SymbolGlyph symbol={s} />
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Add new form fields</DropdownMenuLabel>
          {(
            [
              ["text", "Text", faFont],
              ["multiline", "Text multiline", faAlignLeft],
              ["dropdown", "Drop-down list", faListUl],
              ["radio", "Radio button", faCircleDot],
              ["checkbox", "Checkbox", faSquareCheck],
              ["signature", "Signature box", faSignature],
            ] as const
          ).map(([fieldType, label, icon]) => (
            <DropdownMenuItem key={fieldType} onSelect={() => p.onTool({ type: "field", fieldType })}>
              <ToolIcon icon={icon} /> <span className="ml-2">{label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={p.onDetectFields}>
            <ToolIcon icon={faWandMagicSparkles} /> <span className="ml-2">Detect fields</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Change existing form fields</DropdownMenuLabel>
          <DropdownMenuItem onSelect={p.onFormEdit}>
            <ToolIcon icon={faPenToSquare} /> <span className="ml-2">Form edit mode</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Share with others</DropdownMenuLabel>
          <DropdownMenuItem onSelect={p.onPublish}>
            <ToolIcon icon={faPaperPlane} /> <span className="ml-2">Send for others to fill &amp; sign</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Images */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className={`${btn} ${(is("place-image") && t.type === "place-image" && t.as === "image") || is("delete-image") || is("stamp") ? active : ""}`}>
          <ToolIcon icon={faImage} /> Images <FontAwesomeIcon icon={faCaretDown} className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
            <ToolIcon icon={faImage} /> <span className="ml-2">New image</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onTool({ type: "delete-image" })}>
            <ToolIcon icon={faTrashCan} /> <span className="ml-2">Delete existing image</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">New stamp</DropdownMenuLabel>
          {STAMP_PRESETS.map((s) => (
            <DropdownMenuItem key={s.label} onSelect={() => p.onTool({ type: "stamp", label: s.label, color: s.color })}>
              <span className="rounded-sm border-2 px-1.5 text-[11px] font-bold leading-4" style={{ borderColor: s.color, color: s.color }}>
                {s.label}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={p.onCustomStamp}>
            <ToolIcon icon={faStamp} /> <span className="ml-2">Custom stamp…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) p.onNewImage(f);
          e.target.value = "";
        }}
      />

      {/* Sign */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className={`${btn} ${t.type === "place-image" && t.as === "signature" ? active : ""}`}>
          <ToolIcon icon={faSignature} /> Sign <FontAwesomeIcon icon={faCaretDown} className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          {p.savedSignatures.length > 0 && (
            <>
              {p.savedSignatures.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => p.onUseSignature(s)} className="group justify-between">
                  <img src={s.dataUrl} alt={s.kind === "initials" ? "Saved initials" : "Saved signature"} className="h-8 max-w-[160px] object-contain" />
                  <button
                    type="button"
                    aria-label="Remove saved signature"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      p.onDeleteSignature(s.id);
                    }}
                  >
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </button>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => p.onNewSignature("signature")}>
            <ToolIcon icon={faSignature} /> <span className="ml-2">New signature</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onNewSignature("initials")}>
            <ToolIcon icon={faPenNib} /> <span className="ml-2">New initials</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Whiteout */}
      <button type="button" className={`${btn} ${is("whiteout") ? active : ""}`} onClick={() => p.onTool(is("whiteout") ? { type: "select" } : { type: "whiteout" })} title="Drag to cover part of the page">
        <ToolIcon icon={faEraser} /> Whiteout
      </button>

      {/* Annotate */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className={`${btn} ${is("markup") || is("ink") || is("comment") ? active : ""}`}>
          <ToolIcon icon={faPenNib} /> Annotate <FontAwesomeIcon icon={faCaretDown} className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onSelect={p.onToggleAnnotations}>
            <ToolIcon icon={p.showAnnotations ? faEyeSlash : faEye} />
            <span className="ml-2">{p.showAnnotations ? "Hide annotations" : "Show annotations"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => p.onTool({ type: "comment" })}>
            <ToolIcon icon={faComment} /> <span className="ml-2">Comment</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onTool({ type: "markup", kind: "strikeout" })}>
            <ToolIcon icon={faStrikethrough} /> <span className="ml-2">Strike out</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onTool({ type: "markup", kind: "highlight" })}>
            <ToolIcon icon={faHighlighter} /> <span className="ml-2">Highlight</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onTool({ type: "markup", kind: "underline" })}>
            <ToolIcon icon={faUnderline} /> <span className="ml-2">Underline</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => p.onTool({ type: "ink" })}>
            <ToolIcon icon={faPencil} /> <span className="ml-2">Freehand draw</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Shapes */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className={`${btn} ${is("shape") ? active : ""}`}>
          <ToolIcon icon={faShapes} /> Shapes <FontAwesomeIcon icon={faCaretDown} className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {(
            [
              ["ellipse", "Ellipse", faCircle],
              ["rect", "Rectangle", faSquare],
              ["line", "Line", faMinus],
              ["arrow", "Arrow", faArrowRightLong],
            ] as const
          ).map(([shape, label, icon]) => (
            <DropdownMenuItem key={shape} onSelect={() => p.onTool({ type: "shape", shape })}>
              <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" style={shape === "ellipse" || shape === "rect" ? { opacity: 0.8 } : undefined} />
              <span className="ml-2">{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Undo */}
      <button type="button" className={btn} onClick={p.onUndo} disabled={!p.canUndo} title="Undo (Ctrl+Z)">
        <ToolIcon icon={faDeleteLeft} /> Undo
      </button>
    </div>
  );
}
