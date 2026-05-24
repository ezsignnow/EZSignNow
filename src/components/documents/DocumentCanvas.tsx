import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  PenLine, 
  TextCursorInput, 
  Square,
  Calendar,
  Tag,
  X,
  Move,
  Info,
  Loader2
} from "lucide-react";
import { Signatory } from "./SignatoryManager";
import * as pdfjsLib from "pdfjs-dist";

// Configure standard PDF.js worker via local static public URL
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface Field {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  tooltip?: string;
  required: boolean;
  signatoryIndex: number | null;
  value?: string;
}

interface DocumentCanvasProps {
  fields: Field[];
  onFieldsChange: (fields: Field[]) => void;
  signatories: Signatory[];
  selectedSignatory: number | null;
  readOnly?: boolean;
  fileUrl?: string;
  onFieldClick?: (fieldId: string) => void;
}

const fieldIcons: Record<string, typeof PenLine> = {
  signature: PenLine,
  text: TextCursorInput,
  checkbox: Square,
  date: Calendar,
  label: Tag,
};

export function DocumentCanvas({
  fields,
  onFieldsChange,
  signatories,
  selectedSignatory,
  readOnly = false,
  fileUrl,
  onFieldClick,
}: DocumentCanvasProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingField, setEditingField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (!fileUrl) {
      setPageImages([]);
      return;
    }

    const renderPdfPages = async () => {
      setLoadingPdf(true);
      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;
        const images: string[] = [];

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // High-DPI crisp render
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };
            await page.render(renderContext).promise;
            images.push(canvas.toDataURL("image/png"));
          }
        }
        setPageImages(images);
      } catch (err) {
        console.error("Error rendering PDF pages using PDF.js:", err);
      } finally {
        setLoadingPdf(false);
      }
    };

    renderPdfPages();
  }, [fileUrl]);

  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    if (readOnly) return;
    
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDragging(fieldId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;

    // Auto-scroll parent Card container if mouse is near the top or bottom of its scroll area
    const scrollContainer = canvasRef.current.parentElement;
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const relativeY = e.clientY - containerRect.top;
      
      const scrollSpeed = 16;
      const threshold = 60; // pixels from boundary to trigger scroll
      
      if (relativeY < threshold) {
        scrollContainer.scrollTop -= scrollSpeed;
      } else if (containerRect.height - relativeY < threshold) {
        scrollContainer.scrollTop += scrollSpeed;
      }
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    onFieldsChange(
      fields.map((f) =>
        f.id === dragging
          ? { ...f, x: Math.max(0, Math.min(x, rect.width - f.width)), y: Math.max(0, Math.min(y, rect.height - f.height)) }
          : f
      )
    );
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleDelete = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
    setEditingField(null);
  };

  const handleLabelChange = (fieldId: string, label: string) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, label } : f))
    );
  };

  const handleTooltipChange = (fieldId: string, tooltip: string) => {
    onFieldsChange(
      fields.map((f) => (f.id === fieldId ? { ...f, tooltip } : f))
    );
  };

  const canvasHeight = pageImages.length > 0 
    ? 780 * pageImages.length + 16 * (pageImages.length - 1)
    : 780;

  return (
    <Card
      className="relative h-[800px] bg-[#f8fafc] dark:bg-slate-950 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850 scrollbar-track-transparent transition-colors duration-250"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Document placeholder / PDF preview */}
      <div className="flex justify-center p-6 min-h-full">
        {loadingPdf ? (
          <div className="flex flex-col items-center justify-center gap-2.5 text-slate-400 dark:text-slate-500 self-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#258ffb]" />
            <p className="text-xs font-bold uppercase tracking-wider">Rendering PDF pages...</p>
          </div>
        ) : fileUrl && pageImages.length > 0 ? (
          <div
            ref={canvasRef}
            className="relative w-[600px] select-none flex flex-col gap-6"
            style={{ height: `${canvasHeight}px` }}
          >
            {pageImages.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Page ${index + 1}`}
                className="w-[600px] h-[780px] border border-slate-100/80 dark:border-slate-850 rounded-xl shadow-[0_12px_30px_-5px_rgba(0,0,0,0.04),0_8px_16px_-6px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.25),0_8px_16px_-6px_rgba(0,0,0,0.25)] bg-white dark:bg-slate-900 object-contain transition-all hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.07),0_12px_20px_-8px_rgba(0,0,0,0.07)] duration-300"
              />
            ))}

            {/* Fields */}
            {fields.map((field) => {
              const Icon = fieldIcons[field.type] || Tag;
              const signatory = field.signatoryIndex !== null ? signatories[field.signatoryIndex] : null;
              const borderColor = signatory?.color || "hsl(var(--border))";
              const isSigned = field.type === "signature" && signatory?.signature_data;
              const isDateSigned = field.type === "date" && signatory?.signed_at;

              return (
                <div
                  key={field.id}
                  className={`absolute flex items-center gap-2 rounded-xl transition-all duration-200 z-10 ${
                    isSigned 
                      ? "border-transparent shadow-none p-0" 
                      : "border px-2.5 py-1.5 shadow-sm"
                  } ${
                    !readOnly ? "cursor-move hover:shadow-md" : ""
                  } ${dragging === field.id ? "shadow-lg scale-102 z-20" : ""}`}
                  style={{
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    minHeight: field.height,
                    borderColor: isSigned ? "transparent" : borderColor,
                    backgroundColor: isSigned 
                      ? "transparent" 
                      : (signatory ? `${borderColor}10` : "rgba(37, 143, 251, 0.08)"),
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field.id)}
                  onDoubleClick={() => !readOnly && setEditingField(field.id)}
                  onClick={() => readOnly && onFieldClick && onFieldClick(field.id)}
                >
                  {!isSigned && (
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-lg flex-shrink-0 bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-850 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: borderColor }} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 h-full">
                    {isSigned ? (
                      <div className="h-full w-full flex items-center justify-center overflow-hidden bg-transparent rounded-lg">
                        <img
                          src={signatory.signature_data!}
                          alt="Signature"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : editingField === field.id && !readOnly ? (
                      <div className="space-y-2 py-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          placeholder="Label"
                          value={field.label || ""}
                          onChange={(e) => handleLabelChange(field.id, e.target.value)}
                          className="h-7 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                          autoFocus
                        />
                        <Input
                          placeholder="Tooltip (optional)"
                          value={field.tooltip || ""}
                          onChange={(e) => handleTooltipChange(field.id, e.target.value)}
                          className="h-7 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                        />
                        <Button
                          size="sm"
                          className="h-6 text-xs bg-[#258ffb] hover:bg-[#1d7ee6] rounded-full px-3"
                          onClick={() => setEditingField(null)}
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-pointer">
                            <span className="text-[13.5px] font-bold text-slate-700 dark:text-slate-200 truncate">
                              {isDateSigned 
                                ? new Date(signatory.signed_at!).toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' })
                                : (field.label || field.type)}
                            </span>
                            {field.tooltip && (
                              <Info className="h-3 w-3 text-slate-400 dark:text-slate-550 flex-shrink-0" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {field.tooltip && (
                          <TooltipContent className="bg-slate-800 text-white border-0 text-xs rounded-lg p-2 max-w-xs shadow-md">
                            <p className="font-semibold">{field.tooltip}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    )}
                    {signatory && !isSigned && (
                      <p className="text-[11.5px] text-slate-400 dark:text-slate-500 truncate font-semibold leading-none mt-1">
                        {signatory.name}
                      </p>
                    )}
                  </div>

                  {!readOnly && editingField !== field.id && (
                    <div className="flex gap-1 items-center shrink-0">
                      <Move className="h-3 w-3 text-slate-300 dark:text-slate-700" />
                      <button
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors rounded p-0.5 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(field.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-[600px] h-[780px] bg-slate-50 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center self-center py-20 px-8 text-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] transition-colors">
            <p className="text-slate-405 dark:text-slate-500 font-bold text-[13px] tracking-tight">
              Document Preview Area
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 leading-normal max-w-xs">
              Click elements in the left Field Types palette or add signatories on the right to prepare this document.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
