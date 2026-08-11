import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { appraisePhoto, type Appraisal, type AppraisedLine } from "@rebin/api";
import { formatCents, scanDisposition } from "@rebin/shared";
import { AppText, Card, EmptyState, PillButton, tokens } from "@rebin/ui";

// S35-S37. Same camera and the same "one still per subject" flow as the
// organization's inventory sheet, with one decisive difference: every line
// carries a price, and that price comes from the catalog rather than from the
// model (plan §6). The Edge Function attaches it, so nothing here can be
// talked into a different number by a photograph.

export function AppraisalScanSheet({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: (appraisal: Appraisal) => void;
}) {
  const [lines, setLines] = useState<AppraisedLine[]>([]);
  const [catalogVersionId, setCatalogVersionId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  async function onCapture() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera access is off. Turn it on in Settings to scan your stock.");
      return;
    }

    const photo = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      imageDimensions: { width: 1024, height: 1024 },
    } as ImagePicker.ImagePickerOptions);
    if (photo.canceled || !photo.assets?.[0]?.base64) return;

    setScanning(true);
    try {
      const result = await appraisePhoto(
        photo.assets[0].base64,
        photo.assets[0].mimeType ?? "image/jpeg",
      );
      if (result.items.length === 0) {
        setError("Nothing we buy showed up in that photo. Try another angle.");
        return;
      }
      setLines((prev) => [...prev, ...result.items]);
      // Every line in one quote has to be priced against one catalog, so the
      // first scan fixes the version the rest are read against.
      setCatalogVersionId((prev) => prev ?? result.catalogVersionId);
    } catch (e) {
      // Lines already priced stay: losing four confirmed items because the
      // fifth photo failed would be its own bug.
      setError(e instanceof Error ? e.message : "Couldn't read that photo.");
    } finally {
      setScanning(false);
    }
  }

  function removeAt(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: tokens.color.bg }}>
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <AppText variant="display">Scan your stock</AppText>
          <AppText variant="bodySm" tone="secondary">
            Photograph what you have. We&apos;ll identify it, grade it, and price it against
            today&apos;s catalog.
          </AppText>

          <PillButton label="Take a photo" loading={scanning} onPress={() => void onCapture()} />

          {error ? (
            <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText>
          ) : null}

          {lines.length === 0 ? (
            <EmptyState
              title="Nothing scanned yet"
              body="Photograph a batch and we'll quote it."
            />
          ) : (
            lines.map((line, index) => (
              <Card key={`${line.componentKey}-${line.grade}-${index}`} style={{ gap: tokens.space[1] }}>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <AppText variant="h3">{line.displayName}</AppText>
                  <AppText variant="h3" tone="accent">{formatCents(line.lineTotalCents)}</AppText>
                </View>
                <AppText variant="bodySm" tone="muted">
                  {`${line.quantity} × ${formatCents(line.unitPriceCents)} · ${line.grade}`}
                </AppText>
                {line.notes ? (
                  <AppText variant="bodySm" tone="secondary">{line.notes}</AppText>
                ) : null}

                {/* A grade the model was unsure of is worth real money, so it
                    is called out to be argued with rather than accepted. */}
                {scanDisposition(line.confidence) !== "auto" ? (
                  <AppText variant="label" style={{ color: tokens.color.warning }}>
                    Check this one
                  </AppText>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${line.displayName}`}
                  onPress={() => removeAt(index)}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <AppText variant="bodySm" style={{ color: tokens.color.danger }}>Remove</AppText>
                </Pressable>
              </Card>
            ))
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText variant="body" tone="muted">Estimated offer</AppText>
            <AppText variant="display">{formatCents(totalCents)}</AppText>
          </View>
          <PillButton
            label="Use this quote"
            disabled={lines.length === 0}
            onPress={() => onDone({ items: lines, totalCents, catalogVersionId })}
          />
          <PillButton label="Cancel" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
