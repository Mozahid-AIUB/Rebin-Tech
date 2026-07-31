import { portalForRole } from "../auth";

describe("portalForRole", () => {
  it.each([
    ["org_owner", "org"],
    ["org_admin", "org"],
    ["org_requester", "org"],
    ["biz_owner", "business"],
    ["biz_staff", "business"],
    ["field_agent", "agent"],
    ["field_lead", "agent"],
  ] as const)("maps %s to the %s portal", (role, portal) => {
    expect(portalForRole(role)).toBe(portal);
  });

  it.each(["platform_owner", "platform_ops", "platform_finance", "platform_support"] as const)(
    "returns null for %s — platform roles have no mobile portal",
    (role) => {
      expect(portalForRole(role)).toBeNull();
    },
  );
});
