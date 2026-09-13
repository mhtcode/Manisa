import { describe, expect, it } from "vitest";
import { isSafePushEndpoint, pushRetryDelayMs } from "./push-subscriptions";

describe("push subscriptions", () => {
  it("accepts only HTTPS push endpoints", () => {
    expect(isSafePushEndpoint("https://push.example.test/send/123")).toBe(true);
    expect(isSafePushEndpoint("http://push.example.test/send/123")).toBe(false);
    expect(isSafePushEndpoint("not a url")).toBe(false);
  });

  it("backs delivery retries off with a ceiling", () => {
    expect(pushRetryDelayMs(1)).toBe(30_000);
    expect(pushRetryDelayMs(3)).toBe(120_000);
    expect(pushRetryDelayMs(20)).toBe(15 * 60_000);
  });
});
