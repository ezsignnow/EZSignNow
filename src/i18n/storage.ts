import { DEFAULT_LANGUAGE, LANGUAGES, findLanguage } from "./languages";

/** localStorage key and cookie name holding the visitor's chosen language. */
export const LANGUAGE_STORAGE_KEY = "ezsignnow.language";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** The saved choice, if any. localStorage first, then the cookie (kept as a backup for browsers that clear storage). */
export function readSavedLanguage(): string | null {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // storage blocked (private mode, disabled site data)
  }
  if (!findLanguage(saved)) saved = readCookie(LANGUAGE_STORAGE_KEY);
  return findLanguage(saved) ? saved : null;
}

export function saveLanguage(code: string) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // ignore, the cookie below still remembers it
  }
  if (typeof document !== "undefined") {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${encodeURIComponent(code)}; path=/; max-age=${oneYear}; SameSite=Lax`;
  }
}

/** First visit with nothing saved: use the browser's language when we support it, otherwise English. */
export function detectBrowserLanguage(): string {
  const prefs = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const pref of prefs) {
    const base = pref?.toLowerCase().split("-")[0];
    if (LANGUAGES.some((l) => l.code === base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

export function initialLanguage(): string {
  return readSavedLanguage() ?? detectBrowserLanguage();
}
