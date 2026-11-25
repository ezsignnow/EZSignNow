import { type InputFile, type Options, type OutputFile, type ToolContext, ToolError, baseName, str } from "../core";
import { canvasToBytes } from "@/lib/pdfjs";
import { type ScanFilter, applyScanFilter } from "../imageFilters";
import { imagesToPdf } from "./convert";

/** Longest side, in pixels, photos are scaled to — keeps phone photos from producing huge PDFs. */
const MAX_SIDE = 2400;

/** Scan to PDF: turns photos of pages into a clean, scanner-like PDF. */
export async function scanToPdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  if (!files.length) throw new ToolError("Take or upload at least one photo.");
  const filter = str(o.filter, "document") as ScanFilter;
  const processed: InputFile[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    ctx.progress(`Cleaning up ${f.name}`, i / files.length);
    let bmp: ImageBitmap;
    try {
      bmp = await createImageBitmap(new Blob([f.bytes], { type: f.type || "image/*" }), { imageOrientation: "from-image" });
    } catch {
      throw new ToolError(`${f.name} couldn't be read as an image.`);
    }
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * k));
    canvas.height = Math.max(1, Math.round(bmp.height * k));
    const c2 = canvas.getContext("2d")!;
    c2.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    if (filter !== "original") {
      const img = c2.getImageData(0, 0, canvas.width, canvas.height);
      applyScanFilter(img.data, filter);
      c2.putImageData(img, 0, 0);
    }
    const png = filter === "bw";
    processed.push({ id: f.id, name: `${baseName(f.name)}.${png ? "png" : "jpg"}`, type: png ? "image/png" : "image/jpeg", bytes: await canvasToBytes(canvas, png ? "image/png" : "image/jpeg", 0.86) });
  }
  const [pdf] = await imagesToPdf(processed, { pageSize: str(o.pageSize, "A4"), orientation: "auto", margin: str(o.margin, "small") }, ctx);
  return [{ ...pdf, name: "scan.pdf" }];
}
