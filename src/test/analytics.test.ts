import { describe, expect, it } from "vitest";
import { deviceType, isUntrackedPath, normalizePath } from "@/lib/analytics";

describe("analytics helpers", () => {
  it("groups record pages by route, not by id", () => {
    expect(normalizePath("/document/abc-123/prepare")).toBe("/document/:id/prepare");
    expect(normalizePath("/template/new")).toBe("/template/new");
    expect(normalizePath("/template/xyz/edit")).toBe("/template/:id/edit");
    expect(normalizePath("/t/xyz/sign")).toBe("/t/:id/sign");
    expect(normalizePath("/tools/merge/")).toBe("/tools/merge");
    expect(normalizePath("/try-trial?promo=THANK180")).toBe("/try-trial");
    expect(normalizePath("/")).toBe("/");
  });

  it("never tracks the admin pages", () => {
    expect(isUntrackedPath("/admin/analytics")).toBe(true);
    expect(isUntrackedPath("/admin/analytics/secret-key")).toBe(true);
    expect(isUntrackedPath("/administrator")).toBe(false);
    expect(isUntrackedPath("/dashboard")).toBe(false);
  });

  it("buckets screen widths into devices", () => {
    expect(deviceType(390)).toBe("mobile");
    expect(deviceType(800)).toBe("tablet");
    expect(deviceType(1440)).toBe("desktop");
  });
});
