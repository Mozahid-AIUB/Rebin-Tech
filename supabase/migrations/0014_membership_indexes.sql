-- Indexes for the lookups RLS performs on every request.
--
-- The membership tables are keyed (tenant_id, user_id), which serves "who is
-- in this org" but not "which orgs is this user in" -- and the latter is what
-- every policy asks:
--
--   org_read:  id in (select org_id from organization_members where user_id = auth.uid())
--   is_org_member / is_business_member: same shape
--
-- With user_id as the second column of the composite key, those run as
-- sequential scans. Invisible at ten members, a per-request table scan at ten
-- thousand -- and it is on the path of literally every authenticated read.
create index organization_members_user_idx on organization_members (user_id);
create index business_members_user_idx     on business_members (user_id);

-- req_read's first branch is `created_by = auth.uid()`. pickup_requests_org_idx
-- (org_id, created_at desc) covers the org listing but not this.
create index pickup_requests_created_by_idx on pickup_requests (created_by);

-- Audit is append-only and grows without bound; the two questions asked of it
-- are "what did this actor do" and "what happened to this entity".
create index audit_events_actor_idx  on audit_events (actor_id, created_at desc);
create index audit_events_entity_idx on audit_events (entity_type, entity_id, created_at desc);
