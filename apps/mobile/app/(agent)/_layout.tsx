import { Stack } from "expo-router";
import { RoleGuard } from "../../src/components/RoleGuard";

export default function AgentLayout() {
  return (
    <RoleGuard portal="agent">
      <Stack screenOptions={{ headerShown: false }} />
    </RoleGuard>
  );
}
