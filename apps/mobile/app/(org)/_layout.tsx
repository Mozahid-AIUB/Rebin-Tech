import { RoleGuard } from "../../src/components/RoleGuard";
import { PortalTabs } from "../../src/features/portal/PortalTabs";
import { HomeIcon, ListIcon, PersonIcon } from "../../src/features/portal/TabIcons";

// Three tabs, not the plan's four-tile quick-access grid: Requests is the only
// one of Requests/Team/Certificates/Catalog with a real data source today, and
// a nav bar is the wrong place to advertise screens that don't exist. Team and
// Certificates join the portal when their backends land (roadmap steps 3 and 5).
const TABS = [
  { name: "dashboard", title: "Home", Icon: HomeIcon },
  { name: "requests", title: "Requests", Icon: ListIcon },
  { name: "me", title: "Me", Icon: PersonIcon },
] as const;

export default function OrgLayout() {
  return (
    <RoleGuard portal="org">
      {/* The booking wizard is pushed from the dashboard, not tabbed to. */}
      <PortalTabs portal="org" tabs={TABS} hidden={["request/new"]} />
    </RoleGuard>
  );
}
