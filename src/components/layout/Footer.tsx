import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher, useT, type TranslationKey } from "@/i18n";

const COLUMNS: { title: TranslationKey; links: { to: string; label: TranslationKey }[] }[] = [
  {
    title: "footer.product",
    links: [
      { to: "/#features", label: "footer.features" },
      { to: "/#pricing", label: "footer.pricing" },
      { to: "/tools", label: "side.pdfTools" },
      { to: "/edit", label: "footer.pdfEditor" },
      { to: "/forms", label: "nav.forms" },
    ],
  },
  {
    title: "footer.compare",
    links: [{ to: "/compare/signnow", label: "footer.vs" }],
  },
  {
    title: "dash.company",
    links: [
      { to: "/company", label: "footer.about" },
      { to: "/blog", label: "footer.blog" },
      { to: "/security", label: "nav.security" },
      { to: "/support", label: "footer.support" },
    ],
  },
  {
    title: "side.account",
    links: [
      { to: "/login", label: "nav.signIn" },
      { to: "/signup", label: "footer.createAccount" },
    ],
  },
];

export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="space-y-4">
            <Link to="/" aria-label="EZSignNow home">
              <BrandLogo />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              {t("footer.tagline")}
            </p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={t(c.title)}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-white">{t(c.title)}</p>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-slate-500 transition-colors hover:text-[#477c13] dark:hover:text-[#8ccd45]">
                      {t(l.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 md:flex-row">
          <p>© {new Date().getFullYear()} EZSignNow. {t("footer.rights")}</p>
          <LanguageSwitcher side="top" />
          <p>{t("footer.legal")}</p>
        </div>
      </div>
    </footer>
  );
}
