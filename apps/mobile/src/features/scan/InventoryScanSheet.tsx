import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scanInventoryPhoto } from "@rebin/api";
import { scanDisposition, scanResultSchema, type ScanItem } from "@rebin/shared";
import { AppText, Card, EmptyState, PillButton, tokens } from "@rebin/ui";
import { DEVICE_CATEGORY_OPTIONS } from "../../config/us-states";
import { capturePhotoForScan } from "./capture";

// S25, the optional inventory scan inside the booking wizard.
//
// expo-image-picker rather than the plan's react-native-vision-camera: this
// mode takes one still per device and sends it away, so frame processors buy
// nothing here, and image-picker runs without a custom dev build. The agent's
// continuous multi-scan (S53) is the flow that genuinely needs vision-camera.
//
// Inventory mode never shows a price -- identification and asset tags only.
// Pricing belongs to the business appraisal flow and comes from the catalog.

function categoryLabel(value: string): string {
  return DEVICE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** "Dell OptiPlex 7090", "Dell", or the category when neither was legible. */
function describe(item: ScanItem): string {
  const parts = [item.make, item.model].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : categoryLabel(item.deviceCategory);
}

export function InventoryScanSheet({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (items: ScanItem[]) => void;
}) {
  const [items, setItems] = useState<ScanItem[]>([]);
  const insets = useSafeAreaInsets();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCapture() {
    setError(null);
    const shot = await capturePhotoForScan();
    if (!shot.ok) {
      if (shot.reason === "permission") {
        setError("Camera access is off. Turn it on in Settings to scan devices.");
      } else if (shot.reason === "failed") {
        setError("Couldn't prepare that photo. Try again.");
      }
      return;
    }

    setScanning(true);
    try {
      const raw = await scanInventoryPhoto(shot.photo.base64, shot.photo.mimeType);
      // Parsed, not trusted: the Edge Function constrains Gemini with a
      // responseSchema, but this still arrived over a network.
      const parsed = scanResultSchema.safeParse(raw);
      if (!parsed.success) {
        setError("Couldn't read that photo. Try again, or add the device by hand.");
        return;
      }
      if (parsed.data.items.length === 0) {
        setError("No devices spotted in that photo. Try getting closer.");
        return;
      }
      setItems((prev) => [...prev, ...parsed.data.items]);
    } catch (e) {
      // Anything already found stays on the list -- losing four confirmed
      // devices because the fifth photo failed would be its own bug.
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
    } finally {
      setScanning(false);
    }
  }

  function removeAt(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.color.bg, paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <AppText variant="display">Scan devices</AppText>
          <AppText variant="bodySm" tone="secondary">
            One photo per device. We&apos;ll read the make, model and asset tag where they&apos;re
            legible.
          </AppText>

          <PillButton label="Take a photo" loading={scanning} onPress={() => void onCapture()} />

          {/* A spinner inside a button is easy to miss while someone is
              looking at the thing they just photographed. Reading a label off
              a photo takes a couple of seconds even on a good connection, and
              silence for that long reads as a broken button. */}
          {scanning ? (
            <AppText variant="bodySm" tone="accent" style={{ textAlign: "center" }}>
              Reading the photo…
            </AppText>
          ) : null}

          {error ? (
            <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText>
          ) : null}

          {items.length === 0 ? (
            <EmptyState
              title="Nothing scanned yet"
              body="Photograph a device and it will appear here."
            />
          ) : (
            items.map((item, index) => {
              const disposition = scanDisposition(item.confidence);
              return (
                <Card key={`${item.serial ?? "no-serial"}-${index}`} style={{ gap: tokens.space[1] }}>
                  <View
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <AppText variant="h3">{describe(item)}</AppText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${describe(item)}`}
                      onPress={() => removeAt(index)}
                      style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}
                    >
                      <AppText variant="bodySm" style={{ color: tokens.color.danger }}>Remove</AppText>
                    </Pressable>
                  </View>
                  <AppText variant="bodySm" tone="muted">
                    {`${categoryLabel(item.deviceCategory)}${item.serial ? ` · ${item.serial}` : ""}`}
                  </AppText>
                  {/* Anything the model was unsure of is called out rather than
                      folded in silently -- an unchecked serial on a compliance
                      manifest is worse than a missing one. */}
                  {disposition !== "auto" ? (
                    <AppText variant="label" style={{ color: tokens.color.warning }}>
                      Check this one
                    </AppText>
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>

        <View
          style={{
            padding: tokens.space[4],
            // The system navigation bar sits under this one; without the inset
            // the last button is half of one.
            paddingBottom: insets.bottom + tokens.space[4],
            gap: tokens.space[2],
            borderTopWidth: 1,
            borderTopColor: tokens.color.divider,
            backgroundColor: tokens.color.surface,
          }}
        >
          <PillButton
            // "Add 0 devices" is a sentence about nothing. A disabled button
            // should still say what it will do once it can.
            label={
              items.length === 0
                ? "Add to the request"
                : items.length === 1
                  ? "Add 1 device"
                  : `Add ${items.length} devices`
            }
            disabled={items.length === 0}
            onPress={() => onDone(items)}
          />
          <PillButton label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
