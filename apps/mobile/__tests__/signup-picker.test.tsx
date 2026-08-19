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
    // A third card: a supplier registers with no EIN and no business-type
    // choice, but otherwise opens the same shared form as everyone else.
    ["Supplier. Independent collectors, garages, side buyers", "supplier"],
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

  // Pinned at exactly three: nobody registers as an agent from the app any
  // more, and a stray fourth card is the kind of regression the label-driven
  // presses above wouldn't catch on their own.
  it("offers exactly three cards", async () => {
    await render(<SignupRolePicker />);
    expect(screen.getAllByRole("button").filter((el) => el.props.accessibilityLabel?.includes("."))).toHaveLength(3);
  });
});
