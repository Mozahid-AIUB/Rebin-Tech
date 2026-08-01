import { fireEvent, render, screen } from "@testing-library/react-native";
import SignupRolePicker from "../app/(auth)/signup/index";

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}));

beforeEach(() => jest.clearAllMocks());

// Pins the wiring the role picker exists for: every card opens the one shared
// registration form, differing only in the role it preselects there.
describe("Signup role picker", () => {
  it.each([
    ["Organization. Schools, hospitals, offices", "organization"],
    ["Business owner. Shops, repair centers, traders", "business"],
    ["Field agent. Collectors and pickup crew", "agent"],
  ])("opens the shared form with role=%s preselected", async (label, role) => {
    await render(<SignupRolePicker />);
    await fireEvent.press(screen.getByLabelText(label));
    expect(mockPush).toHaveBeenCalledWith(`/signup/register?role=${role}`);
  });

  it("goes back to log in from the header control", async () => {
    await render(<SignupRolePicker />);
    await fireEvent.press(screen.getByLabelText("Back to log in"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
