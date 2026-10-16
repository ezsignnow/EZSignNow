import type { InputFile } from "./core";

/**
 * Passes files between pages without uploading them anywhere, e.g. the result
 * of one tool into the next tool or into the editor.
 */
let pending: InputFile[] | null = null;

export function handOff(files: InputFile[]) {
  pending = files;
}

export function takeHandOff(): InputFile[] | null {
  const f = pending;
  pending = null;
  return f;
}

export function peekHandOff(): boolean {
  return !!pending?.length;
}

let counter = 0;
export function fileId() {
  counter += 1;
  return `f${Date.now().toString(36)}${counter}`;
}

const RECENT_KEY = "ez_pdf_tools_recent";
export function recordRecent(toolId: string) {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as string[];
    localStorage.setItem(RECENT_KEY, JSON.stringify([toolId, ...list.filter((x) => x !== toolId)].slice(0, 6)));
  } catch {
    /* storage unavailable */
  }
}
export function recentTools(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
