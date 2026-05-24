import { FileSignature } from "lucide-react";

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
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 group select-none ${className}`}
    >
      {/* Modern Gradient Icon Wrapper */}
      <div className="bg-gradient-to-tr from-[#258ffb] to-[#635bff] p-2 rounded-xl text-white shadow-md shadow-[#258ffb]/15 shrink-0 transform group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
        <FileSignature className={iconSize} />
      </div>
      
      {/* Brand Text Stack */}
      <div className="flex flex-col text-left justify-center">
        {/* Top brand line: YalTech (replaces airSlate) */}
        <div className="flex items-center gap-0.5 leading-none mb-0.5">
          <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Yal
          </span>
          <span className="text-[10px] font-extrabold text-[#258ffb] uppercase tracking-wider">
            Tech
          </span>
        </div>

        {/* Middle brand line: EZSignNow (replaces SignNow) */}
        <div className="flex items-baseline leading-none">
          <span className="text-xl font-extrabold text-[#258ffb] tracking-tight group-hover:text-[#1a7ae0] transition-colors">
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
