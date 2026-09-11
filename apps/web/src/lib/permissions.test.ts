import { describe, expect, it } from "vitest";
import { canManageStudioMember, hasBusinessPermission } from "./permissions";

describe("studio permissions", () => {
  it("gives owners and administrators full business access", () => {
    expect(hasBusinessPermission("OWNER", {}, "members.manage")).toBe(true);
    expect(hasBusinessPermission("ADMIN", {}, "trash.manage")).toBe(true);
  });

  it("keeps destructive configuration away from staff", () => {
    expect(hasBusinessPermission("STAFF", {}, "appointments.manage")).toBe(true);
    expect(hasBusinessPermission("STAFF", {}, "customers.manage")).toBe(false);
    expect(hasBusinessPermission("STAFF", {}, "financial.view")).toBe(false);
    expect(hasBusinessPermission("STAFF", {}, "trash.manage")).toBe(false);
  });

  it("gives managers operational control without studio administration", () => {
    expect(hasBusinessPermission("MANAGER", {}, "services.manage")).toBe(true);
    expect(hasBusinessPermission("MANAGER", {}, "financial.view")).toBe(true);
    expect(hasBusinessPermission("MANAGER", {}, "business.manage")).toBe(false);
    expect(hasBusinessPermission("MANAGER", {}, "data.import")).toBe(false);
  });

  it("applies explicit grants and denials after the role preset", () => {
    expect(hasBusinessPermission("STAFF", { "reports.view": true }, "reports.view")).toBe(true);
    expect(hasBusinessPermission("ADMIN", { "payments.manage": false }, "payments.manage")).toBe(false);
  });

  it("enforces the member-management hierarchy", () => {
    expect(canManageStudioMember("OWNER", "ADMIN")).toBe(true);
    expect(canManageStudioMember("OWNER", "STAFF")).toBe(true);
    expect(canManageStudioMember("ADMIN", "STAFF")).toBe(true);
    expect(canManageStudioMember("ADMIN", "ADMIN")).toBe(false);
    expect(canManageStudioMember("ADMIN", "MANAGER")).toBe(false);
    expect(canManageStudioMember("OWNER", "OWNER")).toBe(false);
  });

});
