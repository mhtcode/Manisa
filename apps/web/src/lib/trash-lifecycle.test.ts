import { describe, expect, it } from "vitest";
import { deletedInSameTrashOperation, trashExpiresAt, trashTimeRemaining } from "./trash-lifecycle";

describe("trash lifecycle", () => {
  const deletedAt = new Date("2026-09-03T12:00:00.000Z");

  it("expires records exactly seven days after deletion", () => {
    expect(trashExpiresAt(deletedAt).toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it("describes the remaining restoration window", () => {
    expect(trashTimeRemaining(deletedAt, new Date("2026-09-04T12:00:00.000Z"))).toBe("6 days");
    expect(trashTimeRemaining(deletedAt, new Date("2026-09-10T11:30:00.000Z"))).toBe("less than 1 hour");
  });

  it("restores only dependants deleted in the same category operation", () => {
    expect(deletedInSameTrashOperation(deletedAt, new Date("2026-09-03T12:00:00.000Z"))).toBe(true);
    expect(deletedInSameTrashOperation(deletedAt, new Date("2026-09-02T12:00:00.000Z"))).toBe(false);
    expect(deletedInSameTrashOperation(deletedAt, null)).toBe(false);
  });
});
