import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * Takes a photo and returns it small enough to send.
 *
 * A phone camera hands back a 12-megapixel image. Base64 of that runs to five
 * megabytes, which took twelve seconds to reach the scan function over a good
 * connection and considerably longer over a warehouse's -- long enough that
 * the person holding the phone concludes the button is broken and walks away.
 *
 * Resizing to 1024px on the long edge takes it to roughly 150KB. The model
 * reads a make, a model and an asset tag off that as well as it does off the
 * original: what it needs is a legible label, not megapixels.
 *
 * expo-image-picker cannot do this itself -- it has no resize option, which is
 * why the `imageDimensions` that used to sit in these call sites did nothing
 * at all.
 */
export const SCAN_LONG_EDGE = 1024;

export type Capture = { base64: string; mimeType: string };

export async function capturePhotoForScan(): Promise<
  { ok: true; photo: Capture } | { ok: false; reason: "cancelled" | "permission" | "failed" }
> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: "permission" };

  const shot = await ImagePicker.launchCameraAsync({
    // Not base64 here: the original is the thing that is too big, and asking
    // for it doubles the memory before it is thrown away.
    quality: 0.8,
  });
  if (shot.canceled || !shot.assets?.[0]?.uri) return { ok: false, reason: "cancelled" };

  try {
    const context = ImageManipulator.manipulate(shot.assets[0].uri);
    // Width only: the height follows the aspect ratio, so a portrait shot of a
    // rack does not get squashed into a square.
    context.resize({ width: SCAN_LONG_EDGE });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.7,
      base64: true,
    });

    if (!result.base64) return { ok: false, reason: "failed" };
    return { ok: true, photo: { base64: result.base64, mimeType: "image/jpeg" } };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
