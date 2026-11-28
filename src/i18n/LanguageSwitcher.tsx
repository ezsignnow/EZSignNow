import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronDown, faGlobe } from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LANGUAGES, type LanguageGroup } from "./languages";
import { useLanguage } from "./LanguageProvider";

interface Props {
  className?: string;
  /** "compact" shows just the globe and code (for tight headers); "full" shows the language name. */
  variant?: "compact" | "full";
  align?: "start" | "end";
  side?: "top" | "bottom";
}

const GROUPS: { id: LanguageGroup; labelKey: "lang.world" | "lang.indian" }[] = [
  { id: "world", labelKey: "lang.world" },
  { id: "indian", labelKey: "lang.indian" },
];

export function LanguageSwitcher({ className, variant = "full", align = "end", side = "bottom" }: Props) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t("lang.label")}: ${language.nativeName}`}
        data-testid="language-switcher"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <FontAwesomeIcon icon={faGlobe} className="h-3.5 w-3.5 text-muted-foreground" />
        {variant === "full" ? (
          <span className="truncate">{language.nativeName}</span>
        ) : (
          <span className="uppercase">{language.code}</span>
        )}
        <FontAwesomeIcon icon={faChevronDown} className="h-2.5 w-2.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="max-h-[70vh] w-60 overflow-y-auto bg-popover">
        {GROUPS.map((group, gi) => (
          <div key={group.id}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(group.labelKey)}
            </DropdownMenuLabel>
            {LANGUAGES.filter((l) => l.group === group.id).map((l) => (
              <DropdownMenuItem
                key={l.code}
                onSelect={() => setLanguage(l.code)}
                className="cursor-pointer justify-between gap-3"
              >
                <span className="flex min-w-0 flex-col">
                  <span lang={l.code} dir={l.dir} className="truncate font-medium">
                    {l.nativeName}
                  </span>
                  {l.nativeName !== l.englishName && (
                    <span className="text-[11px] text-muted-foreground">{l.englishName}</span>
                  )}
                </span>
                {l.code === language.code && <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-[#5ba114]" />}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
