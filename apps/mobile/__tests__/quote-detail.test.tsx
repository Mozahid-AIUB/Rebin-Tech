import { render, screen, waitFor } from "@testing-library/react-native";
import { PortalThemeProvider } from "@rebin/ui";
import QuoteDetail from "../app/(biz)/quote/[id]";

const mockGetQuote = jest.fn();
const mockDecide = jest.fn();

jest.mock("@rebin/api", () => {
  const actual = jest.requireActual("@rebin/api");
  return {
    ...actual,
    getQuote: (...a: unknown[]) => mockGetQuote(...a),
    decideQuote: (...a: unknown[]) => mockDecide(...a),
  };
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "9f0c1d2e-3a4b-5c6d-7e8f-901234567890" }),
}));

const QUOTE = {
  id: "9f0c1d2e-3a4b-5c6d-7e8f-901234567890",
  status: "accepted" as const,
  totalCents: 27000,
  catalogVersionId: "cat-1",
  expiresAt: "2026-08-20T12:00:00.000Z",
  decidedAt: "2026-08-12T12:00:00.000Z",
  createdAt: "2026-08-11T09:00:00.000Z",
  items: [
    {
      componentKey: "laptop",
      displayName: "Business laptop",
      grade: "working" as const,
      unit: "each" as const,
      quantity: 3,
      unitPriceCents: 9000,
      lineTotalCents: 27000,
      confidence: 94,
      notes: "Dell Latitude",
    },
  ],
  collection: null,
};

/** A collection that came up short, as `quote_collection` reports it. */
const SHORT = {
  status: "collected" as const,
  collectedAt: "2026-08-13T14:00:00.000Z",
  expectedUnits: 3,
  actualUnits: 2,
  reconciliation: "mismatch" as const,
  resolutionNote: null,
};

function renderDetail() {
  return render(
    <PortalThemeProvider portal="business">
      <QuoteDetail />
    </PortalThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetQuote.mockResolvedValue(QUOTE);
  mockDecide.mockResolvedValue(undefined);
});

describe("Quote detail, collection outcome", () => {
  it("says nothing about a collection nobody has made yet", async () => {
    await renderDetail();

    await waitFor(() => expect(screen.getByText("You accepted this offer")).toBeTruthy());
    expect(screen.queryByText(/^Collected \d+ of \d+$/)).toBeNull();
    expect(screen.getByText(/arrange collection and payment/)).toBeTruthy();
  });

  it("says nothing extra when the count agreed with the offer", async () => {
    mockGetQuote.mockResolvedValue({
      ...QUOTE,
      collection: { ...SHORT, actualUnits: 3, reconciliation: "matched" },
    });
    await renderDetail();

    await waitFor(() => expect(screen.getByText("You accepted this offer")).toBeTruthy());
    expect(screen.queryByText(/^Collected \d+ of \d+$/)).toBeNull();
    expect(screen.queryByText(/on hold/)).toBeNull();
  });

  it("names both counts and says the payment is held", async () => {
    mockGetQuote.mockResolvedValue({ ...QUOTE, collection: SHORT });
    await renderDetail();

    await waitFor(() => expect(screen.getByText("Collected 2 of 3")).toBeTruthy());
    expect(screen.getByText(/payment is on hold while the office checks the count/)).toBeTruthy();
    // A hold with no end to it reads as money lost. The vendor is told someone
    // is working on it and that they are not the one who has to chase it.
    expect(screen.getByText(/write as soon as it/)).toBeTruthy();
  });

  it("stops promising to arrange a collection that already happened", async () => {
    mockGetQuote.mockResolvedValue({ ...QUOTE, collection: SHORT });
    await renderDetail();

    await waitFor(() => expect(screen.getByText("Collected 2 of 3")).toBeTruthy());
    expect(screen.queryByText(/arrange collection and payment/)).toBeNull();
  });

  it("gives the office's reason once the hold is lifted", async () => {
    mockGetQuote.mockResolvedValue({
      ...QUOTE,
      collection: {
        ...SHORT,
        reconciliation: "resolved",
        resolutionNote: "Vendor sold one laptop before pickup",
      },
    });
    await renderDetail();

    await waitFor(() => expect(screen.getByText("Collected 2 of 3")).toBeTruthy());
    expect(screen.getByText("Vendor sold one laptop before pickup")).toBeTruthy();
    expect(screen.queryByText(/on hold/)).toBeNull();
  });
});
