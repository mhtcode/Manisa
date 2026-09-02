import { describe, expect, it } from "vitest";
import { defaultMobileNavigation, parseMobileNavigation } from "./mobile-navigation";

describe("parseMobileNavigation", () => {
  it("preserves four unique items including More", () => {
    expect(parseMobileNavigation("calendar,more,customers,reports")).toEqual(["calendar", "more", "customers", "reports"]);
  });

  it("falls back when More is missing", () => {
    expect(parseMobileNavigation("dashboard,appointments,calendar,customers")).toEqual(defaultMobileNavigation);
  });

  it("falls back for duplicate or unknown destinations", () => {
    expect(parseMobileNavigation("dashboard,dashboard,unknown,more")).toEqual(defaultMobileNavigation);
  });
});
