import { View } from "react-native";
import { AppText, AuthInput, authTokens } from "@rebin/ui";
import type { OrgSignupInput } from "@rebin/shared";
import { US_STATES } from "../../config/us-states";
import { DarkSelectField } from "./DarkSelectField";
import { DarkToggleRow } from "./DarkToggleRow";
import { applyMask } from "./mask";

type Props = {
  values: Partial<OrgSignupInput>;
  errors: Partial<Record<keyof OrgSignupInput, string>>;
  set: <K extends keyof OrgSignupInput>(k: K, v: OrgSignupInput[K]) => void;
};

export function Step3Facility({ values, errors, set }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <AppText variant="h2" style={{ color: authTokens.text }}>3. Facility</AppText>
        <AppText variant="bodySm" style={{ color: authTokens.muted }}>Where should our agent arrive?</AppText>
      </View>
      <AuthInput
        label="Facility Pickup Address"
        placeholder="Street address"
        value={values.street ?? ""}
        onChangeText={(v) => set("street", v)}
        error={errors.street}
      />
      <AuthInput
        label="City"
        placeholder="City"
        value={values.city ?? ""}
        onChangeText={(v) => set("city", v)}
        error={errors.city}
        autoCapitalize="words"
      />
      <DarkSelectField
        label="State"
        value={values.state ?? null}
        options={US_STATES}
        onSelect={(v) => set("state", v)}
        error={errors.state}
      />
      <AuthInput
        label="ZIP Code"
        placeholder="12345"
        value={values.zip ?? ""}
        onChangeText={(raw) => set("zip", applyMask(raw, "zip"))}
        error={errors.zip}
        keyboardType="number-pad"
      />
      <DarkToggleRow
        label="Loading Dock Access?"
        description="Select Yes if freight trucks can back into the dock"
        value={values.dockAccess ?? false}
        onValueChange={(v) => set("dockAccess", v)}
      />
      <View style={{ gap: 6 }}>
        <AuthInput
          label="Create Password"
          placeholder="At least 10 characters"
          value={values.password ?? ""}
          onChangeText={(v) => set("password", v)}
          error={errors.password}
          secure
        />
        {!errors.password ? (
          <AppText variant="bodySm" style={{ color: authTokens.muted }}>
            At least 10 characters, with a number and a symbol
          </AppText>
        ) : null}
      </View>
      <AuthInput
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={values.confirmPassword ?? ""}
        onChangeText={(v) => set("confirmPassword", v)}
        error={errors.confirmPassword}
        secure
      />
    </View>
  );
}
