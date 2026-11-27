import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "@/i18n";
import { LANGUAGES } from "@/i18n/languages";
import { LANGUAGE_STORAGE_KEY, readSavedLanguage, initialLanguage } from "@/i18n/storage";
import en from "@/i18n/locales/en";

const locales = import.meta.glob<{ default: Record<string, string> }>("../i18n/locales/*.ts", { eager: true });

function Probe() {
  const { t, setLanguage, language } = useLanguage();
  return (
    <div>
      <span data-testid="text">{t("nav.signIn")}</span>
      <span data-testid="code">{language.code}</span>
      <button onClick={() => setLanguage("hi")}>hi</button>
      <button onClick={() => setLanguage("es")}>es</button>
      <p data-testid="plain">Pricing</p>
      <button onClick={() => setLanguage("xx")}>bogus</button>
    </div>
  );
}

function clearCookie() {
  document.cookie = `${LANGUAGE_STORAGE_KEY}=; path=/; max-age=0`;
}

describe("language dictionaries", () => {
  it("has a dictionary for every language in the dropdown", () => {
    for (const l of LANGUAGES) expect(locales[`../i18n/locales/${l.code}.ts`], l.code).toBeDefined();
  });

  it("every dictionary has every English key, none empty", () => {
    const keys = Object.keys(en).sort();
    for (const [path, mod] of Object.entries(locales)) {
      expect(Object.keys(mod.default).sort(), path).toEqual(keys);
      for (const k of keys) expect(mod.default[k]?.trim(), `${path} ${k}`).toBeTruthy();
    }
  });

  it("offers only English, Spanish, French, Hindi and Tamil, all left-to-right", () => {
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual(["en", "es", "fr", "hi", "ta"]);
    expect(LANGUAGES.every((l) => l.dir === "ltr")).toBe(true);
  });
});

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookie();
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("switches language, saves the choice and sets <html lang>", async () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("text").textContent).toBe("Sign In");
    act(() => screen.getByText("hi").click());
    await waitFor(() => expect(screen.getByTestId("text").textContent).toBe("साइन इन"));
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("hi");
    expect(document.cookie).toContain(`${LANGUAGE_STORAGE_KEY}=hi`);
    expect(document.documentElement.lang).toBe("hi");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("loads the saved language on the next visit", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ta");
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId("code").textContent).toBe("ta");
    await waitFor(() => expect(screen.getByTestId("text").textContent).toBe("உள்நுழை"));
  });

  it("translates plain page text that isn't wired to t(), and restores English", async () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    act(() => screen.getByText("es").click());
    await waitFor(() => expect(screen.getByTestId("plain").textContent).toBe("Precios"));
    act(() => screen.getByText("hi").click());
    await waitFor(() => expect(screen.getByTestId("plain").textContent).toBe("मूल्य निर्धारण"));
  });

  it("ignores unknown language codes", () => {
    render(<LanguageProvider><Probe /></LanguageProvider>);
    act(() => screen.getByText("bogus").click());
    expect(screen.getByTestId("code").textContent).toBe("en");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
  });
});

describe("saved language", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCookie();
  });

  it("falls back to the cookie when localStorage was cleared", () => {
    document.cookie = `${LANGUAGE_STORAGE_KEY}=es; path=/`;
    expect(readSavedLanguage()).toBe("es");
  });

  it("ignores a tampered value", () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "<script>");
    expect(readSavedLanguage()).toBeNull();
  });

  it("uses a supported browser language on a first visit", () => {
    const orig = Object.getOwnPropertyDescriptor(window.navigator, "languages");
    Object.defineProperty(window.navigator, "languages", { value: ["ta-IN", "en"], configurable: true });
    expect(initialLanguage()).toBe("ta");
    Object.defineProperty(window.navigator, "languages", { value: ["sw-KE"], configurable: true });
    expect(initialLanguage()).toBe("en");
    if (orig) Object.defineProperty(window.navigator, "languages", orig);
    else delete (window.navigator as { languages?: unknown }).languages;
  });
});
