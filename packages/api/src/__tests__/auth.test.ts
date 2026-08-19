import { portalForRole } from "../auth";

describe("portalForRole", () => {
  it.each([
    ["org_owner", "org"],
    ["org_admin", "org"],
    ["org_requester", "org"],
    ["biz_owner", "business"],
    ["biz_staff", "business"],
  ] as const)("maps %s to the %s portal", (role, portal) => {
    expect(portalForRole(role)).toBe(portal);
  });

  it.each(["platform_owner", "platform_ops", "platform_finance", "platform_support"] as const)(
    "returns null for %s — platform roles have no mobile portal",
    (role) => {
      expect(portalForRole(role)).toBeNull();
    },
  );

  // field_agent and field_lead map to no portal on purpose: agents work from
  // the operations console now, not from this app. That an agent-only account
  // resolves to null (and from there to /pending) is the behaviour worth
  // pinning, not an omission to fix later.
  it.each(["field_agent", "field_lead"] as const)(
    "returns null for %s — agents work from the console now, not this app",
    (role) => {
      expect(portalForRole(role)).toBeNull();
    },
  );
});
