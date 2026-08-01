import { RoleGuard } from "../../src/components/RoleGuard";
import { PortalTabs } from "../../src/features/portal/PortalTabs";
import { HomeIcon, PersonIcon, TagIcon } from "../../src/features/portal/TabIcons";

// Same three-tab shape as the org portal so the app reads as one product:
// where you are, what you have in flight, and you. The business portal's full
// screen set (S34, S38-S48: quotes, tier select, shipping labels, payouts) is
// phase P4 -- these three are the frame it lands in.
const TABS = [
  { name: "dashboard", title: "Home", Icon: HomeIcon },
  { name: "quotes", title: "Quotes", Icon: TagIcon },
  { name: "me", title: "Me", Icon: PersonIcon },
] as const;

export default function BizLayout() {
  return (
    <RoleGuard portal="business">
      <PortalTabs portal="business" tabs={TABS} />
    </RoleGuard>
  );
}
