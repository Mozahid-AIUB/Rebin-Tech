import { Stack } from "expo-router";
import { RoleGuard } from "../../src/components/RoleGuard";

export default function BizLayout() {
  return (
    <RoleGuard portal="business">
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
