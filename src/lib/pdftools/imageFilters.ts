export type ScanFilter = "original" | "document" | "grayscale" | "bw";

/** Otsu's method: the grey level that best separates dark ink from light paper. */
export function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (const g of gray) hist[g]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Gives a photo of a page the look of a scan, in place on RGBA pixel data.
 * - document: grey, with levels stretched so the paper turns white
 * - grayscale: plain grey
 * - bw: pure black and white
 */
export function applyScanFilter(data: Uint8ClampedArray, mode: ScanFilter): void {
  if (mode === "original") return;
  const n = data.length / 4;
  const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);

  let lo = 0;
  let hi = 255;
  if (mode === "document") {
    const hist = new Array(256).fill(0);
    for (const g of gray) hist[g]++;
    let acc = 0;
    while (lo < 254 && (acc += hist[lo]) < n * 0.01) lo++;
    acc = 0;
    while (hi > lo + 1 && (acc += hist[hi]) < n * 0.15) hi--;
  }
  const threshold = mode === "bw" ? otsuThreshold(gray) : 0;
  for (let i = 0; i < n; i++) {
    let g = gray[i];
    if (mode === "document") g = Math.max(0, Math.min(255, Math.round(((g - lo) / Math.max(1, hi - lo)) * 255)));
    else if (mode === "bw") g = g > threshold ? 255 : 0;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = g;
    data[i * 4 + 3] = 255;
  }
}
