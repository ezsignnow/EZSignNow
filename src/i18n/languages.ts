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
  // Most widely spoken world languages
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr", group: "world" },
  { code: "zh", nativeName: "中文（简体）", englishName: "Chinese (Mandarin)", dir: "ltr", group: "world" },
  { code: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr", group: "world" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl", group: "world" },
  { code: "fr", nativeName: "Français", englishName: "French", dir: "ltr", group: "world" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese", dir: "ltr", group: "world" },
  { code: "ru", nativeName: "Русский", englishName: "Russian", dir: "ltr", group: "world" },
  { code: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian", dir: "ltr", group: "world" },
  { code: "de", nativeName: "Deutsch", englishName: "German", dir: "ltr", group: "world" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese", dir: "ltr", group: "world" },
  // Indian languages
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr", group: "indian" },
  { code: "bn", nativeName: "বাংলা", englishName: "Bengali", dir: "ltr", group: "indian" },
  { code: "te", nativeName: "తెలుగు", englishName: "Telugu", dir: "ltr", group: "indian" },
  { code: "mr", nativeName: "मराठी", englishName: "Marathi", dir: "ltr", group: "indian" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", dir: "ltr", group: "indian" },
  { code: "ur", nativeName: "اردو", englishName: "Urdu", dir: "rtl", group: "indian" },
  { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati", dir: "ltr", group: "indian" },
  { code: "kn", nativeName: "ಕನ್ನಡ", englishName: "Kannada", dir: "ltr", group: "indian" },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam", dir: "ltr", group: "indian" },
  { code: "or", nativeName: "ଓଡ଼ିଆ", englishName: "Odia", dir: "ltr", group: "indian" },
  { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi", dir: "ltr", group: "indian" },
];

export const DEFAULT_LANGUAGE = "en";

export function findLanguage(code: string | null | undefined): Language | undefined {
  if (!code) return undefined;
  return LANGUAGES.find((l) => l.code === code);
}
