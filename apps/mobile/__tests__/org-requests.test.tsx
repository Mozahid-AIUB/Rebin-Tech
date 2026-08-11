import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import OrgRequests from "../app/(org)/requests";
import { useSessionStore } from "../src/store/session";

const mockList = jest.fn();
jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return { ...actual, listPickupRequests: (...a: unknown[]) => mockList(...a) };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}));

const ROWS = [
  {
    id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    status: "pending" as const,
    unitCount: 25,
    windowStart: "2026-08-20T12:00:00.000Z",
    createdAt: "2026-08-11T09:00:00.000Z",
  },
];

function renderRequests() {
  return render(
    <PortalThemeProvider portal="org">
      <OrgRequests />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue(ROWS);
  useSessionStore.setState({
    status: "ready",
    userId: "u1",
    assignments: [
      { role: "org_owner", scopeType: "organization", scopeId: "o1", scopeName: "Org A" },
    ],
    activeIndex: 0,
  });
});

describe("Requests list", () => {
  it("asks for every status on first load", async () => {
    await renderRequests();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(mockList).toHaveBeenCalledWith("o1", expect.objectContaining({ status: undefined }));
  });

  // Filtering has to reach the query: narrowing a loaded page client-side
  // would answer "completed among the newest 50", not "this org's completed".
  it("refetches with the chosen status when a chip is tapped", async () => {
    await renderRequests();
    await waitFor(() => expect(screen.getByText("25 devices")).toBeTruthy());

    await fireEvent.press(screen.getByRole("radio", { name: "Completed" }));

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith("o1", expect.objectContaining({ status: "completed" })),
    );
  });

  it("searches by the id prefix shown on each request", async () => {
    await renderRequests();
    await waitFor(() => expect(screen.getByText("25 devices")).toBeTruthy());

    await fireEvent.changeText(screen.getByLabelText("Search by request ID"), "11111111");

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith("o1", expect.objectContaining({ idPrefix: "11111111" })),
    );
  });

  it("says the filter is what emptied the list, not that nothing exists", async () => {
    await renderRequests();
    await waitFor(() => expect(screen.getByText("25 devices")).toBeTruthy());

    mockList.mockResolvedValue([]);
    await fireEvent.press(screen.getByRole("radio", { name: "Cancelled" }));

    await waitFor(() => expect(screen.getByText("No cancelled requests")).toBeTruthy());
  });
});
