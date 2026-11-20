import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPen,
  faICursor,
  faSquare,
  faSquareCheck,
  faCalendarDays,
  faTag,
  faXmark,
  faArrowsUpDownLeftRight,
  faCircleInfo,
  faSpinner,
  faPaperclip,
  faPalette,
  faUpload,
  faFileLines,
  faCircleCheck,
  faFont,
  faUser,
  faHashtag,
  faCaretDown,
  faCircleDot,
  faCircle,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { Signatory } from "./SignatoryManager";
import * as pdfjsLib from "pdfjs-dist";
import { CANVAS_PAGE_HEIGHT, CANVAS_PAGE_GAP } from "@/utils/pdfCanvasLayout";
import {
  CHOICE_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  FILLABLE_FIELD_TYPES,
  defaultFieldSize,
  parseChoices,
  signatureImage,
} from "@/lib/signing/workflow";

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
  /** Choices for dropdown and radio fields. */
  options?: string[];
}

interface DocumentCanvasProps {
  fields: Field[];
  onFieldsChange: (fields: Field[]) => void;
  signatories: Signatory[];
  selectedSignatory: number | null;
  readOnly?: boolean;
  fileUrl?: string;
  onFieldClick?: (fieldId: string) => void;
  onDropField?: (type: string, x: number, y: number) => void;
  /** While signing: the signer whose fields are open. Other signers' fields are shown locked. */
  activeSignatoryIndex?: number | null;
}

const fieldIcons: Record<string, any> = {
  signature: faPen,
  initials: faFont,
  name: faUser,
  text: faICursor,
  number: faHashtag,
  checkbox: faSquare,
  dropdown: faCaretDown,
  radio: faCircleDot,
  date: faCalendarDays,
  label: faTag,
  attachment: faPaperclip,
  drawing: faPalette,
};

const isImageValue = (v?: string) => !!v && v.startsWith("data:image");

export function DocumentCanvas({
  fields,
  onFieldsChange,
  signatories,
  selectedSignatory,
  readOnly = false,
  fileUrl,
  onFieldClick,
  onDropField,
  activeSignatoryIndex,
}: DocumentCanvasProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [choiceDraft, setChoiceDraft] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
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
    if (readOnly || editingField === fieldId) return;

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (readOnly || !canvasRef.current || !onDropField) return;
    e.preventDefault();
    setIsDragOver(false);

    const type = e.dataTransfer.getData("text/plain");
    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;
    const { width, height } = defaultFieldSize(type);

    // Center the field relative to the drop coordinate
    const x = Math.max(0, Math.min(dropX - width / 2, rect.width - width));
    const y = Math.max(0, Math.min(dropY - height / 2, rect.height - height));

    onDropField(type, x, y);
  };

  const handleDelete = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
    setEditingField(null);
  };

  const patchField = (fieldId: string, patch: Partial<Field>) => {
    onFieldsChange(fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  };

  const openEditor = (field: Field) => {
    if (readOnly) return;
    setChoiceDraft((field.options || []).join("\n"));
    setEditingField(field.id);
  };

  const closeEditor = (field: Field) => {
    if (CHOICE_FIELD_TYPES.has(field.type)) {
      const options = parseChoices(choiceDraft);
      const height = field.type === "radio" ? Math.max(field.height, 18 * Math.max(2, options.length) + 10) : field.height;
      patchField(field.id, { options, height });
    }
    setEditingField(null);
  };

  // Keep in sync with pdfCanvasLayout.ts — pdfGenerator.ts reverse-engineers
  // each field's page/position from these exact same dimensions, so drift
  // here silently misplaces fields on page 2+ in the final generated PDF.
  const canvasHeight = pageImages.length > 0
    ? CANVAS_PAGE_HEIGHT * pageImages.length + CANVAS_PAGE_GAP * (pageImages.length - 1)
    : CANVAS_PAGE_HEIGHT;

  const signingMode = readOnly && activeSignatoryIndex !== undefined;

  const renderValue = (field: Field, signatory: Signatory | null) => {
    const value =
      field.type === "signature" ? field.value || signatureImage(signatory) : field.value;

    if (field.type === "radio" && (field.options?.length || 0) > 0) {
      return (
        <div className="flex flex-col gap-0.5 w-full">
          {field.options!.map((opt) => (
            <span key={opt} className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">
              <FontAwesomeIcon
                icon={value === opt ? faCircleDot : faCircle}
                className={`h-3 w-3 shrink-0 ${value === opt ? "text-[#5ba114]" : "text-slate-300"}`}
              />
              {opt}
            </span>
          ))}
        </div>
      );
    }
    if (!value) return null;
    if (isImageValue(value)) {
      return (
        <div className="h-full w-full flex items-center justify-center overflow-hidden bg-transparent rounded-lg">
          <img src={value} alt={FIELD_TYPE_LABELS[field.type] || "Signature"} className="max-h-full max-w-full object-contain" />
        </div>
      );
    }
    if (field.type === "checkbox") {
      return value === "true" ? <FontAwesomeIcon icon={faSquareCheck} className="h-4 w-4 text-[#5ba114]" /> : null;
    }
    return (
      <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{value}</span>
    );
  };

  return (
    <Card
      id="document-scroll-container"
      className={`relative h-[800px] bg-[#f8fafc] dark:bg-slate-950 overflow-y-auto border rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850 scrollbar-track-transparent transition-all duration-250 ${
        isDragOver
          ? "border-[#73c41d] bg-blue-50/20 dark:bg-blue-950/15 ring-2 ring-[#73c41d]/20"
          : "border-slate-100 dark:border-slate-800"
      }`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Document placeholder / PDF preview */}
      <div className="flex justify-center p-6 min-h-full">
        {loadingPdf ? (
          <div className="flex flex-col items-center justify-center gap-2.5 text-slate-400 dark:text-slate-500 self-center py-20">
            <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin text-[#73c41d]" />
            <p className="text-xs font-bold uppercase tracking-wider">Rendering PDF pages...</p>
          </div>
        ) : fileUrl && pageImages.length > 0 ? (
          <div
            ref={canvasRef}
            // w-[600px] + gap-6 (24px) here must match CANVAS_PAGE_WIDTH /
            // CANVAS_PAGE_GAP in @/utils/pdfCanvasLayout.ts — pdfGenerator.ts
            // reverse-engineers each field's page from these exact values.
            className="relative w-[600px] select-none flex flex-col gap-6"
            style={{ height: `${canvasHeight}px` }}
          >
            {pageImages.map((src, index) => (
              <img
                key={index}
                src={src}
                alt={`Page ${index + 1}`}
                // h-[780px] here must match CANVAS_PAGE_HEIGHT in pdfCanvasLayout.ts
                className="w-[600px] h-[780px] border border-slate-100/80 dark:border-slate-850 rounded-xl shadow-[0_12px_30px_-5px_rgba(0,0,0,0.04),0_8px_16px_-6px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.25),0_8px_16px_-6px_rgba(0,0,0,0.25)] bg-white dark:bg-slate-900 object-contain transition-all hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.07),0_12px_20px_-8px_rgba(0,0,0,0.07)] duration-300"
              />
            ))}

            {/* Fields */}
            {fields.map((field) => {
              const Icon = fieldIcons[field.type] || faTag;
              const signatory = field.signatoryIndex !== null ? signatories[field.signatoryIndex] : null;
              const borderColor = signatory?.color || "hsl(var(--border))";
              const filled = renderValue(field, signatory);
              const hasImage = isImageValue(field.type === "signature" ? field.value || signatureImage(signatory) : field.value);
              const isDateSigned = field.type === "date" && !field.value && signatory?.signed_at;
              const isMine = signingMode && field.signatoryIndex === activeSignatoryIndex;
              const isLocked = signingMode && !isMine;
              const needsInput =
                isMine && FILLABLE_FIELD_TYPES.has(field.type) && field.type !== "radio" && !filled;
              const isEditing = editingField === field.id && !readOnly;

              return (
                <div
                  key={field.id}
                  className={`absolute flex items-center gap-2 rounded-xl transition-all duration-200 ${isEditing ? "z-30" : "z-10"} ${
                    hasImage
                      ? "border-transparent shadow-none p-0"
                      : (field.type === "drawing" || field.type === "attachment" || field.type === "radio"
                        ? "border p-1.5 shadow-sm"
                        : "border px-2.5 py-1.5 shadow-sm")
                  } ${
                    !readOnly ? "cursor-move hover:shadow-md" : isMine ? "cursor-pointer hover:shadow-md" : ""
                  } ${dragging === field.id ? "shadow-lg scale-102 z-20" : ""} ${
                    needsInput && field.required ? "ring-2 ring-offset-1 ring-amber-400/70 animate-pulse" : ""
                  } ${isLocked ? "opacity-80" : ""}`}
                  style={{
                    left: field.x,
                    top: field.y,
                    width: isEditing ? Math.max(field.width, 240) : field.width,
                    minHeight: field.height,
                    borderColor: hasImage ? "transparent" : borderColor,
                    backgroundColor: hasImage
                      ? "transparent"
                      : isEditing
                        ? "white"
                        : (signatory ? `${borderColor}10` : "rgba(91, 161, 20, 0.08)"),
                  }}
                  onMouseDown={(e) => handleMouseDown(e, field.id)}
                  onDoubleClick={() => openEditor(field)}
                  onClick={() => readOnly && onFieldClick && onFieldClick(field.id)}
                  title={isLocked && signatory ? `${signatory.name}'s field` : undefined}
                >
                  {isEditing ? (
                    <div className="space-y-2 py-1 w-full cursor-default" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {FIELD_TYPE_LABELS[field.type] || field.type}
                      </p>
                      <Input
                        placeholder={field.type === "label" ? "Text to show" : "Label"}
                        value={field.label || ""}
                        onChange={(e) => patchField(field.id, { label: e.target.value })}
                        className="h-7 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                        autoFocus
                      />
                      <Input
                        placeholder="Tooltip (optional)"
                        value={field.tooltip || ""}
                        onChange={(e) => patchField(field.id, { tooltip: e.target.value })}
                        className="h-7 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                      />
                      {CHOICE_FIELD_TYPES.has(field.type) && (
                        <textarea
                          placeholder={"Options, one per line\nYes\nNo"}
                          value={choiceDraft}
                          onChange={(e) => setChoiceDraft(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#73c41d]"
                        />
                      )}
                      {field.type !== "label" && signatories.length > 0 && (
                        <select
                          value={field.signatoryIndex ?? ""}
                          onChange={(e) =>
                            patchField(field.id, { signatoryIndex: e.target.value === "" ? null : Number(e.target.value) })
                          }
                          aria-label="Signer for this field"
                          className="w-full h-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 text-xs text-slate-800 dark:text-slate-100"
                        >
                          {signatories.map((s, i) =>
                            s.role === "cc" ? null : (
                              <option key={i} value={i}>
                                {s.name}
                              </option>
                            )
                          )}
                        </select>
                      )}
                      {FILLABLE_FIELD_TYPES.has(field.type) && (
                        <label className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          Required
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => patchField(field.id, { required: checked })}
                          />
                        </label>
                      )}
                      <Button
                        size="sm"
                        className="h-6 text-xs bg-[#73c41d] hover:bg-[#477c13] rounded-full px-3"
                        onClick={() => closeEditor(field)}
                      >
                        Done
                      </Button>
                    </div>
                  ) : field.type === "attachment" ? (
                    <div className="flex-1 min-w-0 h-full flex items-center">
                      {field.value ? (
                        <div className="flex items-center gap-2 w-full h-full text-left overflow-hidden">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                            <FontAwesomeIcon icon={faFileLines} className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">
                              {field.value}
                            </p>
                            <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-wide flex items-center gap-0.5 leading-none mt-0.5">
                              <FontAwesomeIcon icon={faCircleCheck} className="h-2.5 w-2.5" /> Uploaded
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full h-full text-left">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 shrink-0 border border-cyan-100 dark:border-cyan-900/50">
                            <FontAwesomeIcon icon={faUpload} className="h-3.5 w-3.5 animate-pulse" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11.5px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">
                              {field.label || "Attachment"}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-550 font-semibold truncate leading-none mt-0.5">
                              Click to upload file
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : field.type === "drawing" ? (
                    <div className="flex-1 min-w-0 h-full">
                      {field.value ? (
                        <div className="h-full w-full flex flex-col items-center justify-center overflow-hidden bg-white/40 dark:bg-slate-900/40 rounded-lg p-1">
                          <img
                            src={field.value}
                            alt="Drawing"
                            className="max-h-[85%] max-w-full object-contain"
                          />
                          <span className="text-[8px] font-extrabold text-indigo-500 uppercase tracking-wide flex items-center gap-0.5 mt-0.5 leading-none">
                            <FontAwesomeIcon icon={faCircleCheck} className="h-2.5 w-2.5" /> Sketch saved
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50/20 dark:bg-slate-900/20 text-center gap-1">
                          <FontAwesomeIcon icon={faPalette} className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                              {field.label || "Drawing Canvas"}
                            </p>
                            <p className="text-[8px] text-slate-400 dark:text-slate-550 font-semibold leading-normal mt-0.5">
                              Click to draw / sketch
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : field.type === "radio" ? (
                    <div className="flex-1 min-w-0">
                      {(field.options?.length || 0) > 0 ? (
                        filled
                      ) : (
                        <span className="text-[12px] font-bold text-slate-500">{field.label || "Radio buttons"} · add options</span>
                      )}
                      {signatory && !readOnly && (
                        <p className="text-[10.5px] text-slate-400 truncate font-semibold leading-none mt-1">{signatory.name}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {!hasImage && !filled && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg flex-shrink-0 bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-850 shadow-[0_1px_2px_rgba(0,0,0,0.02)] mr-2">
                          <FontAwesomeIcon icon={isLocked ? faLock : Icon} className="h-3.5 w-3.5" style={{ color: borderColor }} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 h-full">
                        {filled ? (
                          <div className="flex items-center gap-1 h-full">
                            {filled}
                            {field.type === "dropdown" && isMine && (
                              <FontAwesomeIcon icon={faCaretDown} className="h-3 w-3 text-slate-400 ml-auto" />
                            )}
                          </div>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-pointer">
                                <span className="text-[13.5px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                  {isDateSigned
                                    ? new Date(signatory!.signed_at!).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
                                    : (field.label || FIELD_TYPE_LABELS[field.type] || field.type)}
                                  {field.required && FILLABLE_FIELD_TYPES.has(field.type) && !isDateSigned && (
                                    <span className="text-rose-500 ml-0.5">*</span>
                                  )}
                                </span>
                                {field.tooltip && (
                                  <FontAwesomeIcon icon={faCircleInfo} className="h-3 w-3 text-slate-400 dark:text-slate-550 flex-shrink-0" />
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
                        {signatory && !filled && (
                          <p className="text-[11.5px] text-slate-400 dark:text-slate-550 truncate font-semibold leading-none mt-1">
                            {signatory.name}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {!readOnly && !isEditing && (
                    <div className="flex gap-1 items-center shrink-0">
                      <FontAwesomeIcon icon={faArrowsUpDownLeftRight} className="h-3 w-3 text-slate-300 dark:text-slate-700" />
                      <button
                        aria-label="Remove field"
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors rounded p-0.5 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(field.id);
                        }}
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
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
