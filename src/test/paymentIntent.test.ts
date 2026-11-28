import { describe, it, expect } from "vitest";
import { parsePaymentIntentRequest } from "../../api/_lib/paymentIntent.js";

describe("parsePaymentIntentRequest", () => {
  it("accepts a whole number of cents in USD", () => {
    expect(parsePaymentIntentRequest({ amount: 2500, currency: "usd" })).toEqual({ amount: 2500, currency: "usd" });
    expect(parsePaymentIntentRequest({ amount: 2500 })).toEqual({ amount: 2500, currency: "usd" });
    expect(parsePaymentIntentRequest({ amount: 2500, currency: "USD" })).toEqual({ amount: 2500, currency: "usd" });
  });

  it("no longer falls back to a default amount when none is sent", () => {
    expect(parsePaymentIntentRequest({})).toHaveProperty("error");
    expect(parsePaymentIntentRequest(undefined)).toHaveProperty("error");
  });

  it("rejects amounts that aren't whole, positive cents within Stripe's limits", () => {
    for (const amount of [0, -100, 49, 12.5, "1000", 100000000, Number.NaN, null]) {
      expect(parsePaymentIntentRequest({ amount })).toHaveProperty("error");
    }
  });

  it("rejects currencies the app doesn't charge in", () => {
    expect(parsePaymentIntentRequest({ amount: 1000, currency: "jpy" })).toHaveProperty("error");
  });
});
