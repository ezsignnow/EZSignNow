import { describe, it, expect } from "vitest";
import { THANKSGIVING_PROMO, activePromo, promoLastDayLabel, redeemPromoCode } from "@/lib/promotions";

const thanksgiving = new Date("2026-11-26T12:00:00-08:00");

describe("Thanksgiving promotion", () => {
  it("accepts THANK180 in any case during the offer window", () => {
    const r = redeemPromoCode("  thank180 ", thanksgiving);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.promo.plan).toBe("Business");
      expect(r.promo.freeMonths).toBe(6);
      expect(r.promo.freeDays).toBe(180);
    }
  });

  it("works through the end of Nov 30 Pacific time and stops after", () => {
    expect(redeemPromoCode("THANK180", new Date("2026-11-30T23:59:59-08:00")).ok).toBe(true);
    expect(redeemPromoCode("THANK180", new Date("2026-12-01T00:00:00-08:00"))).toEqual({ ok: false, promo: null, reason: "expired" });
    expect(redeemPromoCode("THANK180", new Date("2026-11-25T12:00:00-08:00"))).toEqual({ ok: false, promo: null, reason: "not_started" });
  });

  it("rejects unknown and empty codes", () => {
    expect(redeemPromoCode("WELCOME20", thanksgiving)).toEqual({ ok: false, promo: null, reason: "unknown" });
    expect(redeemPromoCode("", thanksgiving)).toEqual({ ok: false, promo: null, reason: "empty" });
  });

  it("is the active promo only inside the window", () => {
    expect(activePromo(thanksgiving)).toBe(THANKSGIVING_PROMO);
    expect(activePromo(new Date("2026-12-02T00:00:00Z"))).toBeNull();
  });

  it("labels the last valid day", () => {
    expect(promoLastDayLabel(THANKSGIVING_PROMO)).toBe("November 30");
  });
});
