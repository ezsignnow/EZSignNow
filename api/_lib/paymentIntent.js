/**
 * Validation for /api/create-payment-intent, kept free of Stripe and HTTP so
 * it can be unit tested.
 */

/** Currencies the app charges in. */
export const ALLOWED_CURRENCIES = ["usd"];
/** Stripe's minimum charge for USD is $0.50. */
export const MIN_AMOUNT_CENTS = 50;
/** Stripe's maximum amount for a single USD charge ($999,999.99). */
export const MAX_AMOUNT_CENTS = 99999999;

/**
 * Returns `{ amount, currency }` ready for Stripe, or `{ error }` with a
 * message safe to show the caller.
 */
export function parsePaymentIntentRequest(body) {
  const amount = body?.amount;
  if (typeof amount !== "number" || !Number.isInteger(amount)) {
    return { error: "amount must be a whole number of cents" };
  }
  if (amount < MIN_AMOUNT_CENTS || amount > MAX_AMOUNT_CENTS) {
    return { error: "amount is out of range" };
  }
  const currency = body?.currency === undefined ? "usd" : String(body.currency).toLowerCase();
  if (!ALLOWED_CURRENCIES.includes(currency)) {
    return { error: "Unsupported currency" };
  }
  return { amount, currency };
}
