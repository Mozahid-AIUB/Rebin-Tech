import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import {
  getAgentDetail,
  getBusinessDetail,
  getOrganizationDetail,
  getProfileDetail,
  supabase,
  updateOwnProfile,
  useSessionStore,
  type AgentDetail,
  type BusinessDetail,
  type OrgDetail,
  type PostalAddress,
  type ProfileDetail,
} from "@rebin/api";
import { AppText, Card, PillButton, Screen, SectionHeader, tokens } from "@rebin/ui";
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
 * Only the contact block is editable, through the `update_own_profile` RPC
 * (migration 0013). The organization/business/agent blocks are read-only on
 * purpose: those rows describe a tenant rather than this user, and changing a
 * verified address or EIN is a verification-affecting action that belongs with
 * support until there's an admin flow for it.
 */
export function MeScreen() {
  const { userId, assignments, activeIndex } = useSessionStore();
  const { logout, pending } = useLogout();
  const active = assignments[activeIndex];

  const [email, setEmail] = useState<string | null>(null);
  // Set on Google/Apple sign-in, before anything has been written to
  // profiles.avatar_url. Used only as a fallback so a stored avatar always wins.
  const [oauthAvatar, setOauthAvatar] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // Email lives on the auth user, not on `profiles`.
      const [{ data: userData }, profileRow] = await Promise.all([
        supabase.auth.getUser(),
        getProfileDetail(userId),
      ]);
      setEmail(userData.user?.email ?? null);
      // Google puts it in `picture`, Supabase normalises to `avatar_url` for
      // most providers -- accept either. Apple returns neither: it never
      // shares a photo, so those accounts stay on initials.
      const meta = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
      const picture = meta.avatar_url ?? meta.picture;
      setOauthAvatar(typeof picture === "string" ? picture : null);
      setProfile(profileRow);

      const scopeId = active?.scopeId ?? null;
      if (active?.scopeType === "organization" && scopeId) {
        const org = await getOrganizationDetail(scopeId);
        setDetail(org ? { kind: "organization", org } : null);
      } else if (active?.scopeType === "business" && scopeId) {
        const business = await getBusinessDetail(scopeId);
        setDetail(business ? { kind: "business", business } : null);
      } else if (active?.role.startsWith("field_")) {
        const agent = await getAgentDetail(userId);
        setDetail(agent ? { kind: "agent", agent } : null);
      } else {
        setDetail(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your details.");
    } finally {
      setLoading(false);
    }
  }, [userId, active?.scopeType, active?.scopeId, active?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      {/* No "Me" title: the tab bar already labels this screen, and the
          profile card below identifies whose it is far better than the word
          does. */}
      <Card style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[3] }}>
        <Avatar uri={profile?.avatarUrl ?? oauthAvatar} fullName={profile?.fullName ?? null} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="h2">{profile?.fullName ?? "—"}</AppText>
          {email ? <AppText variant="bodySm" tone="muted">{email}</AppText> : null}
        </View>
      </Card>

      {error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your details</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={() => void load()} />
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
              </Card>
            </>
          ) : null}

          {detail?.kind === "business" ? (
            <>
              <SectionHeader title="Business" />
              <Card variant="alt" style={{ gap: tokens.space[2] }}>
                <Row label="Name" value={detail.business.name} />
                <Row label="Type" value={label(detail.business.businessType)} />
                <Row label="EIN" value={detail.business.ein ?? "Not provided"} />
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
          void load();
        }}
        save={updateOwnProfile}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log Out"
        accessibilityState={{ busy: pending }}
        onPress={() => void logout()}
        style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
      >
        <AppText variant="h3" style={{ color: tokens.color.danger }}>Log Out</AppText>
      </Pressable>
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
