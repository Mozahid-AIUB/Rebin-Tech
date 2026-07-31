import { render, screen } from "@testing-library/react-native";
import Index from "../app/index";

describe("app boot", () => {
  it("renders the root screen with the app name", async () => {
    // NOTE: deviation from the brief's literal test body — `render` is called
    // without `await`. @testing-library/react-native@14.0.1 (the latest version,
    // resolved by the brief's unpinned `pnpm add -D @testing-library/react-native`)
    // made `render()` an async function internally using `act()`, so `screen` is
    // only populated after the returned promise resolves. Without awaiting it,
    // `screen.getByText` always throws "`render` function has not been called".
    // Awaiting preserves the test's intent (assert the rendered screen shows the
    // app name) while matching the real, current API. See task-1-report.md.
    await render(<Index />);
    expect(screen.getByText("Rebin Tech")).toBeTruthy();
  });
});
