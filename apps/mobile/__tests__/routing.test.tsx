import { resolveInitialRoute } from "../src/components/RoleGuard";

const assignment = (role: string) => ({ role, scopeType: "organization", scopeId: "o1", scopeName: "Org" }) as never;

describe("resolveInitialRoute", () => {
  it("sends a loading session nowhere", () => {
    expect(resolveInitialRoute({ status: "loading", assignments: [], hasOnboarded: true })).toBeNull();
  });

  it("sends a first-launch signed-out user to portal select", () => {
    expect(resolveInitialRoute({ status: "signed-out", assignments: [], hasOnboarded: false })).toBe("/");
  });

  it("sends a returning signed-out user straight to login", () => {
    expect(resolveInitialRoute({ status: "signed-out", assignments: [], hasOnboarded: true })).toBe("/login");
  });

  it("sends an unapproved account to the pending screen", () => {
    expect(resolveInitialRoute({ status: "pending", assignments: [assignment("org_owner")], hasOnboarded: true }))
      .toBe("/pending");
  });

  it("routes a single org assignment to the org dashboard", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("org_owner")], hasOnboarded: true }))
      .toBe("/(org)/dashboard");
  });

  // field_agent maps to no portal: agents work from the operations console
  // now, not from this app, so an agent-only account has nothing here to open
  // and lands on the same pending screen an unmapped role always would.
  it("sends a single agent assignment to pending — agents work from the console now", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("field_agent")], hasOnboarded: true }))
      .toBe("/pending");
  });

  it("routes a single business assignment to the business dashboard", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("biz_owner")], hasOnboarded: true }))
      .toBe("/(biz)/dashboard");
  });

  it("sends a multi-assignment user to the context picker", () => {
    expect(
      resolveInitialRoute({
        status: "ready",
        assignments: [assignment("org_admin"), assignment("biz_owner")],
        hasOnboarded: true,
      }),
    ).toBe("/context-picker");
  });

  it("sends a platform-only account to pending — platform roles have no mobile portal", () => {
    expect(resolveInitialRoute({ status: "ready", assignments: [assignment("platform_ops")], hasOnboarded: true }))
      .toBe("/pending");
  });
});
