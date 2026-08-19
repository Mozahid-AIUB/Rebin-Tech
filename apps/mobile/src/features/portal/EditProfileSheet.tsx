import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, FormField, PillButton, tokens } from "@rebin/ui";

/**
 * Edit name and phone from the Me tab.
 *
 * A modal rather than a route: "Me" is shared verbatim by all three portals,
 * and a route would mean three identical `edit-profile.tsx` files (or a shared
 * one outside every portal's RoleGuard). The sheet keeps it to one component
 * that inherits whichever portal theme is already mounted.
 *
 * Only the two fields a user genuinely owns. Email is excluded because
 * changing it is an auth operation with its own re-verification flow, not a
 * profile edit; avatar is excluded because it comes from the OAuth provider
 * and there is no upload path (or storage bucket) yet.
 */
export function EditProfileSheet({
  visible,
  initialFullName,
  initialPhone,
  onClose,
  onSaved,
  save,
}: {
  visible: boolean;
  initialFullName: string;
  initialPhone: string;
  onClose: () => void;
  onSaved: () => void;
  save: (input: { fullName: string; phone: string | null }) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-seed each time it opens so a cancelled edit doesn't persist into the
  // next one, and so a save elsewhere is reflected.
  useEffect(() => {
    if (visible) {
      setFullName(initialFullName);
      setPhone(initialPhone);
      setError(null);
    }
  }, [visible, initialFullName, initialPhone]);

  async function onSave() {
    // Validated here as well as in the RPC: a round-trip to be told the name
    // is empty is a worse experience than an immediate message, and the RPC
    // check stays because the client is not a trust boundary.
    if (fullName.trim().length < 2) {
      setError("Full name is required");
      return;
    }
    if (phone && phone.length !== 10) {
      setError("Enter a 10-digit US phone number");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await save({ fullName: fullName.trim(), phone: phone || null });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(22,36,28,0.45)" }}>
        <View
          style={{
            backgroundColor: tokens.color.surface,
            borderTopLeftRadius: tokens.radius.sheet,
            borderTopRightRadius: tokens.radius.sheet,
            padding: tokens.space[4],
            // Anchored to the bottom of the window, which on Android sits
            // under the navigation bar -- without this the sheet's last
            // control is the one a gesture bar covers.
            paddingBottom: tokens.space[4] + insets.bottom,
            gap: tokens.space[3],
          }}
        >
          <AppText variant="h2">Edit profile</AppText>

          <FormField
            label="Full name"
            placeholder="Your full name"
            value={fullName}
            onChangeText={setFullName}
            error={error && fullName.trim().length < 2 ? error : undefined}
          />
          {/* FormField's own `mask` keeps state as bare digits and displays it
              formatted -- matching what the profiles table stores. */}
          <FormField
            label="Phone"
            placeholder="(555) 019-2345"
            value={phone}
            onChangeText={setPhone}
            mask="phone"
          />

          {error ? (
            <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{error}</AppText>
          ) : null}

          <PillButton label="Save changes" loading={saving} onPress={() => void onSave()} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onClose}
            style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <AppText variant="h3" tone="muted">Cancel</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
