import { describe, expect, it } from "vitest";
import { hasBusinessPermission, hasPlatformPermission } from "./permissions";

describe("tenant permissions", () => {
  it("gives owners and administrators full business access", () => {
    expect(hasBusinessPermission("OWNER", {}, "members.manage")).toBe(true);
    expect(hasBusinessPermission("ADMIN", {}, "trash.manage")).toBe(true);
  });

  it("keeps destructive configuration away from staff", () => {
    expect(hasBusinessPermission("STAFF", {}, "appointments.manage")).toBe(true);
    expect(hasBusinessPermission("STAFF", {}, "financial.view")).toBe(false);
    expect(hasBusinessPermission("STAFF", {}, "trash.manage")).toBe(false);
  });

  it("applies explicit grants and denials after the role preset", () => {
    expect(hasBusinessPermission("STAFF", { "reports.view": true }, "reports.view")).toBe(true);
    expect(hasBusinessPermission("ADMIN", { "payments.manage": false }, "payments.manage")).toBe(false);
  });

  it("reserves platform-administrator management for the root owner by default", () => {
    expect(hasPlatformPermission("ROOT_OWNER", {}, "platformAdmins.manage")).toBe(true);
    expect(hasPlatformPermission("PLATFORM_ADMIN", {}, "platformAdmins.manage")).toBe(false);
    expect(hasPlatformPermission("PLATFORM_ADMIN", { "platformAdmins.manage": true }, "platformAdmins.manage")).toBe(true);
  });
});
