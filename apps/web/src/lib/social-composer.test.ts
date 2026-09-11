import { describe, expect, it } from "vitest";
import { dividerShareFromPointer } from "./social-composer";

describe("social composer direct manipulation", () => {
  it("maps pointer movement to a clamped divider percentage", () => {
    expect(dividerShareFromPointer(150, 100, 200)).toBe(25);
    expect(dividerShareFromPointer(220, 100, 200)).toBe(60);
    expect(dividerShareFromPointer(290, 100, 200)).toBe(75);
  });
});
