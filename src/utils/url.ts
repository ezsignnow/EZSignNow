/**
 * Generates an absolute URL that includes the correct base path (e.g., for GitHub Pages subfolder deployment).
 * Handles differences between local development and production subdirectory hosting automatically.
 */
export const getAbsoluteUrl = (path: string): string => {
  const origin = window.location.origin;
  const baseUrl = import.meta.env.BASE_URL || "/"; // e.g., '/' or '/EZSignNow/'
  
  // Format base to ensure it ends with exactly one slash
  const formattedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  
  // Format path to remove any leading slash
  const formattedPath = path.startsWith('/') ? path.slice(1) : path;
  
  return `${origin}${formattedBase}${formattedPath}`;
};
