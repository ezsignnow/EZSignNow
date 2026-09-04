/**
 * Builds a logo.dev image URL for a company's domain.
 * https://logo.dev — returns that company's real brand logo/favicon.
 *
 * The token here is the publishable (`pk_`) key, which logo.dev's own docs
 * mark as safe for client-side use (same convention as Stripe's `pk_` keys).
 */
export function logoDevUrl(domain: string, size = 64): string {
  const token = import.meta.env.VITE_LOGO_DEV_TOKEN;
  const params = new URLSearchParams({ token, size: String(size) });
  return `https://img.logo.dev/${domain}?${params.toString()}`;
}

/** Known domains for the brands referenced across the app. */
export const BRAND_DOMAINS = {
  google: "google.com",
  googleDrive: "drive.google.com",
  oneDrive: "onedrive.live.com",
  dropbox: "dropbox.com",
  box: "box.com",
  stripe: "stripe.com",
  chegg: "chegg.com",
  stateFarm: "statefarm.com",
  compass: "compass.com",
  harvard: "harvard.edu",
  lernerRowe: "lernerandrowe.com",
} as const;
