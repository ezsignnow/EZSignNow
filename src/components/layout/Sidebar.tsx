import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { LanguageSwitcher, useT } from "@/i18n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faFileLines,
  faGear,
  faRightFromBracket,
  faFolderOpen,
  faFilePen,
  faToolbox,
  faPlus,
  faLifeRing,
} from "@fortawesome/free-solid-svg-icons";

export function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");
  const t = useT();

  const sections = [
    {
      label: t("side.signatures"),
      items: [
        { name: t("side.home"), path: "/dashboard", icon: faGaugeHigh, tab: null },
        { name: t("side.documents"), path: "/dashboard?tab=documents", icon: faFileLines, tab: "documents" },
        { name: t("side.templates"), path: "/dashboard?tab=templates", icon: faFolderOpen, tab: "templates" },
      ],
    },
    {
      label: t("side.pdf"),
      items: [
        { name: t("side.editPdf"), path: "/edit", icon: faFilePen, tab: null },
        { name: t("side.pdfTools"), path: "/tools", icon: faToolbox, tab: null },
      ],
    },
    {
      label: t("side.account"),
      items: [{ name: t("side.settings"), path: "/dashboard?tab=settings", icon: faGear, tab: "settings" }],
    },
  ];

  const isActive = (path: string, tab: string | null) =>
    path === "/edit"
      ? /^\/(edit|document\/[^/]+\/edit)$/.test(location.pathname)
      : path === "/tools"
        ? location.pathname.startsWith("/tools")
        : location.pathname === "/dashboard" && currentTab === tab;

  const name = user?.email?.split("@")[0] || "You";

  return (
    <aside className="fixed start-0 top-0 flex h-screen w-64 flex-col border-e border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-16 items-center border-b border-slate-100 px-5 dark:border-slate-800">
        <Link to="/dashboard" aria-label="EZSignNow dashboard">
          <BrandLogo subtitle="Digital signatures" />
        </Link>
      </div>

      <div className="px-4 pt-5">
        <Link
          to="/dashboard?tab=sign"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#5ba114] text-sm font-semibold text-white shadow-sm transition hover:bg-[#477c13]"
        >
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
          {t("side.newDocument")}
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Main">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.path, item.tab);
                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#73c41d]/12 text-[#3a6215] dark:bg-[#73c41d]/15 dark:text-[#abdb74]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900"
                      }`}
                    >
                      {active && <span className="absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-e bg-[#5ba114]" />}
                      <FontAwesomeIcon
                        icon={item.icon}
                        className={`h-4 w-4 ${active ? "text-[#5ba114]" : "text-slate-400 group-hover:text-slate-600"}`}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-slate-100 p-3 dark:border-slate-800">
        <Link
          to="/support"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <FontAwesomeIcon icon={faLifeRing} className="h-4 w-4 text-slate-400" />
          {t("side.help")}
        </Link>
        <LanguageSwitcher side="top" align="start" className="w-full justify-start" />
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#73c41d]/20 text-sm font-bold text-[#3a6215] dark:text-[#abdb74]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{name}</p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            aria-label={t("nav.signOut")}
            title={t("nav.signOut")}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
