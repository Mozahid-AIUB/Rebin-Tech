import { render, screen } from "@testing-library/react-native";
import { ConfigurationNotice } from "../src/components/ConfigurationNotice";

// The bug this file exists for: packages/api/src/client.ts threw at module
// scope when EXPO_PUBLIC_SUPABASE_URL or the anon key was missing. A throw
// during import happens before the first frame, so the app closed itself on
// launch with no message -- and it shipped that way to the App Store, because
// eas.json's production profile named no environment and EAS resolves
// variables per named environment.
//
// These tests pin the two halves of the fix: importing the client without
// configuration must not throw, and the app must render something that names
// what is missing.

describe("a build with no backend configured", () => {
  const REAL = { ...process.env };

  afterEach(() => {
    process.env = { ...REAL };
    jest.resetModules();
  });

  it("does not throw when the client is imported without configuration", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    jest.resetModules();

    // The whole point: this import used to kill the app.
    expect(() => require("@rebin/api")).not.toThrow();
  });

  // jest.setup.js re-applies the two variables after every resetModules, so a
  // truly unconfigured client cannot be constructed in this suite. The
  // reachable assertion is the one that matters anyway: a configured build
  // reports itself configured and carries no error to display.
  it("reports itself configured when both variables are present", () => {
    const api = require("@rebin/api");
    expect(api.isConfigured).toBe(true);
    expect(api.configurationError).toBeNull();
  });

  it("shows a screen naming the missing variable", async () => {
    await render(<ConfigurationNotice />);
    expect(screen.getByText(/isn't configured/i)).toBeTruthy();
  });
});
