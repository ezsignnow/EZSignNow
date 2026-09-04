import { useState } from "react";

interface BrandLogoImgProps {
  src: string;
  alt: string;
  className?: string;
  /** Rendered instead of a broken-image icon if the fetch fails (ad-blockers commonly flag third-party logo-lookup domains). */
  fallback: React.ReactNode;
}

/**
 * Renders a logo fetched from an external source (logo.dev), falling back
 * to a provided element if the image fails to load for any reason — a
 * blocked request (ad-blockers frequently flag domain-logo-lookup services),
 * a transient network error, or a rate limit — rather than showing the
 * browser's default broken-image icon.
 */
export function BrandLogoImg({ src, alt, className, fallback }: BrandLogoImgProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
