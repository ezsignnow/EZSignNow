import { useState, useRef } from "react";
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
  Info
} from "lucide-react";
import { Signatory } from "./SignatoryManager";

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
}: DocumentCanvasProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingField, setEditingField] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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

  return (
    <Card
      ref={canvasRef}
      className="relative h-[800px] bg-card overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Document placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[780px] bg-accent border border-border rounded shadow-inner flex items-center justify-center">
          <p className="text-muted-foreground text-center px-8">
            Document preview area<br />
            <span className="text-sm">Click fields in the palette to add them here</span>
          </p>
        </div>
      </div>

      {/* Fields */}
      {fields.map((field) => {
        const Icon = fieldIcons[field.type] || Tag;
        const signatory = field.signatoryIndex !== null ? signatories[field.signatoryIndex] : null;
        const borderColor = signatory?.color || "hsl(var(--border))";

        return (
          <div
            key={field.id}
            className={`absolute flex items-center gap-2 rounded border-2 bg-card/95 px-3 py-2 shadow-sm transition-shadow ${
              !readOnly ? "cursor-move hover:shadow-md" : ""
            } ${dragging === field.id ? "shadow-lg z-10" : ""}`}
            style={{
              left: field.x,
              top: field.y,
              width: field.width,
              minHeight: field.height,
              borderColor,
            }}
            onMouseDown={(e) => handleMouseDown(e, field.id)}
            onDoubleClick={() => !readOnly && setEditingField(field.id)}
          >
            <div
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ backgroundColor: `${borderColor}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: borderColor }} />
            </div>
            
            <div className="flex-1 min-w-0">
              {editingField === field.id && !readOnly ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    placeholder="Label"
                    value={field.label || ""}
                    onChange={(e) => handleLabelChange(field.id, e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Input
                    placeholder="Tooltip (optional)"
                    value={field.tooltip || ""}
                    onChange={(e) => handleTooltipChange(field.id, e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => setEditingField(null)}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">
                        {field.label || field.type}
                      </span>
                      {field.tooltip && (
                        <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </TooltipTrigger>
                  {field.tooltip && (
                    <TooltipContent>
                      <p>{field.tooltip}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
              {signatory && (
                <p className="text-xs text-muted-foreground truncate">
                  {signatory.name}
                </p>
              )}
            </div>

            {!readOnly && editingField !== field.id && (
              <div className="flex gap-1">
                <Move className="h-3 w-3 text-muted-foreground" />
                <button
                  className="text-destructive hover:text-destructive/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(field.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
