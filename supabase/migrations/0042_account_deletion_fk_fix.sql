-- 0041 archives a profile and writes an audit_events row referencing it, then
-- the delete-account edge function calls auth.admin.deleteUser(), which
-- cascades into profiles (0002: profiles.id references auth.users(id) on
-- delete cascade). That cascade was blocked on every single call: every
-- table below references profiles(id) with no `on delete` clause, which
-- Postgres defaults to NO ACTION -- and delete_own_account()'s own last
-- statement guarantees an audit_events row exists first. The result was not
-- an edge case: every "Delete Account" tap raised a foreign-key violation
-- (23503), leaving the profile archived and scrubbed but the auth.users row
-- (and the ability to log in) fully intact -- worse than either a working
-- delete or no delete at all.
--
-- 0041's own comment already stated the intended design: "profiles is
-- archived and scrubbed, never dropped, because quotes, pickups and
-- audit_events all reference profiles.id as an actor... this business
-- already treats that history as its own record." That intent was never
-- backed by the schema. This migration makes it true:
--
--   * profiles no longer cascades away when its auth.users row is deleted.
--     A profiles row is the durable historical actor record; it must
--     survive the login credential that once pointed at it.
--   * The nullable actor/author columns that referenced profiles(id) are
--     changed to `on delete set null`, so a deleted user's audit trail,
--     granted-by, invited-by, paid-by, resolved-by, and published-by
--     history is preserved with the actor cleared, not blocked or lost.
--   * quotes.created_by, pickup_requests.created_by, and
--     job_assignments.agent_id are NOT NULL and describe who a
--     transaction was with or who did the work -- they cannot be
--     nulled without misrepresenting history, so with the cascade above
--     removed, their existing NO ACTION default now does exactly what it
--     should: profiles no longer disappears out from under them, so
--     there is nothing left to block.
--
-- Constraint names below are Postgres's defaults (`<table>_<column>_fkey`),
-- confirmed against every migration that created them (0002, 0005, 0007,
-- 0021, 0023, 0024, 0030, 0038) -- none of those tables named its
-- constraint explicitly.

alter table profiles
  drop constraint profiles_id_fkey;

alter table audit_events
  drop constraint audit_events_actor_id_fkey,
  add  constraint audit_events_actor_id_fkey
       foreign key (actor_id) references profiles(id) on delete set null;

alter table role_assignments
  drop constraint role_assignments_granted_by_fkey,
  add  constraint role_assignments_granted_by_fkey
       foreign key (granted_by) references profiles(id) on delete set null;

alter table invitations
  drop constraint invitations_invited_by_fkey,
  add  constraint invitations_invited_by_fkey
       foreign key (invited_by) references profiles(id) on delete set null;

alter table price_catalog_versions
  drop constraint price_catalog_versions_published_by_fkey,
  add  constraint price_catalog_versions_published_by_fkey
       foreign key (published_by) references profiles(id) on delete set null;

alter table payouts
  drop constraint payouts_paid_by_fkey,
  add  constraint payouts_paid_by_fkey
       foreign key (paid_by) references profiles(id) on delete set null;

alter table job_assignments
  drop constraint job_assignments_resolved_by_fkey,
  add  constraint job_assignments_resolved_by_fkey
       foreign key (resolved_by) references profiles(id) on delete set null;

comment on constraint audit_events_actor_id_fkey on audit_events is
  'set null, not restrict: a deleted user''s audit history must survive them.';
