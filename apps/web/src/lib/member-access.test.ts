import { describe, expect, it } from "vitest";
import { createMemberAccessDraft, selectMemberRolePreset } from "./member-access";

describe("member access editor state", () => {
  it("opens with the member's saved role and permissions", () => {
    const permissions = { "payments.manage": false, "appointments.manage": true } as const;
    const draft = createMemberAccessDraft("STAFF", permissions);
    expect(draft.role).toBe("STAFF");
    expect(draft.permissions["payments.manage"]).toBe(false);
    expect(draft.permissions["appointments.manage"]).toBe(true);
  });

  it("creates an independent preset whenever the selected role changes", () => {
    const manager = selectMemberRolePreset("MANAGER");
    manager.permissions["payments.manage"] = false;
    const reopened = selectMemberRolePreset("MANAGER");
    expect(reopened.permissions["payments.manage"]).toBe(true);
    expect(reopened.permissions["members.manage"]).toBe(false);
  });
});
