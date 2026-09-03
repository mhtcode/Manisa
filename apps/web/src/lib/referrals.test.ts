import { describe, expect, it } from "vitest";
import { filterReferralNodes, referralCreatesCycle, referralDepth, type ReferralNode } from "./referrals";

const nodes: ReferralNode[] = [
  { id: "a", name: "Ava", referrerId: null, active: true, phone: null, email: null },
  { id: "b", name: "Bea", referrerId: "a", active: true, phone: "222", email: null },
  { id: "c", name: "Cleo", referrerId: "b", active: true, phone: null, email: null },
  { id: "d", name: "Dina", referrerId: null, active: false, phone: null, email: null },
];

describe("referral network", () => {
  it("keeps ancestors and descendants around a filtered match", () => {
    expect(filterReferralNodes(nodes, "Bea", "all").map((node) => node.id)).toEqual(["a", "b", "c"]);
  });

  it("filters relationship states and calculates depth", () => {
    expect(filterReferralNodes(nodes, "", "connected").map((node) => node.id)).toEqual(["a", "b", "c"]);
    expect(filterReferralNodes(nodes, "", "archived").map((node) => node.id)).toEqual(["d"]);
    expect(referralDepth("c", new Map(nodes.map((node) => [node.id, node])))).toBe(2);
  });

  it("rejects self and indirect circular referrals", () => {
    const parents = new Map<string, string | null>([["a", null], ["b", "a"], ["c", "b"]]);
    expect(referralCreatesCycle("a", "a", parents)).toBe(true);
    expect(referralCreatesCycle("a", "c", parents)).toBe(true);
    expect(referralCreatesCycle("c", "a", parents)).toBe(false);
  });
});
