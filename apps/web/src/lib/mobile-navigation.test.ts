import { describe, expect, it } from "vitest";
import { defaultMobileNavigation, parseMobileNavigation, swipeDestinationIndex } from "./mobile-navigation";

describe("parseMobileNavigation", () => {
  it("preserves four unique configured destinations", () => {
    expect(parseMobileNavigation("calendar,report,customers,settings")).toEqual(["calendar", "report", "customers", "settings"]);
  });

  it("falls back for legacy More configurations", () => {
    expect(parseMobileNavigation("dashboard,appointments,calendar,more")).toEqual(defaultMobileNavigation);
  });

  it("falls back for duplicate or unknown destinations", () => {
    expect(parseMobileNavigation("report,report,unknown,settings")).toEqual(defaultMobileNavigation);
  });
});

describe("swipeDestinationIndex", () => {
  it("moves forward on a left swipe and backward on a right swipe", () => {
    expect(swipeDestinationIndex(1, -90, 4)).toBe(2);
    expect(swipeDestinationIndex(1, 90, 4)).toBe(0);
  });

  it("reverses page order for RTL and stops at boundaries", () => {
    expect(swipeDestinationIndex(2, -90, 4, true)).toBe(1);
    expect(swipeDestinationIndex(0, 90, 4)).toBe(-1);
  });
});
