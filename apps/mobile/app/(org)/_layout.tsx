import { Stack } from "expo-router";
import { RoleGuard } from "../../src/components/RoleGuard";

export default function OrgLayout() {
  return (
    <RoleGuard portal="org">
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
