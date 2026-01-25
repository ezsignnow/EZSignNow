import { useRef, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface SignaturePadRef {
  clear: () => void;
  getSignature: () => string | null;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  onEnd?: () => void;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ width = 400, height = 150, onEnd }, ref) => {
    const sigCanvasRef = useRef<SignatureCanvas | null>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigCanvasRef.current?.clear();
      },
      getSignature: () => {
        if (sigCanvasRef.current?.isEmpty()) {
          return null;
        }
        return sigCanvasRef.current?.toDataURL("image/png") ?? null;
      },
      isEmpty: () => {
        return sigCanvasRef.current?.isEmpty() ?? true;
      },
    }));

    return (
      <div className="space-y-2">
        <div className="rounded-lg border-2 border-dashed border-border bg-card">
          <SignatureCanvas
            ref={sigCanvasRef}
            canvasProps={{
              width,
              height,
              className: "rounded-lg",
              style: { width: "100%", height: "auto" },
            }}
            backgroundColor="transparent"
            penColor="hsl(222, 47%, 11%)"
            onEnd={onEnd}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => sigCanvasRef.current?.clear()}
        >
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
