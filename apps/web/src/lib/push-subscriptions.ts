export function isSafePushEndpoint(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function pushRetryDelayMs(attempts: number) {
  return Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));
}
