import { useEffect, useRef, useState } from "react";
import { renderPageToCanvas } from "@/lib/pdfjs";
import { pdfjsFor } from "@/lib/pdftools/tools/render";

/** Number of pages in a PDF (null while loading, -1 on error). */
export function usePageCount(bytes: Uint8Array | undefined): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    setCount(null);
    if (!bytes) return;
    let alive = true;
    pdfjsFor(bytes)
      .then((d) => alive && setCount(d.numPages))
      .catch(() => alive && setCount(-1));
    return () => {
      alive = false;
    };
  }, [bytes]);
  return count;
}

/** A page thumbnail, rendered when it scrolls into view. */
export function PageThumb({ bytes, index, width = 120, rotate = 0, className = "" }: { bytes: Uint8Array; index: number; width?: number; rotate?: number; className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [aspect, setAspect] = useState(1.3);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        try {
          const doc = await pdfjsFor(bytes);
          const page = await doc.getPage(index + 1);
          const vp = page.getViewport({ scale: 1 });
          const canvas = await renderPageToCanvas(page, (width * 1.5) / vp.width);
          if (alive) {
            setAspect(vp.height / vp.width);
            setUrl(canvas.toDataURL("image/jpeg", 0.8));
          }
        } catch {
          /* leave blank */
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [bytes, index, width]);
  const sideways = rotate % 180 !== 0;
  // Unrotated image is width × width·aspect; turned sideways it becomes width/aspect tall.
  const boxH = sideways ? width / aspect : width * aspect;
  return (
    <div ref={holder} className={`flex items-center justify-center overflow-hidden bg-white ring-1 ring-slate-200 ${className}`} style={{ width, height: boxH }}>
      {url ? (
        <img
          src={url}
          alt={`Page ${index + 1}`}
          draggable={false}
          className="max-w-none select-none transition-transform"
          style={{ width: sideways ? width / aspect : width, transform: `rotate(${rotate}deg)` }}
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-slate-100" />
      )}
    </div>
  );
}
