import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { scanInventoryPhoto } from "@rebin/api";
import { scanDisposition, scanResultSchema, type ScanItem } from "@rebin/shared";
import { AppText, Card, EmptyState, PillButton, tokens } from "@rebin/ui";
import { DEVICE_CATEGORY_OPTIONS } from "../../config/us-states";

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
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCapture() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera access is off. Turn it on in Settings to scan devices.");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      // The model reads a label fine at this size, and a full-resolution phone
      // photo is several megabytes to upload from a storeroom's signal.
      imageDimensions: { width: 1024, height: 1024 },
    } as ImagePicker.ImagePickerOptions);

    if (photo.canceled || !photo.assets?.[0]?.base64) return;

    setScanning(true);
    try {
      const raw = await scanInventoryPhoto(
        photo.assets[0].base64,
        photo.assets[0].mimeType ?? "image/jpeg",
      );
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
      <View style={{ flex: 1, backgroundColor: tokens.color.bg }}>
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <AppText variant="display">Scan devices</AppText>
          <AppText variant="bodySm" tone="secondary">
            One photo per device. We&apos;ll read the make, model and asset tag where they&apos;re
            legible.
          </AppText>

          <PillButton label="Take a photo" loading={scanning} onPress={() => void onCapture()} />

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
            gap: tokens.space[2],
            borderTopWidth: 1,
            borderTopColor: tokens.color.divider,
            backgroundColor: tokens.color.surface,
          }}
        >
          <PillButton
            label={items.length === 1 ? "Add 1 device" : `Add ${items.length} devices`}
            disabled={items.length === 0}
            onPress={() => onDone(items)}
          />
          <PillButton label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
