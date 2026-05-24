import { FileSignature } from "lucide-react";

interface BrandLogoProps {
  className?: string;
  subtitleClassName?: string;
  iconSize?: string;
  textSize?: string;
}

export function BrandLogo({
  className = "",
  subtitleClassName = "",
  iconSize = "h-5.5 w-5.5",
  textSize = "text-lg",
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 group select-none ${className}`}>
      {/* Trendy Gradient Icon Wrapper */}
      <div className="bg-gradient-to-tr from-[#258ffb] to-[#635bff] p-2 rounded-xl text-white shadow-md shadow-[#258ffb]/15 shrink-0 transform group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
        <FileSignature className={iconSize} />
      </div>
      
      {/* Brand Text & Subtitle */}
      <div className="flex flex-col text-left">
        <div className="flex items-baseline leading-none">
          <span className={`font-black text-slate-800 dark:text-white tracking-tight ${textSize}`}>
            ezsign
          </span>
          <span className={`font-black bg-gradient-to-r from-[#258ffb] to-[#635bff] bg-clip-text text-transparent tracking-tight ${textSize}`}>
            now
          </span>
        </div>
        <span className={`text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1 whitespace-nowrap ${subtitleClassName}`}>
          one stop solution for digital Signature
        </span>
      </div>
    </div>
  );
}
