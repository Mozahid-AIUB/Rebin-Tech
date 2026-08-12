import * as ImagePicker from "expo-image-picker";
import { SCAN_LONG_EDGE, resizeForScan } from "./resize";

export { SCAN_LONG_EDGE };

export type Capture = { base64: string; mimeType: string };

/**
 * Takes a photo and returns it small enough to send.
 *
 * A phone camera hands back a 12-megapixel image. Base64 of that runs to five
 * megabytes, which took twelve seconds to reach the scan function over a good
 * connection and considerably longer over a warehouse's -- long enough that
 * the person holding the phone concludes the button is broken and walks away.
 *
 * Resizing to 1024px on the long edge takes it to roughly 200KB. The model
 * reads a make, a model and an asset tag off that as well as off the original:
 * what it needs is a legible label, not megapixels.
 *
 * expo-image-picker cannot do this itself -- it has no resize option, which is
 * why the `imageDimensions` that used to sit in these call sites did nothing
 * at all.
 */
export async function capturePhotoForScan(): Promise<
  { ok: true; photo: Capture } | { ok: false; reason: "cancelled" | "permission" | "failed" }
> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: "permission" };

  const shot = await ImagePicker.launchCameraAsync({
    // base64 is asked for as a fallback, not as the plan: resizeForScan
    // returns a far smaller string when the native module is present, and this
    // is what is left when it is not.
    base64: true,
    quality: 0.6,
  });
  const asset = shot.assets?.[0];
  if (shot.canceled || !asset?.uri) return { ok: false, reason: "cancelled" };

  const resized = await resizeForScan(asset.uri);
  if (resized) return { ok: true, photo: { base64: resized, mimeType: "image/jpeg" } };

  // The full-size original. Slow, but a slow scan beats a dead button.
  if (asset.base64) {
    return { ok: true, photo: { base64: asset.base64, mimeType: asset.mimeType ?? "image/jpeg" } };
  }
  return { ok: false, reason: "failed" };
}
