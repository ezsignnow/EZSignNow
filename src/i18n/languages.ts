/** Languages offered in the language dropdown. `group` decides which section of the menu it sits in. */
export type LanguageGroup = "world" | "indian";

export interface Language {
  code: string;
  /** Name in the language itself, shown in the dropdown. */
  nativeName: string;
  /** English name, shown under the native name so anyone can find their language. */
  englishName: string;
  dir: "ltr" | "rtl";
  group: LanguageGroup;
}

export const LANGUAGES: Language[] = [
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr", group: "world" },
  { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr", group: "world" },
  { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr", group: "world" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr", group: "indian" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", dir: "ltr", group: "indian" },
];

export const DEFAULT_LANGUAGE = "en";

export function findLanguage(code: string | null | undefined): Language | undefined {
  if (!code) return undefined;
  return LANGUAGES.find((l) => l.code === code);
}
