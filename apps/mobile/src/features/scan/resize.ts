export const SCAN_LONG_EDGE = 1024;

/**
 * Shrinks a captured photo, or returns null if this build cannot.
 *
 * expo-image-manipulator is a native module, so a JS-only reload onto an older
 * dev build has the JavaScript that calls it and none of the native side. A
 * top-level import throws at module load, which expo-router reports as the
 * route "missing the required default export" -- a message that points at the
 * screen rather than at the missing module, and takes the whole screen down
 * with it.
 *
 * Required lazily and guarded instead. A build without the module falls back
 * to sending the original photo: slower, but the camera still works, and the
 * failure is a slow scan rather than a blank screen.
 */
export async function resizeForScan(uri: string): Promise<string | null> {
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
    return null;
  }
}
