/**
 * PDF editor data model.
 *
 * Every object is stored in "page space": PDF points (1/72") measured from the
 * top-left corner of the page as PDF.js displays it at scale 1, before any
 * rotation the user adds in the editor. The export step maps page space back
 * to real PDF user space with each page's PDF.js viewport transform.
 */

export type FontFamily = "Helvetica" | "Times" | "Courier";

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";
export type MarkupKind = "highlight" | "strikeout" | "underline";
export type FormFieldType = "text" | "multiline" | "dropdown" | "radio" | "checkbox" | "signature";

interface BaseObject {
  id: string;
  pageId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextObject extends BaseObject {
  kind: "text";
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface SymbolObject extends BaseObject {
  kind: "symbol";
  symbol: string;
  color: string;
}

export interface LinkObject extends BaseObject {
  kind: "link";
  /** External web address, or… */
  url?: string;
  /** …a 1-based page number inside this document. */
  targetPage?: number;
}

export interface FieldObject extends BaseObject {
  kind: "field";
  fieldType: FormFieldType;
  name: string;
  /** Choices for drop-down lists. */
  options?: string[];
  /** Radio buttons sharing a group name form one choice. */
  groupName?: string;
  /** Export value of a radio button. */
  value?: string;
  required?: boolean;
}

export interface ImageObject extends BaseObject {
  kind: "image";
  dataUrl: string;
}

export interface StampObject extends BaseObject {
  kind: "stamp";
  label: string;
  color: string;
}

export interface SignatureObject extends BaseObject {
  kind: "signature";
  dataUrl: string;
}

export interface WhiteoutObject extends BaseObject {
  kind: "whiteout";
  color: string;
}

export interface MarkupObject extends BaseObject {
  kind: MarkupKind;
  color: string;
}

export interface CommentObject extends BaseObject {
  kind: "comment";
  text: string;
  color: string;
}

export interface InkObject extends BaseObject {
  kind: "ink";
  /** Points in page space. x/y/w/h hold their bounding box. */
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

export interface ShapeObject extends BaseObject {
  kind: "shape";
  shape: ShapeKind;
  stroke: string;
  fill: string | null;
  strokeWidth: number;
  /** For lines/arrows: true when the line runs from bottom-left to top-right of its box. */
  flipY?: boolean;
  /** For lines/arrows: true when the arrow head sits at the left end. */
  flipX?: boolean;
}

export type EditorObject =
  | TextObject
  | SymbolObject
  | LinkObject
  | FieldObject
  | ImageObject
  | StampObject
  | SignatureObject
  | WhiteoutObject
  | MarkupObject
  | CommentObject
  | InkObject
  | ShapeObject;

export type EditorObjectKind = EditorObject["kind"];

export interface EditorPage {
  id: string;
  /** 0-based page index in the source PDF, or null for an inserted blank page. */
  sourceIndex: number | null;
  /** Size in page space (points). */
  width: number;
  height: number;
  /** Rotation the PDF already carries (/Rotate), in degrees. */
  baseRotation: number;
  /** Extra clockwise rotation the user applied in the editor. */
  rotation: 0 | 90 | 180 | 270;
  /** PDF.js viewport transform at scale 1 (PDF user space → page space). */
  transform: [number, number, number, number, number, number];
}

export interface ExistingFieldEdit {
  /** Fully-qualified name of a form field already in the PDF. */
  name: string;
  newName?: string;
  deleted?: boolean;
}

export interface EditorAttachment {
  id: string;
  name: string;
  mimeType: string;
  /** Base64 file contents. */
  data: string;
  size: number;
}

export interface EditorState {
  pages: EditorPage[];
  objects: EditorObject[];
  existingFieldEdits: ExistingFieldEdit[];
  attachments: EditorAttachment[];
  /** Values typed into the PDF's own form fields (Fill & Sign). */
  fieldValues: Record<string, string | boolean>;
}

export type Tool =
  | { type: "select" }
  | { type: "text" }
  | { type: "symbol"; symbol: string }
  | { type: "link" }
  | { type: "field"; fieldType: FormFieldType }
  | { type: "place-image"; dataUrl: string; aspect: number; as: "image" | "signature" }
  | { type: "stamp"; label: string; color: string }
  | { type: "delete-image" }
  | { type: "whiteout" }
  | { type: "comment" }
  | { type: "markup"; kind: MarkupKind }
  | { type: "ink" }
  | { type: "shape"; shape: ShapeKind };

/** Text already printed on a page, found with PDF.js (page space). */
export interface PageTextItem {
  str: string;
  x: number;
  /** Baseline y. */
  baseline: number;
  width: number;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
}

/** An image drawn on a page, found with PDF.js (page space). */
export interface PageImageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SYMBOLS = ["✓", "✔", "✗", "✘", "●", "○", "■", "□", "★", "➔"] as const;

export const STAMP_PRESETS: { label: string; color: string }[] = [
  { label: "APPROVED", color: "#15803d" },
  { label: "PAID", color: "#15803d" },
  { label: "DRAFT", color: "#475569" },
  { label: "FOR REVIEW", color: "#1d4ed8" },
  { label: "CONFIDENTIAL", color: "#b91c1c" },
  { label: "REJECTED", color: "#b91c1c" },
  { label: "VOID", color: "#b91c1c" },
];

export const CSS_FONT: Record<FontFamily, string> = {
  Helvetica: "Helvetica, Arial, 'Liberation Sans', sans-serif",
  Times: "'Times New Roman', Times, 'Liberation Serif', serif",
  Courier: "'Courier New', Courier, 'Liberation Mono', monospace",
};

/** Line height used both on screen and in the exported PDF. */
export const LINE_HEIGHT = 1.2;
/** Fraction of the font size from the top of a line box to the baseline. */
export const BASELINE_RATIO = 0.1 + 0.78;
