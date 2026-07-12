import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileSignature } from "@fortawesome/free-solid-svg-icons";

interface BrandLogoProps {
  className?: string;
  subtitleClassName?: string;
  iconSize?: string;
  onClick?: () => void;
}

export function BrandLogo({
  className = "",
  subtitleClassName = "",
  iconSize = "h-5.5 w-5.5",
  onClick,
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
        <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-md shadow-emerald-600/15 shrink-0 transform group-hover:scale-105 transition-all duration-300">
          <FontAwesomeIcon icon={faFileSignature} className={iconSize} />
        </div>
      )}
      
      {/* Brand Text Stack */}
      <div className="flex flex-col text-left justify-center">
        {/* Middle brand line: EZSignNow */}
        <div className="flex items-baseline leading-none">
          <span className="text-xl font-bold text-slate-800 tracking-tight transition-colors">
            EZSignNow
          </span>
        </div>
        
        {/* Bottom brand subtitle */}
        <span className={`text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1.5 whitespace-nowrap ${subtitleClassName}`}>
          one stop solution for digital Signature
        </span>
      </div>
    </div>
  );
}



