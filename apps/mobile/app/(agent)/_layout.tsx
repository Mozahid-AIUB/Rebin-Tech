import { RoleGuard } from "../../src/components/RoleGuard";
import { PortalTabs } from "../../src/features/portal/PortalTabs";
import { HistoryIcon, ListIcon, PersonIcon } from "../../src/features/portal/TabIcons";

// The agent's first tab is Dispatch, not Home: a field agent opens this app to
// see what they have to do next, not to read a summary. `resolveInitialRoute`
// already sends them to /(agent)/dispatch for the same reason.
//
// The full 17-screen agent flow (S49-S65) is phase P2; these three are the
// frame. Note "history" is deliberately not "earnings" -- payout math doesn't
// exist until P3/P4, and a money tab that can only show $0.00 is worse than
// no money tab.
const TABS = [
  { name: "dispatch", title: "Dispatch", Icon: ListIcon },
  { name: "history", title: "History", Icon: HistoryIcon },
  { name: "me", title: "Me", Icon: PersonIcon },
] as const;

export default function AgentLayout() {
  return (
    <RoleGuard portal="agent">
      <PortalTabs portal="agent" tabs={TABS} />
    </RoleGuard>
  );
}
