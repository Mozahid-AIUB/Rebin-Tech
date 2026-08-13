import { useCallback, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useLoader } from "../../src/hooks/useLoader";
import {
  inviteOrgMember,
  listOrganizationInvitations,
  listOrganizationMembers,
  removeOrgMember,
  setOrgMemberRole,
  useSessionStore,
  type OrgInvitation,
  type OrgMember,
} from "@rebin/api";
import {
  AppText,
  Card,
  ChipSingleSelect,
  EmptyState,
  FormField,
  PillButton,
  Screen,
  SectionHeader,
  tokens,
} from "@rebin/ui";

// S31 + S32, on one screen. The plan splits them, but "who is on the team" and
// "add someone" are two paragraphs of content between them -- a screen each
// would be mostly navigation.

const ROLE_LABEL: Record<string, string> = {
  org_owner: "Owner",
  org_admin: "Admin",
  org_requester: "Requester",
};

// Owner is absent on purpose: migration 0019 refuses to create a second one,
// so offering it here would only produce an error.
const INVITABLE = [
  { value: "org_requester", label: "Requester" },
  { value: "org_admin", label: "Admin" },
] as const;

type InvitableRole = (typeof INVITABLE)[number]["value"];

export default function OrgTeam() {
  const router = useRouter();
  const { assignments, activeIndex } = useSessionStore();
  const active = assignments[activeIndex];
  const orgId = active?.scopeType === "organization" ? active.scopeId : null;
  const canManage = active?.role === "org_owner" || active?.role === "org_admin";

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("org_requester");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [code, setCode] = useState<{ email: string; value: string } | null>(null);

  const { loading, error, reload } = useLoader(
    useCallback(async () => {
      // RoleGuard should make this unreachable; saying so beats an
      // empty screen that reads as a brand-new account.
      if (!orgId) throw new Error("No organization is active for this account.");
      const [rows, pending] = await Promise.all([
        listOrganizationMembers(orgId),
        // Only owners and admins may read invitations; a requester viewing the
        // team should still see the team rather than one failed call.
        canManage ? listOrganizationInvitations(orgId) : Promise.resolve([]),
      ]);
      setMembers(rows);
      setInvitations(pending);
    }, [orgId, canManage]),
  );

  async function onInvite() {
    if (!orgId) return;
    setInviting(true);
    setInviteError(null);
    setAdded(null);
    setCode(null);
    try {
      const result = await inviteOrgMember(orgId, email.trim(), role);
      if (result.status === "added") {
        setAdded(email.trim());
      } else if (result.code) {
        setCode({ email: email.trim(), value: result.code });
      }
      setEmail("");
      reload();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Couldn't send that invite.");
    } finally {
      setInviting(false);
    }
  }

  async function onRemove(member: OrgMember) {
    if (!orgId) return;
    setInviteError(null);
    try {
      await removeOrgMember(orgId, member.userId);
      reload();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Couldn't remove that person.");
    }
  }

  async function onToggleRole(member: OrgMember) {
    if (!orgId) return;
    setInviteError(null);
    const next = member.memberRole === "org_admin" ? "org_requester" : "org_admin";
    try {
      await setOrgMemberRole(orgId, member.userId, next);
      reload();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Couldn't change that role.");
    }
  }

  return (
    <Screen>
      <AppText variant="display">Team</AppText>

      {loading ? (
        <AppText variant="body" tone="muted">Loading your team…</AppText>
      ) : error ? (
        <Card variant="alt" style={{ gap: tokens.space[2] }}>
          <AppText variant="h3">Couldn&apos;t load your team</AppText>
          <AppText variant="bodySm" tone="muted">{error}</AppText>
          <PillButton label="Try again" variant="secondary" onPress={reload} />
        </Card>
      ) : (
        <>
          <SectionHeader title="Members" />
          {members.map((member) => {
            const isOwner = member.memberRole === "org_owner";
            return (
              <Card key={member.userId} style={{ gap: tokens.space[2] }}>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText variant="h3">{member.fullName}</AppText>
                    <AppText variant="bodySm" tone="muted">{member.email}</AppText>
                  </View>
                  <AppText variant="label" tone="accent">
                    {ROLE_LABEL[member.memberRole] ?? member.memberRole}
                  </AppText>
                </View>

                {/* The owner's row has no controls at all: 0019 refuses to
                    change or remove it, so buttons here could only ever fail. */}
                {canManage && !isOwner ? (
                  <View style={{ flexDirection: "row", gap: tokens.space[2] }}>
                    <PillButton
                      label={member.memberRole === "org_admin" ? "Make requester" : "Make admin"}
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => void onToggleRole(member)}
                    />
                    <PillButton
                      label={`Remove ${member.fullName}`}
                      variant="ghost"
                      fullWidth={false}
                      onPress={() => void onRemove(member)}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}

          {canManage && invitations.length > 0 ? (
            <>
              <SectionHeader title="Invited, not joined yet" />
              {invitations.map((invite) => (
                <Card key={invite.id} style={{ gap: 2 }}>
                  <AppText variant="body">{invite.email}</AppText>
                  <AppText variant="bodySm" tone="muted">
                    {`${ROLE_LABEL[invite.role] ?? invite.role} · code expires ${new Date(
                      invite.expiresAt,
                    ).toLocaleDateString("en-US")}`}
                  </AppText>
                </Card>
              ))}
            </>
          ) : null}

          {canManage ? (
            <>
              <SectionHeader title="Add someone" />
              <Card style={{ gap: tokens.space[3] }}>
                <FormField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  placeholder="colleague@yourorg.org"
                />
                <View style={{ gap: tokens.space[1] }}>
                  <AppText variant="label" tone="muted">ROLE</AppText>
                  <ChipSingleSelect
                    options={INVITABLE}
                    value={role}
                    onChange={(v) => setRole(v as InvitableRole)}
                  />
                  <AppText variant="bodySm" tone="muted">
                    {role === "org_admin"
                      ? "Can book pickups, manage the team and edit organization details."
                      : "Can book and track pickups."}
                  </AppText>
                </View>
                <PillButton
                  label="Send invite"
                  loading={inviting}
                  disabled={email.trim().length === 0}
                  onPress={() => void onInvite()}
                />

                {inviteError ? (
                  <AppText variant="bodySm" style={{ color: tokens.color.danger }}>{inviteError}</AppText>
                ) : null}
                {added ? (
                  <AppText variant="bodySm" tone="accent">{`${added} was added to the team.`}</AppText>
                ) : null}
              </Card>
            </>
          ) : null}

          {/* Shown rather than emailed, because nothing here sends email yet --
              the inviter passes it on. A quiet "invitation sent" would strand
              the person waiting for a message that never arrives. */}
          {code ? (
            <Card variant="warm" style={{ gap: tokens.space[2] }}>
              <AppText variant="h3">Send them this code</AppText>
              <AppText variant="bodySm" tone="secondary">
                {`${code.email} doesn't have an account yet. They sign up, then enter this code to join your team.`}
              </AppText>
              <AppText variant="display">{code.value}</AppText>
              <AppText variant="bodySm" tone="muted">
                Valid for 14 days. It won&apos;t be shown again — invite them again for a new one.
              </AppText>
            </Card>
          ) : null}

          {members.length === 0 ? (
            <EmptyState title="No members yet" body="Invite a colleague to book pickups with you." />
          ) : null}
        </>
      )}

      <PillButton label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
