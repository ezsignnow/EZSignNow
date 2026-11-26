import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { track } from "@/lib/analytics";

/** Records one page_view per route change. Renders nothing. */
export function PageViewTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
