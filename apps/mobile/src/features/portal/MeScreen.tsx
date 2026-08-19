import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  getAgentDetail,
  getBusinessDetail,
  getOrganizationDetail,
  getProfileDetail,
  updateOwnProfile,
  useSessionStore,
  type AgentDetail,
  type BusinessDetail,
  type OrgDetail,
  type PostalAddress,
  type ProfileDetail,
} from "@rebin/api";
import { SUPPLIER_BUSINESS_TYPE } from "@rebin/shared";
import { AppText, Card, PillButton, Screen, SectionHeader, tokens } from "@rebin/ui";
import { useLoader } from "../../hooks/useLoader";
import { useLogout } from "../../hooks/useLogout";
import { Avatar } from "./Avatar";
import { EditProfileSheet } from "./EditProfileSheet";

const ROLE_LABEL: Record<string, string> = {
  org_owner: "Owner", org_admin: "Admin", org_requester: "Requester",
  biz_owner: "Owner", biz_staff: "Staff",
  field_agent: "Field Agent", field_lead: "Field Lead",
  platform_owner: "Platform Owner", platform_ops: "Operations",
  platform_finance: "Finance", platform_support: "Support",
};

const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  pending_verification: "Pending verification",
  active: "Active",
  suspended: "Suspended",
  rejected: "Rejected",
  archived: "Archived",
};

// Signup stores these as enum values; showing "k12_school" back to the person
// who picked "K-12 School" is the kind of raw-database leak that makes an app
// feel unfinished.
const ENUM_LABEL: Record<string, string> = {
  k12_school: "K-12 School",
  university: "University",
  hospital: "Hospital / Clinic",
  municipal_office: "Municipal Office",
  corporate_hq: "Corporate Headquarters",
  repair_shop: "Repair Shop",
  electronics_retailer: "Electronics Retailer",
  scrap_dealer: "Scrap Dealer",
  it_reseller: "IT Reseller",
  refurbisher: "Refurbisher",
  supplier: "Supplier",
  car: "Car",
  van: "Van",
  box_truck: "Box Truck",
  none: "No vehicle",
  other: "Other",
};

function label(value: string | null | undefined): string {
  if (!value) return "—";
  return ENUM_LABEL[value] ?? value;
}

/** Stored as 10 digits; shown the way it was typed. */
function formatPhone(digits: string | null): string {
  if (!digits || digits.length !== 10) return digits || "—";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatAddress(a: PostalAddress): string {
  return `${a.street}\n${a.city}, ${a.state} ${a.zip}`;
}

type Detail =
  | { kind: "organization"; org: OrgDetail }
  | { kind: "business"; business: BusinessDetail }
  | { kind: "agent"; agent: AgentDetail }
  | null;

/**
 * S71 "Me", shared by all three portals.
 *
 * Shows back everything the user entered at registration, grouped the way the
 * signup form asked for it -- this is the only place in the app where those
 * details are visible again, so leaving any of them out means the user has no
 * way to check what the account actually says.
 *
 * Which extra block renders depends on the active role's scope, because the
 * three signup flows genuinely collect different things (an agent has a
 * service area and a vehicle; an organization has a facility and dock access).
 *
 * The contact block is editable through the `update_own_profile` RPC
 * (migration 0013). The organization block links out to its own editor
 * (migration 0018's `update_own_organization`); the business and agent blocks
 * stay read-only until they have equivalents, since those rows describe a
 * tenant rather than this user.
 */
function asHref(path: string): Href {
  return path as Href;
}

export function MeScreen() {
  const router = useRouter();
  const { userId, email, oauthAvatarUrl, assignments, activeIndex } = useSessionStore();
  const { logout, pending } = useLogout();
  const active = assignments[activeIndex];

  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [detail, setDetail] = useState<Detail>(null);

  /**
   * Which tenant row belongs to the active role.
   *
   * Split out so it can be started alongside the profile read rather than
   * after it. The two share no data -- which row to fetch is decided by the
   * active assignment, which is in memory before any request goes out -- so
   * running them in sequence was two waits where one would do.
   */
  const loadDetail = useCallback(async (): Promise<Detail> => {
    if (!userId) return null;
    const scopeId = active?.scopeId ?? null;
    if (active?.scopeType === "organization" && scopeId) {
      const org = await getOrganizationDetail(scopeId);
      return org ? { kind: "organization", org } : null;
    }
    if (active?.scopeType === "business" && scopeId) {
      const business = await getBusinessDetail(scopeId);
      return business ? { kind: "business", business } : null;
    }
    if (active?.role.startsWith("field_")) {
      const agent = await getAgentDetail(userId);
      return agent ? { kind: "agent", agent } : null;
    }
    return null;
  }, [userId, active?.scopeType, active?.scopeId, active?.role]);

  const { loading, error, reload } = useLoader(
    useCallback(async () => {
      if (!userId) return;
      const [profileRow, detailRow] = await Promise.all([getProfileDetail(userId), loadDetail()]);
      setProfile(profileRow);
      setDetail(detailRow);
    }, [userId, loadDetail]),
  );

  return (
    <Screen>
      {/* No "Me" title: the tab bar already labels this screen, and the
          profile card below identifies whose it is far better than the word
          does. */}
      <Card style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[3] }}>
        <Avatar uri={profile?.avatarUrl ?? oauthAvatarUrl} fullName={profile?.fullName ?? null} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="h2">{profile?.fullName ?? "—"}</AppText>
          {email ? <AppText variant="bodySm" tone="muted">{email}</AppText> : null}
        </View>
      </Card>

      {error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your details</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={reload} />
        </Card>
      ) : loading ? (
        <AppText variant="body" tone="muted">Loading your details…</AppText>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <SectionHeader title="Contact" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              onPress={() => setEditing(true)}
              hitSlop={10}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <AppText variant="bodySm" tone="accent">Edit</AppText>
            </Pressable>
          </View>
          <Card variant="alt" style={{ gap: tokens.space[2] }}>
            <Row label="Full name" value={profile?.fullName ?? "—"} />
            <Row label="Email" value={email ?? "—"} />
            <Row label="Phone" value={formatPhone(profile?.phone ?? null)} />
          </Card>

          {detail?.kind === "organization" ? (
            <>
              <SectionHeader title="Organization" />
              <Card variant="alt" style={{ gap: tokens.space[2] }}>
                <Row label="Name" value={detail.org.name} />
                <Row label="Type" value={label(detail.org.orgType)} />
                <Row label="Pickup address" value={formatAddress(detail.org.address)} />
                <Row label="Loading dock" value={detail.org.dockAccess ? "Yes" : "No"} />
                {/* Only the org portal has an editor so far; the business and
                    agent equivalents come with their own settings screens. */}
                <PillButton
                  label="Edit organization"
                  variant="secondary"
                  onPress={() => router.push(asHref("/(org)/settings"))}
                />
                {/* (org)/team exists and works -- listing, roles, removal and
                    invites, all covered by tests -- but it is not linked yet.
                    Inviting someone without an account hands the inviter a
                    code, and nothing can redeem one: an invitee signing up
                    creates their own organization rather than joining this
                    one, so the loop needs a signup path of its own. Until
                    that exists, an invite button would produce a code that
                    goes nowhere. Restore this link with that path.
                    Single-operator organizations don't need the screen yet. */}
              </Card>
            </>
          ) : null}

          {detail?.kind === "business" ? (
            <>
              <SectionHeader title="Business" />
              <Card variant="alt" style={{ gap: tokens.space[2] }}>
                <Row label="Name" value={detail.business.name} />
                <Row label="Type" value={label(detail.business.businessType)} />
                {/* A supplier is never asked for an EIN at signup -- the role
                    collects e-waste rather than reselling it, so "Not
                    provided" here would misdescribe a field that was never
                    part of the form, not one the vendor skipped. */}
                {detail.business.businessType !== SUPPLIER_BUSINESS_TYPE ? (
                  <Row label="EIN" value={detail.business.ein ?? "Not provided"} />
                ) : null}
                <Row label="Address" value={formatAddress(detail.business.address)} />
              </Card>
            </>
          ) : null}

          {detail?.kind === "agent" ? (
            <>
              <SectionHeader title="Field work" />
              <Card variant="alt" style={{ gap: tokens.space[2] }}>
                <Row
                  label="Service area"
                  value={`${detail.agent.serviceCity}, ${detail.agent.serviceState} ${detail.agent.serviceZip}`}
                />
                <Row label="Vehicle" value={label(detail.agent.vehicle)} />
                <Row label="Driver's license" value={detail.agent.hasDriversLicense ? "Yes" : "No"} />
              </Card>
            </>
          ) : null}

          <SectionHeader title="Account" />
          <Card variant="alt" style={{ gap: tokens.space[2] }}>
            <Row label="Role" value={active ? ROLE_LABEL[active.role] ?? active.role : "—"} />
            <Row
              label="Status"
              value={profile ? ACCOUNT_STATUS_LABEL[profile.status] ?? profile.status : "—"}
            />
          </Card>

        </>
      )}

      <EditProfileSheet
        visible={editing}
        initialFullName={profile?.fullName ?? ""}
        initialPhone={profile?.phone ?? ""}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          reload();
        }}
        save={updateOwnProfile}
      />

      {/* Set apart, not stacked. This is the last thing on the screen and the
          only control on it with a consequence, so it gets air above it rather
          than sitting flush against the account rows like another field.

          It was bare red text before -- no edge, no press response, and no
          sign that anything was happening while the network call ran. A
          control that looks inert is one people press twice. */}
      <View style={{ height: tokens.space[4] }} />
      <PillButton
        label={pending ? "Signing out…" : "Log Out"}
        accessibilityLabel="Log Out"
        variant="quietDanger"
        loading={pending}
        haptic="none"
        onPress={() => void logout()}
      />
    </Screen>
  );
}

function Row({ label: rowLabel, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: tokens.space[3] }}>
      <AppText variant="bodySm" tone="muted">{rowLabel}</AppText>
      <AppText variant="bodySm" style={{ flex: 1, textAlign: "right" }}>{value}</AppText>
    </View>
  );
}
