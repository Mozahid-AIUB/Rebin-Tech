import { View } from "react-native";
import { AppText, AuthInput, authTokens } from "@rebin/ui";
import type { OrgSignupInput } from "@rebin/shared";
import { ORG_TYPE_OPTIONS } from "../../config/us-states";
import { DarkSelectField } from "./DarkSelectField";

type Props = {
  values: Partial<OrgSignupInput>;
  errors: Partial<Record<keyof OrgSignupInput, string>>;
  set: <K extends keyof OrgSignupInput>(k: K, v: OrgSignupInput[K]) => void;
};

export function Step1Org({ values, errors, set }: Props) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 2 }}>
        <AppText variant="h2" style={{ color: authTokens.text }}>1. Organization</AppText>
        <AppText variant="bodySm" style={{ color: authTokens.muted }}>Tell us who you are.</AppText>
      </View>
      <AuthInput
        label="Organization Name"
        placeholder="e.g. Dhaka Medical College"
        value={values.orgName ?? ""}
        onChangeText={(v) => set("orgName", v)}
        error={errors.orgName}
      />
      <DarkSelectField
        label="Organization Type"
        value={values.orgType ?? null}
        options={ORG_TYPE_OPTIONS}
        onSelect={(v) => set("orgType", v as OrgSignupInput["orgType"])}
        error={errors.orgType}
      />
    </View>
  );
}
