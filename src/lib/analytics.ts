// First-party analytics: events go to the track_event() function in Supabase
// (supabase/migrations/20261126_admin_analytics.sql) and are shown on the
// admin-only page at /admin/analytics. No third-party script is involved.
//
// Tracking never throws and never blocks the UI: if the backend is missing or
// unreachable the event is silently dropped.

import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "page_view"
  | "checkout_view"
  | "promo_applied"
  | "promo_rejected"
  | "checkout_completed"
  | "free_plan_chosen"
  | "signup";

export interface TrackOptions {
  path?: string;
  promoCode?: string | null;
  plan?: string | null;
  metadata?: Record<string, unknown>;
}

const VISITOR_KEY = "ezs_vid";
const SESSION_KEY = "ezs_sid";

// document.referrer stays the same across in-app navigations, so it is only sent with the first page view.
let referrerSent = false;

/** Paths that are never tracked (the admin page itself). */
export function isUntrackedPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function storedId(storage: () => Storage, key: string): string {
  try {
    const s = storage();
    let id = s.getItem(key);
    if (!id) {
      id = randomId();
      s.setItem(key, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

export const visitorId = () => storedId(() => localStorage, VISITOR_KEY);
export const sessionId = () => storedId(() => sessionStorage, SESSION_KEY);

export function deviceType(width: number = typeof window !== "undefined" ? window.innerWidth : 1024): string {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/** External referrer host, or null for direct / same-site traffic. */
export function externalReferrer(ref: string = typeof document !== "undefined" ? document.referrer : ""): string | null {
  if (!ref) return null;
  try {
    const url = new URL(ref);
    if (typeof window !== "undefined" && url.host === window.location.host) return null;
    return url.host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Strips document ids and tokens so per-page counts group by page, not by record. */
export function normalizePath(path: string): string {
  return (
    path
      .split("?")[0]
      .split("#")[0]
      .replace(/\/document\/[^/]+/, "/document/:id")
      .replace(/\/template\/(?!new$)[^/]+/, "/template/:id")
      .replace(/\/t\/[^/]+/, "/t/:id")
      .replace(/\/sign\/[^/]+/, "/sign/:token")
      .replace(/(.)\/$/, "$1") || "/"
  );
}

export function track(event: AnalyticsEvent, opts: TrackOptions = {}): void {
  try {
    const rawPath = opts.path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    if (isUntrackedPath(rawPath)) return;
    let referrer: string | null = null;
    if (event === "page_view" && !referrerSent) {
      referrerSent = true;
      referrer = externalReferrer();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.rpc as any)("track_event", {
      p_event_type: event,
      p_path: normalizePath(rawPath),
      p_visitor_id: visitorId(),
      p_session_id: sessionId(),
      p_referrer: referrer,
      p_promo_code: opts.promoCode ?? null,
      p_plan: opts.plan ?? null,
      p_device: deviceType(),
      p_metadata: opts.metadata ?? {},
    }).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    /* never let analytics break the app */
  }
}
