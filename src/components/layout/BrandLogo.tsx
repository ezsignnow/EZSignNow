import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";

interface BrandLogoProps {
  className?: string;
  subtitleClassName?: string;
  iconSize?: string;
  onClick?: () => void;
  /**
   * Text color for surfaces that are always dark regardless of the app's
   * light/dark theme (e.g. a permanently navy sidebar or header) — not to
   * be confused with the OS/theme-driven `dark:` variants used elsewhere
   * in this component. Defaults to "light" (dark text, for light surfaces).
   */
  variant?: "light" | "dark";
  /** Overrides the default tagline (e.g. a page-specific context label like "Template Portal") while keeping the same logo mark and typography everywhere. */
  subtitle?: string;
}

export function BrandLogo({
  className = "",
  subtitleClassName = "",
  iconSize = "h-5.5 w-5.5",
  onClick,
  variant = "light",
  subtitle = "one stop solution for digital Signature",
}: BrandLogoProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    const storedBranding = localStorage.getItem("custom_branding");
    if (storedBranding) {
      try {
        const parsed = JSON.parse(storedBranding);
        if (parsed.logoUrl) {
          setCustomLogo(parsed.logoUrl);
        }
      } catch (err) {
        console.error("Error reading custom logo in BrandLogo:", err);
      }
    }

    // Add a window listener for dynamic storage events (for real-time dashboard updates)
    const handleStorageChange = () => {
      const stored = localStorage.getItem("custom_branding");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCustomLogo(parsed.logoUrl || null);
        } catch (e) {
          setCustomLogo(null);
        }
      } else {
        setCustomLogo(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("branding_updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("branding_updated", handleStorageChange);
    };
  }, []);

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 group select-none ${className}`}
    >
      {/* Dynamic logo upload renders here */}
      {customLogo ? (
        <div className="h-9 w-12 rounded-xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center p-0.5 bg-white shadow-sm transform group-hover:scale-105 transition-all duration-300">
          <img src={customLogo} alt="Workspace Logo" className="max-h-full max-w-full object-contain" />
        </div>
      ) : (
        <BrandMark className="h-9 w-9 shrink-0 drop-shadow-sm transform group-hover:scale-105 transition-transform duration-300" />
      )}

      {/* Brand Text Stack */}
      <div className="flex flex-col text-left justify-center">
        {/* Wordmark: "EZSign" in ink, "Now" in brand green */}
        <div className="flex items-baseline leading-none font-heading">
          <span className={`text-xl font-extrabold tracking-tight transition-colors ${variant === "dark" ? "text-white" : "text-slate-900 dark:text-white"}`}>
            EZSign<span className="text-[#5ba114] dark:text-[#8ccd45]">Now</span>
          </span>
        </div>

        {/* Bottom brand subtitle */}
        <span className={`text-[8px] font-extrabold uppercase tracking-widest leading-none mt-1.5 whitespace-nowrap ${variant === "dark" ? "text-slate-400" : "text-slate-400 dark:text-slate-500"} ${subtitleClassName}`}>
          {subtitle}
        </span>
      </div>
    </div>
  );
}



