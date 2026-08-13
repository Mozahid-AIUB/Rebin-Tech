const mockOptional = jest.fn();
// Only the one function is replaced. Substituting the whole module strips
// everything else expo's own internals reach for during module setup.
jest.mock("expo", () => ({
  ...jest.requireActual("expo"),
  requireOptionalNativeModule: (name: string) => mockOptional(name),
}));

const mockManipulate = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  get ImageManipulator() {
    // Getter, not a plain property: the point of these tests is that the JS
    // wrapper is never reached when the native side is absent, and a getter is
    // what makes "was it touched?" observable.
    mockTouched();
    return { manipulate: mockManipulate };
  },
  SaveFormat: { JPEG: "jpeg" },
}));
const mockTouched = jest.fn();

import { resizeForScan } from "../src/features/scan/resize";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("resizeForScan", () => {
  // The bug: expo-image-manipulator resolves its native module at import time,
  // so on a dev build that predates the dependency, merely requiring it threw.
  // A try/catch caught the throw but Metro still logged it and the dev client
  // still showed a red box on every single scan -- the "camera is broken"
  // report. Asking whether the module exists first means it is never touched.
  it("does not touch the JS wrapper when the native module is missing", async () => {
    mockOptional.mockReturnValue(null);

    const result = await resizeForScan("file:///photo.jpg");

    expect(result).toBeNull();
    expect(mockTouched).not.toHaveBeenCalled();
    expect(mockOptional).toHaveBeenCalledWith("ExpoImageManipulator");
  });

  it("shrinks the photo when the native module is present", async () => {
    mockOptional.mockReturnValue({});
    const saveAsync = jest.fn().mockResolvedValue({ base64: "c2hydW5r" });
    const renderAsync = jest.fn().mockResolvedValue({ saveAsync });
    const resize = jest.fn();
    mockManipulate.mockReturnValue({ resize, renderAsync });

    const result = await resizeForScan("file:///photo.jpg");

    expect(result).toBe("c2hydW5r");
    // Width only: the height follows the aspect ratio, so a portrait shot of a
    // rack is not squashed square.
    expect(resize).toHaveBeenCalledWith({ width: 1024 });
  });

  // The native module can be present and still fail -- an unreadable file, a
  // photo the OS has already cleaned up. A slow scan beats a dead button.
  it("falls back rather than throwing when the resize itself fails", async () => {
    mockOptional.mockReturnValue({});
    mockManipulate.mockImplementation(() => {
      throw new Error("could not decode");
    });

    await expect(resizeForScan("file:///photo.jpg")).resolves.toBeNull();
  });
});
