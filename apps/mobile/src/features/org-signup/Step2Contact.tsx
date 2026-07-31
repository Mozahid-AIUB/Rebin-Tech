import { View } from "react-native";
import { AppText, AuthInput, authTokens } from "@rebin/ui";
import type { OrgSignupInput } from "@rebin/shared";
import { applyMask, displayMask } from "./mask";

type Props = {
  values: Partial<OrgSignupInput>;
  errors: Partial<Record<keyof OrgSignupInput, string>>;
  set: <K extends keyof OrgSignupInput>(k: K, v: OrgSignupInput[K]) => void;
};

export function Step2Contact({ values, errors, set }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <AppText variant="h2" style={{ color: authTokens.text }}>2. Contact</AppText>
        <AppText variant="bodySm" style={{ color: authTokens.muted }}>Who should we coordinate pickups with?</AppText>
      </View>
      <AuthInput
        label="Primary Contact Name"
        placeholder="Dr. Jane Khan"
        value={values.contactName ?? ""}
        onChangeText={(v) => set("contactName", v)}
        error={errors.contactName}
        autoCapitalize="words"
      />
      <AuthInput
        label="Contact Title"
        placeholder="Facilities Director"
        value={values.contactTitle ?? ""}
        onChangeText={(v) => set("contactTitle", v)}
        error={errors.contactTitle}
        autoCapitalize="words"
      />
      <AuthInput
        label="Work Email"
        placeholder="you@organization.org"
        value={values.workEmail ?? ""}
        onChangeText={(v) => set("workEmail", v)}
        error={errors.workEmail}
        keyboardType="email-address"
      />
      <AuthInput
        label="Phone Number"
        placeholder="(555) 555-5555"
        value={displayMask(values.phone ?? "", "phone")}
        onChangeText={(raw) => set("phone", applyMask(raw, "phone"))}
        error={errors.phone}
        keyboardType="phone-pad"
      />
    </View>
  );
}
