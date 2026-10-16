import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faPenNib, faKeyboard } from "@fortawesome/free-solid-svg-icons";

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

type SignatureMode = "draw" | "type";

const INK_COLOR = "hsl(222, 47%, 11%)";
const FONT_STYLESHEET_ID = "ez-signature-fonts";
const FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Playball&family=Sacramento&display=swap";

const SIGNATURE_FONTS = [
  { id: "great-vibes", label: "Classic", family: "'Great Vibes', cursive" },
  { id: "dancing-script", label: "Modern", family: "'Dancing Script', cursive", weight: "700" },
  { id: "playball", label: "Bold", family: "'Playball', cursive" },
  { id: "sacramento", label: "Light", family: "'Sacramento', cursive" },
] as const;

type SignatureFont = (typeof SIGNATURE_FONTS)[number];

function ensureSignatureFontsLoaded() {
  if (typeof document === "undefined" || document.getElementById(FONT_STYLESHEET_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href = FONT_STYLESHEET_URL;
  document.head.appendChild(link);
}

function fontString(font: SignatureFont, sizePx: number) {
  return `${"weight" in font ? font.weight + " " : ""}${sizePx}px ${font.family}`;
}

/** Renders the typed name onto a transparent canvas, scaled to fit, and returns a PNG data URL. */
function renderTypedSignature(name: string, font: SignatureFont, width: number, height: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const maxWidth = width * 0.9;
  let size = Math.floor(height * 0.5);
  ctx.font = fontString(font, size);
  while (size > 12 && ctx.measureText(name).width > maxWidth) {
    size -= 2;
    ctx.font = fontString(font, size);
  }

  ctx.fillStyle = INK_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, width / 2, height / 2);

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ width = 400, height = 150, onEnd }, ref) => {
    const sigCanvasRef = useRef<SignatureCanvas | null>(null);
    const [mode, setMode] = useState<SignatureMode>("draw");
    const [typedName, setTypedName] = useState("");
    const [fontId, setFontId] = useState<SignatureFont["id"]>(SIGNATURE_FONTS[0].id);

    const selectedFont = SIGNATURE_FONTS.find((f) => f.id === fontId) ?? SIGNATURE_FONTS[0];

    useEffect(() => {
      ensureSignatureFontsLoaded();
    }, []);

    // Start downloading the selected script font as soon as a name is typed, so
    // it is ready by the time the signature is rendered to an image.
    useEffect(() => {
      const name = typedName.trim();
      if (name && document.fonts?.load) {
        document.fonts.load(fontString(selectedFont, 40), name).catch(() => undefined);
      }
    }, [typedName, selectedFont]);

    const clearCurrent = () => {
      if (mode === "draw") sigCanvasRef.current?.clear();
      else setTypedName("");
    };

    useImperativeHandle(ref, () => ({
      clear: clearCurrent,
      getSignature: () => {
        if (mode === "type") {
          const name = typedName.trim();
          if (!name) return null;
          return renderTypedSignature(name, selectedFont, width, height);
        }
        if (sigCanvasRef.current?.isEmpty()) return null;
        return sigCanvasRef.current?.toDataURL("image/png") ?? null;
      },
      isEmpty: () => {
        if (mode === "type") return typedName.trim().length === 0;
        return sigCanvasRef.current?.isEmpty() ?? true;
      },
    }));

    return (
      <Tabs value={mode} onValueChange={(v) => setMode(v as SignatureMode)} className="space-y-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw">
            <FontAwesomeIcon icon={faPenNib} className="mr-2 h-3.5 w-3.5" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type">
            <FontAwesomeIcon icon={faKeyboard} className="mr-2 h-3.5 w-3.5" />
            Type
          </TabsTrigger>
        </TabsList>

        {/* forceMount keeps a drawn signature intact when switching tabs */}
        <TabsContent value="draw" forceMount className="mt-0 space-y-2 data-[state=inactive]:hidden">
          <div className="rounded-lg border-2 border-dashed border-border bg-card">
            <SignatureCanvas
              ref={sigCanvasRef}
              canvasProps={{
                width,
                height,
                className: "rounded-lg",
                style: { width: "100%", height: "auto" },
                "aria-label": "Draw your signature",
              }}
              backgroundColor="transparent"
              penColor={INK_COLOR}
              onEnd={onEnd}
            />
          </div>
          <p className="text-xs text-muted-foreground">Use your mouse, trackpad or finger to sign above.</p>
        </TabsContent>

        <TabsContent value="type" className="mt-0 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="typed-signature-name">Full name</Label>
            <Input
              id="typed-signature-name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Type your full name"
              autoComplete="name"
              maxLength={60}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Style</Label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Signature style">
              {SIGNATURE_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  role="radio"
                  aria-checked={fontId === font.id}
                  onClick={() => setFontId(font.id)}
                  className={`flex min-h-[56px] flex-col items-center justify-center rounded-lg border px-2 py-1.5 transition-colors ${
                    fontId === font.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {font.label}
                  </span>
                  <span
                    className="w-full truncate text-center text-xl leading-tight text-foreground"
                    style={{ fontFamily: font.family, fontWeight: "weight" in font ? Number(font.weight) : 400 }}
                  >
                    {typedName.trim() || "Your Name"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-card px-4"
            style={{ aspectRatio: `${width} / ${height}` }}
            aria-label="Signature preview"
          >
            {typedName.trim() ? (
              <span
                className="max-w-full truncate text-4xl"
                style={{
                  fontFamily: selectedFont.family,
                  fontWeight: "weight" in selectedFont ? Number(selectedFont.weight) : 400,
                  color: INK_COLOR,
                }}
              >
                {typedName.trim()}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Your signature preview appears here</span>
            )}
          </div>
        </TabsContent>

        <Button type="button" variant="outline" size="sm" onClick={clearCurrent}>
          <FontAwesomeIcon icon={faEraser} className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </Tabs>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
