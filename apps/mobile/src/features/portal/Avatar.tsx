import { Image, View } from "react-native";
import { AppText, usePortalTheme, tokens } from "@rebin/ui";

/** "Karim Rahman" -> "KR"; single names give one letter. */
function initialsOf(fullName: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : "";
  return (first + last).toUpperCase();
}

/**
 * Profile picture, with an initials fallback.
 *
 * The URL comes from `profiles.avatar_url`, which is populated from the
 * provider on Google/Apple sign-in. Those flows aren't wired yet (Task 16), so
 * today every password-signup account falls through to initials -- which is
 * why the fallback is a designed state rather than a grey placeholder person
 * icon. Note Apple only returns a name (never a photo), so initials stay the
 * permanent state for Apple users even after OAuth lands.
 */
export function Avatar({
  uri,
  fullName,
  size = 64,
}: {
  uri: string | null;
  fullName: string | null;
  size?: number;
}) {
  const { accent, accentSubtle } = usePortalTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityIgnoresInvertColors
        accessibilityLabel="Profile picture"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: tokens.color.border,
        }}
      />
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Profile initials ${initialsOf(fullName)}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: accentSubtle,
        borderWidth: 1,
        borderColor: accent,
      }}
    >
      <AppText variant="h2" style={{ color: accent, fontSize: size * 0.34 }}>
        {initialsOf(fullName)}
      </AppText>
    </View>
  );
}
