/**
 * Shared layout constants for the document-preparation canvas.
 *
 * DocumentCanvas.tsx renders each PDF page as a fixed-size image stacked
 * vertically (w-[600px] h-[780px], Tailwind `gap-6` between pages). Field
 * x/y coordinates are captured as absolute pixel offsets within that
 * stacked layout, with no explicit page number stored per field.
 *
 * pdfGenerator.ts has to reverse-engineer which page a field belongs to
 * (and its position on that page) from those same absolute coordinates —
 * so it must use the *exact* same page size/gap the canvas actually
 * renders with. These were previously two independently hardcoded magic
 * numbers (canvas used a 24px gap, the generator assumed 16px), which
 * silently misplaced — and on long enough documents, misattributed to
 * the wrong page entirely — any field placed on page 2 or later.
 */
export const CANVAS_PAGE_WIDTH = 600;
export const CANVAS_PAGE_HEIGHT = 780;
export const CANVAS_PAGE_GAP = 24; // Tailwind `gap-6` = 1.5rem = 24px
export const CANVAS_PAGE_STRIDE = CANVAS_PAGE_HEIGHT + CANVAS_PAGE_GAP;
