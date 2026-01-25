import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  PenLine, 
  TextCursorInput, 
  Square,
  Calendar,
  Tag,
  Info
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
  { type: "signature", icon: PenLine, label: "Signature", description: "Draw or type signature" },
  { type: "text", icon: TextCursorInput, label: "Text Box", description: "Text input field" },
  { type: "checkbox", icon: Square, label: "Checkbox", description: "Yes/No checkbox" },
  { type: "date", icon: Calendar, label: "Date", description: "Date picker field" },
  { type: "label", icon: Tag, label: "Label", description: "Static text label" },
];

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Field Types
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Drag fields onto the document or click to add</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {fieldTypes.map(({ type, icon: Icon, label, description }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="justify-start gap-3 h-auto py-3"
                onClick={() => onAddField(type)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </CardContent>
    </Card>
  );
}
