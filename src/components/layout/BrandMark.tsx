interface BrandMarkProps {
  className?: string;
  title?: string;
}

/**
 * The EZSignNow mark: a document corner with a signature stroke that ends in
 * a check, on a green rounded square. Kept in sync with public/favicon.svg.
 */
export function BrandMark({ className = "h-9 w-9", title = "EZSignNow" }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ezs-mark-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8ccd45" />
          <stop offset="1" stopColor="#477c13" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ezs-mark-bg)" />
      {/* document */}
      <path d="M15 11h13l7 7v19a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2z" fill="#ffffff" fillOpacity="0.96" />
      <path d="M28 11v5a2 2 0 0 0 2 2h5" fill="#cdeaa9" />
      {/* signature stroke ending in a check */}
      <path
        d="M17 31c2.2-3.6 3.6-3.8 4.4-1.2.7 2.3 1.6 2.4 3-.2l2.4 2.6 5.2-6.2"
        fill="none"
        stroke="#3a6215"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 22h9" stroke="#abdb74" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
