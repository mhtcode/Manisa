import { describe, expect, it } from "vitest";
import { clampImageFocus, dividerShareFromPointer, imageCropGeometry, moveImageFocus } from "./social-composer";

describe("social composer direct manipulation", () => {
  it("maps pointer movement to a clamped divider percentage", () => {
    expect(dividerShareFromPointer(150, 100, 200)).toBe(25);
    expect(dividerShareFromPointer(220, 100, 200)).toBe(60);
    expect(dividerShareFromPointer(290, 100, 200)).toBe(75);
  });

  it("keeps image focus and zoom inside editor bounds", () => {
    expect(clampImageFocus({ x: 140, y: -160, zoom: 5 })).toEqual({ x: 100, y: -100, zoom: 3 });
    expect(clampImageFocus({ x: 12, y: -8, zoom: 0.4 })).toEqual({ x: 12, y: -8, zoom: 1 });
  });

  it("converts pointer movement into normalized image focus", () => {
    expect(moveImageFocus({ x: 10, y: -5, zoom: 1.5 }, 40, -20, 200, 100)).toEqual({ x: 30, y: -25, zoom: 1.5 });
  });

  it("maps live focus to the same server-side crop window", () => {
    expect(imageCropGeometry(1000, 500, 400, 400, { x: 0, y: 0, zoom: 1 })).toEqual({ width: 800, height: 400, left: 200, top: 0 });
    expect(imageCropGeometry(1000, 500, 400, 400, { x: 100, y: 0, zoom: 1 })).toEqual({ width: 800, height: 400, left: 0, top: 0 });
    expect(imageCropGeometry(1000, 500, 400, 400, { x: -100, y: 0, zoom: 1 })).toEqual({ width: 800, height: 400, left: 400, top: 0 });
  });
});
