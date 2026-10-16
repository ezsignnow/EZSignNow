import type { EditorObject, EditorPage, FontFamily, InkObject } from "./types";
import { CSS_FONT, LINE_HEIGHT } from "./types";

let idCounter = 0;
export function uid(prefix = "o"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

/** Size of a page as shown on screen, after the user's rotation. */
export function displaySize(page: EditorPage): { width: number; height: number } {
  const swap = page.rotation === 90 || page.rotation === 270;
  return swap ? { width: page.height, height: page.width } : { width: page.width, height: page.height };
}

/**
 * Converts a pointer position on a (possibly rotated) page element into page
 * space. `rect` is the bounding rect of the rotated page box.
 */
export function clientToPage(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  page: EditorPage,
  zoom: number,
): { x: number; y: number } {
  // Offset from the centre of the displayed page, in screen pixels.
  const cx = clientX - (rect.left + rect.width / 2);
  const cy = clientY - (rect.top + rect.height / 2);
  // Undo the clockwise CSS rotation.
  const rad = (-page.rotation * Math.PI) / 180;
  const ux = cx * Math.cos(rad) - cy * Math.sin(rad);
  const uy = cx * Math.sin(rad) + cy * Math.cos(rad);
  return {
    x: ux / zoom + page.width / 2,
    y: uy / zoom + page.height / 2,
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** Measures a (multi-line) text block in page-space points. */
export function measureText(
  text: string,
  fontFamily: FontFamily,
  fontSize: number,
  bold: boolean,
  italic: boolean,
): { w: number; h: number } {
  if (!measureCtx && typeof document !== "undefined") {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  const lines = (text || " ").split("\n");
  let w = 0;
  if (measureCtx) {
    measureCtx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px ${CSS_FONT[fontFamily]}`;
    for (const line of lines) w = Math.max(w, measureCtx.measureText(line || " ").width);
  } else {
    w = Math.max(...lines.map((l) => l.length)) * fontSize * 0.55;
  }
  return { w: Math.ceil(w) + 4, h: lines.length * fontSize * LINE_HEIGHT };
}

/** Bounding box of a set of points, padded by half the stroke width. */
export function inkBounds(points: InkObject["points"], strokeWidth: number) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = strokeWidth / 2;
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) - x + pad, h: Math.max(...ys) - y + pad };
}

/** Moves an object, keeping freehand points in step with its box. */
export function moveObject<T extends EditorObject>(obj: T, dx: number, dy: number): T {
  if (obj.kind === "ink") {
    return {
      ...obj,
      x: obj.x + dx,
      y: obj.y + dy,
      points: obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    } as T;
  }
  return { ...obj, x: obj.x + dx, y: obj.y + dy };
}

/** Resizes an object to a new box, scaling freehand points to fit. */
export function resizeObject<T extends EditorObject>(obj: T, w: number, h: number): T {
  if (obj.kind === "ink") {
    const sx = obj.w ? w / obj.w : 1;
    const sy = obj.h ? h / obj.h : 1;
    return {
      ...obj,
      w,
      h,
      points: obj.points.map((p) => ({ x: obj.x + (p.x - obj.x) * sx, y: obj.y + (p.y - obj.y) * sy })),
    } as T;
  }
  return { ...obj, w, h };
}

export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function imageAspect(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    img.onerror = () => resolve(1);
    img.src = dataUrl;
  });
}

/** Converts any image data URL (e.g. GIF, WebP, SVG) to PNG so pdf-lib can embed it. */
export function toPngDataUrl(dataUrl: string): Promise<string> {
  if (/^data:image\/(png|jpe?g);/i.test(dataUrl)) return Promise.resolve(dataUrl);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 300;
      canvas.height = img.naturalHeight || 150;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not available"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Unsupported image"));
    img.src = dataUrl;
  });
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
