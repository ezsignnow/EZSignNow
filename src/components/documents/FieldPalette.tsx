import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PenLine, 
  TextCursorInput, 
  Square,
  Calendar,
  Tag,
  Info,
  Paperclip,
  Palette
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldPaletteProps {
  onAddField: (type: string) => void;
}

const fieldTypes = [
  { 
    type: "signature", 
    icon: PenLine, 
    label: "Signature", 
    description: "Draw or type signature",
    colorClass: "bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-300"
  },
  { 
    type: "text", 
    icon: TextCursorInput, 
    label: "Text Box", 
    description: "Text input field",
    colorClass: "bg-purple-50 dark:bg-purple-950/30 text-purple-500 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 group-hover:text-purple-600 dark:group-hover:text-purple-300"
  },
  { 
    type: "checkbox", 
    icon: Square, 
    label: "Checkbox", 
    description: "Yes/No checkbox",
    colorClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-300"
  },
  { 
    type: "date", 
    icon: Calendar, 
    label: "Date", 
    description: "Date picker field",
    colorClass: "bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 group-hover:text-amber-600 dark:group-hover:text-amber-300"
  },
  { 
    type: "label", 
    icon: Tag, 
    label: "Label", 
    description: "Static text label",
    colorClass: "bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 group-hover:text-rose-600 dark:group-hover:text-rose-300"
  },
  { 
    type: "attachment", 
    icon: Paperclip, 
    label: "Attachment", 
    description: "Upload supporting document",
    colorClass: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-500 dark:text-cyan-400 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/40 group-hover:text-cyan-600 dark:group-hover:text-cyan-300"
  },
  { 
    type: "drawing", 
    icon: Palette, 
    label: "Drawing", 
    description: "Sketch or draw diagrams",
    colorClass: "bg-slate-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 group-hover:bg-slate-100 dark:group-hover:bg-indigo-900/40 group-hover:text-slate-600 dark:group-hover:text-indigo-300"
  },
];

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <Card className="border-slate-100/80 dark:border-slate-800 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-900 overflow-hidden transition-colors">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
          Field Types
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-355 transition-colors focus:outline-none">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-800 text-white border-0 text-xs px-2.5 py-1.5 rounded-lg shadow-md">
              <p className="font-semibold text-center leading-none">Click to add a field onto your document</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-5 pb-5">
        {fieldTypes.map(({ type, icon: Icon, label, description, colorClass }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <button
                className="flex items-center gap-3.5 w-full text-left p-3 border border-slate-100/80 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/20 dark:hover:bg-slate-800/20 rounded-xl transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.01)] group focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-800 bg-white dark:bg-slate-900 cursor-grab active:cursor-grabbing select-none"
                onClick={() => onAddField(type)}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 shrink-0 ${colorClass}`}>
                  <Icon className="h-4.5 w-4.5 group-hover:scale-115 transition-transform duration-200" />
                </div>
                <div className="text-left min-w-0">
                  <p className="font-bold text-[13px] text-slate-700 dark:text-slate-200 leading-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-normal mt-0.5">{description}</p>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-slate-800 text-white border-0 text-xs px-2.5 py-1.5 rounded-lg max-w-xs shadow-md">
              <p className="font-semibold">{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </CardContent>
    </Card>
  );
}




