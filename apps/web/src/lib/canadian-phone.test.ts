import { describe, expect, it } from "vitest";
import { normalizeCanadianPhone } from "./canadian-phone";

describe("Canadian phone validation", () => {
  it.each([
    ["", null],
    ["  ", null],
    ["416-555-0198", "+14165550198"],
    ["(647) 555 0123", "+16475550123"],
    ["+1 905 555 0111", "+19055550111"],
    ["1 289 555 0199", "+12895550199"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeCanadianPhone(input)).toBe(expected);
  });

  it.each(["5550198", "+44 20 7946 0958", "+1 016 555 0198", "+1 416 155 0198", "abc4165550198"])("rejects %s", (input) => {
    expect(() => normalizeCanadianPhone(input)).toThrow("Canadian phone number");
  });
});
