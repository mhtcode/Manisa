import { describe, expect, it } from "vitest";
import { intlLocale, translateUiText } from "./i18n";

describe("Persian interface localization", () => {
  it("translates known private-app labels", () => {
    expect(translateUiText("Settings", "fa")).toBe("تنظیمات");
    expect(translateUiText("Payment distribution", "fa")).toBe("وضعیت پرداخت");
  });

  it("keeps all displayed digits Latin", () => {
    expect(translateUiText(" ۹ appointments ", "fa")).toBe(" 9 قرار ");
    expect(new Intl.NumberFormat(intlLocale("fa")).format(123456)).toBe("123,456");
  });
});
