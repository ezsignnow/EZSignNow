// Time-boxed promotions shown on the site and applied at checkout (/try-trial).
//
// Checkout is still simulated (no live Stripe subscription is created yet), so a
// promo here changes what the checkout shows and records the trial length on the
// account. When real Stripe subscriptions are wired up, create a matching Stripe
// promotion code (or pass trial_period_days) using the values below.

export interface Promotion {
  code: string;
  plan: "Business";
  freeMonths: number;
  freeDays: number;
  /** First moment the code is accepted. */
  startsAt: Date;
  /** First moment the code is no longer accepted. */
  endsAt: Date;
  headline: string;
}

export const THANKSGIVING_PROMO: Promotion = {
  code: "THANK180",
  plan: "Business",
  freeMonths: 6,
  freeDays: 180,
  startsAt: new Date("2026-11-26T00:00:00-08:00"),
  // Redeemable through the end of Cyber Monday (Nov 30, 2026, Pacific time).
  endsAt: new Date("2026-12-01T00:00:00-08:00"),
  headline: "Thanksgiving offer: Business plan free for 6 months",
};

export const PROMOTIONS: Promotion[] = [THANKSGIVING_PROMO];

export const STANDARD_TRIAL_DAYS = 7;

const PENDING_KEY = "pending_promo_code";

export function isPromoActive(promo: Promotion, now: Date = new Date()): boolean {
  return now >= promo.startsAt && now < promo.endsAt;
}

export function activePromo(now: Date = new Date()): Promotion | null {
  return PROMOTIONS.find((p) => isPromoActive(p, now)) ?? null;
}

export type PromoError = "empty" | "unknown" | "expired" | "not_started";

// A flat shape (not a discriminated union) because the app builds without strictNullChecks.
export interface PromoResult {
  ok: boolean;
  promo: Promotion | null;
  reason: PromoError | null;
}

const fail = (reason: PromoError): PromoResult => ({ ok: false, promo: null, reason });

export function redeemPromoCode(input: string, now: Date = new Date()): PromoResult {
  const code = input.trim().toUpperCase();
  if (!code) return fail("empty");
  const promo = PROMOTIONS.find((p) => p.code === code);
  if (!promo) return fail("unknown");
  if (now < promo.startsAt) return fail("not_started");
  if (now >= promo.endsAt) return fail("expired");
  return { ok: true, promo, reason: null };
}

export function promoErrorMessage(reason: PromoError | null): string {
  switch (reason) {
    case "empty":
      return "Enter a promo code.";
    case "expired":
      return "This promo code has expired.";
    case "not_started":
      return "This promo code isn't active yet.";
    default:
      return "That promo code isn't valid.";
  }
}

export function savePendingPromo(code: string): void {
  try {
    localStorage.setItem(PENDING_KEY, code);
  } catch {
    /* storage unavailable */
  }
}

export function readPendingPromo(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingPromo(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Last day the code works, e.g. "November 30" (Pacific time). */
export function promoLastDayLabel(promo: Promotion): string {
  return new Date(promo.endsAt.getTime() - 1).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}
