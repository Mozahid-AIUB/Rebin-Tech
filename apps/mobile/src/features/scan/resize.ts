import { requireOptionalNativeModule } from "expo";

export const SCAN_LONG_EDGE = 1024;

/**
 * Shrinks a captured photo, or returns null if this build cannot.
 *
 * expo-image-manipulator resolves its native module at import time, so on a
 * build made before the dependency existed, *merely requiring it* throws. The
 * first attempt at this guarded the require in a try/catch, which does catch
 * the throw -- and still was not enough. Metro logs the failure of any module
 * whose evaluation throws, whoever catches it, so the dev client put a red box
 * on screen on every single scan. That is what "the camera is broken" was.
 *
 * `requireOptionalNativeModule` answers the question without asking the
 * question destructively: it returns null for a module that is not in the
 * binary, so the JS wrapper is never evaluated and there is nothing to log.
 *
 * A build without the module falls back to sending the original photo:
 * slower, but the camera works and the failure is a slow scan rather than a
 * red screen. Installing the dependency is not enough to fix that -- a native
 * module needs a new dev build. See BUILDS.md.
 */
export async function resizeForScan(uri: string): Promise<string | null> {
  if (requireOptionalNativeModule("ExpoImageManipulator") == null) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manipulator = require("expo-image-manipulator") as typeof import("expo-image-manipulator");

    const context = manipulator.ImageManipulator.manipulate(uri);
    // Width only: the height follows the aspect ratio, so a portrait shot of a
    // rack is not squashed into a square.
    context.resize({ width: SCAN_LONG_EDGE });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      format: manipulator.SaveFormat.JPEG,
      compress: 0.7,
      base64: true,
    });
    return result.base64 ?? null;
  } catch {
    // The module is present and the resize still failed -- an unreadable file,
    // or a photo the OS cleaned up behind us.
    return null;
  }
}
