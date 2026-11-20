import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { to: "/#features", label: "Features" },
      { to: "/#pricing", label: "Pricing" },
      { to: "/tools", label: "PDF tools" },
      { to: "/edit", label: "PDF editor" },
      { to: "/forms", label: "Forms library" },
    ],
  },
  {
    title: "Compare",
    links: [{ to: "/compare/signnow", label: "EZSignNow vs signNow" }],
  },
  {
    title: "Company",
    links: [
      { to: "/company", label: "About" },
      { to: "/blog", label: "Blog" },
      { to: "/security", label: "Security" },
      { to: "/support", label: "Support" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/login", label: "Sign in" },
      { to: "/signup", label: "Create account" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="space-y-4">
            <Link to="/" aria-label="EZSignNow home">
              <BrandLogo />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              Send, sign and keep agreements, with an audit trail on every one.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-white">{c.title}</p>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-slate-500 transition-colors hover:text-[#477c13] dark:hover:text-[#8ccd45]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 md:flex-row">
          <p>© {new Date().getFullYear()} EZSignNow. All rights reserved.</p>
          <p>Legally binding e-signatures under ESIGN, UETA and eIDAS.</p>
        </div>
      </div>
    </footer>
  );
}
