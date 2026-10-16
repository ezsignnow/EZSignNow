import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComment,
  faLink,
  faFont,
  faAlignLeft,
  faCaretDown,
  faSignature,
} from "@fortawesome/free-solid-svg-icons";
import type { EditorObject } from "./types";
import { CSS_FONT, LINE_HEIGHT } from "./types";
import { SYMBOL_PATHS } from "./symbols";
import { arrowHead, lineEnds } from "./exportPdf";

interface ObjectViewProps {
  obj: EditorObject;
  zoom: number;
  selected: boolean;
  editing: boolean;
  interactive: boolean;
  onPointerDown: (e: React.PointerEvent, obj: EditorObject) => void;
  onResizeStart: (e: React.PointerEvent, obj: EditorObject) => void;
  onDoubleClick: (obj: EditorObject) => void;
  onTextChange: (obj: EditorObject, text: string) => void;
  onTextBlur: () => void;
}

const RESIZABLE = new Set(["link", "field", "image", "stamp", "signature", "whiteout", "highlight", "strikeout", "underline", "ink", "shape", "symbol"]);

function ObjectViewInner({
  obj,
  zoom,
  selected,
  editing,
  interactive,
  onPointerDown,
  onResizeStart,
  onDoubleClick,
  onTextChange,
  onTextBlur,
}: ObjectViewProps) {
  const isLine = obj.kind === "shape" && (obj.shape === "line" || obj.shape === "arrow");
  const pad = isLine ? 6 : 0; // extra hit area around thin lines
  const style: React.CSSProperties = {
    position: "absolute",
    left: (obj.x - pad) * zoom,
    top: (obj.y - pad) * zoom,
    width: Math.max(obj.w + pad * 2, 2) * zoom,
    height: Math.max(obj.h + pad * 2, 2) * zoom,
    pointerEvents: interactive ? "auto" : "none",
    cursor: interactive ? (editing ? "text" : "move") : undefined,
    touchAction: "none",
  };

  return (
    <div
      data-object-id={obj.id}
      style={style}
      className={selected ? "outline outline-2 outline-offset-2 outline-blue-500 rounded-[2px]" : interactive ? "hover:outline hover:outline-1 hover:outline-blue-300" : ""}
      onPointerDown={(e) => {
        // Clicks inside a text box being edited place the caret; keep them
        // from reaching the page, which would end editing.
        if (editing) {
          e.stopPropagation();
          return;
        }
        onPointerDown(e, obj);
      }}
      onDoubleClick={() => onDoubleClick(obj)}
    >
      {renderBody(obj, zoom, editing, pad, onTextChange, onTextBlur)}
      {selected && interactive && RESIZABLE.has(obj.kind) && (
        <div
          aria-label="Resize"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, obj);
          }}
          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-sm border-2 border-white bg-blue-600 shadow cursor-nwse-resize"
        />
      )}
    </div>
  );
}

function renderBody(
  obj: EditorObject,
  zoom: number,
  editing: boolean,
  pad: number,
  onTextChange: (obj: EditorObject, text: string) => void,
  onTextBlur: () => void,
) {
  switch (obj.kind) {
    case "text": {
      const textStyle: React.CSSProperties = {
        fontFamily: CSS_FONT[obj.fontFamily],
        fontSize: obj.fontSize * zoom,
        lineHeight: LINE_HEIGHT,
        fontWeight: obj.bold ? 700 : 400,
        fontStyle: obj.italic ? "italic" : "normal",
        color: obj.color,
        padding: `0 ${2 * zoom}px`,
        whiteSpace: "pre",
        margin: 0,
      };
      if (editing) {
        return (
          <textarea
            autoFocus
            value={obj.text}
            onChange={(e) => onTextChange(obj, e.target.value)}
            onBlur={onTextBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
              e.stopPropagation();
            }}
            onFocus={(e) => e.currentTarget.select()}
            spellCheck={false}
            style={{ ...textStyle, width: "100%", height: "100%", minWidth: 20, border: "none", outline: "1px dashed #3b82f6", background: "rgba(255,255,255,0.6)", resize: "none", overflow: "hidden" }}
          />
        );
      }
      return <div style={textStyle}>{obj.text || " "}</div>;
    }

    case "symbol": {
      const def = SYMBOL_PATHS[obj.symbol];
      if (!def) return null;
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <path
            d={def.path}
            fill={def.mode === "fill" ? obj.color : "none"}
            stroke={def.mode === "stroke" ? obj.color : "none"}
            strokeWidth={def.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    case "link":
      return (
        <div className="h-full w-full border-2 border-dashed border-blue-500 bg-blue-400/15 flex items-start overflow-hidden">
          <span className="m-0.5 inline-flex items-center gap-1 rounded bg-blue-600 px-1 py-px text-[10px] leading-none text-white max-w-full truncate">
            <FontAwesomeIcon icon={faLink} className="h-2.5 w-2.5" />
            {obj.targetPage ? `Page ${obj.targetPage}` : obj.url || "Set link"}
          </span>
        </div>
      );

    case "field": {
      const fs = Math.max(8, Math.min(12, obj.h * 0.55)) * zoom;
      if (obj.fieldType === "checkbox" || obj.fieldType === "radio") {
        return (
          <div
            title={obj.fieldType === "radio" ? `${obj.groupName}: ${obj.value}` : obj.name}
            className={`h-full w-full border border-blue-500 bg-blue-50 ${obj.fieldType === "radio" ? "rounded-full" : "rounded-[1px]"}`}
          />
        );
      }
      const icon = obj.fieldType === "signature" ? faSignature : obj.fieldType === "multiline" ? faAlignLeft : faFont;
      return (
        <div className="h-full w-full border border-blue-500 bg-blue-50/90 flex items-center gap-1 px-1 overflow-hidden text-blue-700" style={{ fontSize: fs }}>
          <FontAwesomeIcon icon={icon} style={{ height: fs * 0.9 }} className="shrink-0 opacity-70" />
          <span className="truncate flex-1">{obj.fieldType === "signature" ? "Sign here" : obj.name}</span>
          {obj.fieldType === "dropdown" && <FontAwesomeIcon icon={faCaretDown} style={{ height: fs }} />}
        </div>
      );
    }

    case "image":
    case "signature":
      return <img src={obj.dataUrl} alt="" draggable={false} className="h-full w-full select-none" style={{ objectFit: "fill" }} />;

    case "stamp": {
      const size = Math.max(6, Math.min(obj.h * 0.55, (obj.w - 12) / (obj.label.length * 0.68 || 1)));
      return (
        <div
          className="h-full w-full flex items-center justify-center font-bold whitespace-nowrap overflow-hidden"
          style={{ border: `${2.5 * zoom}px solid ${obj.color}`, color: obj.color, fontFamily: CSS_FONT.Helvetica, fontSize: size * zoom, opacity: 0.9 }}
        >
          {obj.label}
        </div>
      );
    }

    case "whiteout":
      return <div className="h-full w-full" style={{ background: obj.color, boxShadow: "0 0 0 1px rgba(148,163,184,0.35) inset" }} />;

    case "highlight":
      return <div className="h-full w-full" style={{ background: obj.color, opacity: 0.4, mixBlendMode: "multiply" }} />;

    case "underline":
    case "strikeout": {
      const thickness = Math.max(1, Math.min(3, obj.h * 0.08)) * zoom;
      return (
        <div className="relative h-full w-full">
          <div
            className="absolute left-0 right-0"
            style={{
              height: thickness,
              background: obj.color,
              ...(obj.kind === "underline" ? { bottom: Math.max(0, zoom - thickness / 2) } : { top: `calc(50% - ${thickness / 2}px)` }),
            }}
          />
        </div>
      );
    }

    case "comment":
      return (
        <div title={obj.text || "Comment"} className="h-full w-full flex items-center justify-center rounded-sm shadow-sm" style={{ background: obj.color }}>
          <FontAwesomeIcon icon={faComment} className="text-white" style={{ height: obj.h * zoom * 0.55 }} />
        </div>
      );

    case "ink":
      return (
        <svg width="100%" height="100%" viewBox={`${obj.x} ${obj.y} ${Math.max(obj.w, 1)} ${Math.max(obj.h, 1)}`} preserveAspectRatio="none" overflow="visible">
          <polyline
            points={obj.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={obj.color}
            strokeWidth={obj.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: obj.strokeWidth * zoom }}
          />
        </svg>
      );

    case "shape": {
      const sw = obj.strokeWidth;
      if (obj.shape === "line" || obj.shape === "arrow") {
        const [s, e] = lineEnds({ ...obj, x: pad, y: pad });
        const head = obj.shape === "arrow" ? arrowHead(s, e, sw) : [];
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${obj.w + pad * 2} ${Math.max(obj.h + pad * 2, 1)}`} overflow="visible">
            <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={obj.stroke} strokeWidth={sw} strokeLinecap="round" />
            {head.map((p, i) => (
              <line key={i} x1={e.x} y1={e.y} x2={p.x} y2={p.y} stroke={obj.stroke} strokeWidth={sw} strokeLinecap="round" />
            ))}
          </svg>
        );
      }
      return (
        <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(obj.w, 1)} ${Math.max(obj.h, 1)}`} preserveAspectRatio="none" overflow="visible">
          {obj.shape === "rect" ? (
            <rect x={sw / 2} y={sw / 2} width={Math.max(obj.w - sw, 0)} height={Math.max(obj.h - sw, 0)} fill={obj.fill ?? "none"} stroke={obj.stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" style={{ strokeWidth: sw * zoom }} />
          ) : (
            <ellipse cx={obj.w / 2} cy={obj.h / 2} rx={Math.max(obj.w / 2 - sw / 2, 0)} ry={Math.max(obj.h / 2 - sw / 2, 0)} fill={obj.fill ?? "none"} stroke={obj.stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke" style={{ strokeWidth: sw * zoom }} />
          )}
        </svg>
      );
    }
  }
}

export const ObjectView = memo(ObjectViewInner);
