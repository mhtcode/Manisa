import { describe, expect, it } from "vitest";
import { passwordIsValid, passwordPolicyErrors } from "./password-policy";

describe("password policy", () => {
  it("requires length, mixed case, a number, and a symbol", () => {
    expect(passwordIsValid("Short1!")).toBe(false);
    expect(passwordPolicyErrors("alllowercase1!")).toContain("One uppercase letter");
    expect(passwordPolicyErrors("ALLUPPERCASE1!")).toContain("One lowercase letter");
    expect(passwordPolicyErrors("NoNumbersHere!")).toContain("One number");
    expect(passwordPolicyErrors("NoSymbols1234")).toContain("One symbol");
  });

  it("accepts a strong password", () => {
    expect(passwordIsValid("ManisaAdmin1!")).toBe(true);
  });
});
