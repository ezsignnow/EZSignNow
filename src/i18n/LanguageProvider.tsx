import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en, { type Dictionary, type TranslationKey } from "./locales/en";
import { DEFAULT_LANGUAGE, findLanguage, type Language } from "./languages";
import { initialLanguage, saveLanguage } from "./storage";
import { PageTranslator, buildPhraseBook, type PhraseBook } from "./pageTranslator";

// Each non-English dictionary is its own chunk, so a visitor only downloads the language they use.
const loaders = import.meta.glob<{ default: Dictionary }>(["./locales/*.ts", "!./locales/en.ts"]);

async function loadDictionary(code: string): Promise<Dictionary> {
  if (code === DEFAULT_LANGUAGE) return en;
  const load = loaders[`./locales/${code}.ts`];
  if (!load) return en;
  return (await load()).default;
}

// Whole-page phrase books: strings/en.txt is the English list, strings/<lang>.txt the translations.
const stringFiles = import.meta.glob<string>("./strings/*.txt", { query: "?raw", import: "default" });

async function loadPhraseBook(code: string): Promise<PhraseBook> {
  const enLoad = stringFiles["./strings/en.txt"];
  const langLoad = stringFiles[`./strings/${code}.txt`];
  if (code === DEFAULT_LANGUAGE || !enLoad || !langLoad) return new Map();
  const [enRaw, langRaw] = await Promise.all([enLoad(), langLoad()]);
  return buildPhraseBook(enRaw, langRaw);
}

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  language: Language;
  setLanguage: (code: string) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

function format(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const fallback: LanguageContextValue = {
  language: findLanguage(DEFAULT_LANGUAGE)!,
  setLanguage: () => {},
  t: (key, vars) => format(en[key] ?? key, vars),
};

const LanguageContext = createContext<LanguageContextValue>(fallback);

/** Applies lang and dir to <html> so the browser, fonts and screen readers follow the chosen language. */
function applyToDocument(lang: Language) {
  const root = document.documentElement;
  root.lang = lang.code;
  root.dir = lang.dir;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<string>(() => initialLanguage());
  const [dict, setDict] = useState<Dictionary>(en);
  const language = findLanguage(code) ?? findLanguage(DEFAULT_LANGUAGE)!;
  const [translator] = useState(() => new PageTranslator());

  useEffect(() => {
    translator.start(document.body);
    return () => translator.stop();
  }, [translator]);

  useEffect(() => {
    applyToDocument(language);
    let cancelled = false;
    loadDictionary(language.code).then((d) => {
      if (!cancelled) setDict(d);
    });
    loadPhraseBook(language.code).then((book) => {
      if (!cancelled) translator.setPhraseBook(book);
    });
    return () => {
      cancelled = true;
    };
  }, [language, translator]);

  const setLanguage = useCallback((next: string) => {
    if (!findLanguage(next)) return;
    saveLanguage(next);
    setCode(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => format(dict[key] || en[key] || key, vars),
    [dict],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Shorthand for components that only need the translate function. */
export function useT() {
  return useContext(LanguageContext).t;
}
