-- Accounts are usable the moment they are created.
--
-- Every signup landed on 'pending_verification' (0010, 0011) and the app
-- showed a "Verification in review" notice -- but nothing was ever gated on
-- it. No policy checked status, so a pending organization could already book
-- pickups; the state only ever produced a banner telling a working account it
-- was not working yet.
--
-- Rather than build the review queue the banner implied, the product decision
-- is to drop the gate: signup grants access.
--
-- The status column stays. account_status_enum still carries 'suspended',
-- 'rejected' and 'archived', and 0015's set_*_status functions still move
-- accounts between them -- what changes is only where a new account starts.
-- That matters for the two cases where verification is not optional and will
-- need building deliberately rather than inherited by accident:
--   * businesses, once payouts are wired -- money leaves the company
--   * field agents, who are dispatched to customer sites
-- Both should gate the specific action (first payout, first dispatch), not
-- the front door.

alter table profiles      alter column status set default 'active';
alter table organizations alter column status set default 'active';
alter table businesses    alter column status set default 'active';

-- The signup RPCs pass the status explicitly, so the defaults above do not
-- reach them. Each is restated here in full: `create or replace` has no
-- partial form, and a trimmed copy would silently drop the rest of the
-- transaction.
create or replace function create_organization_with_owner(
  p_user_id uuid, p_full_name text, p_phone text, p_org_name text,
  p_org_type org_type_enum, p_street text, p_city text, p_state char(2),
  p_zip text, p_dock_access boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_org_id uuid;
begin
  insert into profiles (id, full_name, phone, status)
    values (p_user_id, p_full_name, p_phone, 'active');

  insert into organizations (name, org_type, street, city, state, zip, dock_access, status, verified_at)
    values (p_org_name, p_org_type, p_street, p_city, p_state, p_zip, p_dock_access, 'active', now())
    returning id into v_org_id;

  insert into organization_members (org_id, user_id, member_role)
    values (v_org_id, p_user_id, 'org_owner');

  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (p_user_id, 'org_owner', 'organization', v_org_id);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
    values (p_user_id, 'organization', v_org_id, 'organization.registered',
            jsonb_build_object('org_name', p_org_name));

  return v_org_id;
end;
$$;

create or replace function create_business_with_owner(
  p_user_id uuid, p_full_name text, p_phone text, p_business_name text,
  p_business_type business_type_enum, p_ein text, p_street text, p_city text,
  p_state char(2), p_zip text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_business_id uuid;
begin
  insert into profiles (id, full_name, phone, status)
    values (p_user_id, p_full_name, p_phone, 'active');

  -- verified_at stays null: the business can trade immediately, but nothing
  -- here has checked an EIN, and the payout flow should read this rather than
  -- assume an active account was ever looked at.
  insert into businesses (name, business_type, ein, street, city, state, zip, status)
    values (p_business_name, p_business_type, nullif(p_ein, ''), p_street, p_city, p_state, p_zip, 'active')
    returning id into v_business_id;

  insert into business_members (business_id, user_id, member_role)
    values (v_business_id, p_user_id, 'biz_owner');

  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (p_user_id, 'biz_owner', 'business', v_business_id);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
    values (p_user_id, 'business', v_business_id, 'business.registered',
            jsonb_build_object('business_name', p_business_name));

  return v_business_id;
end;
$$;

create or replace function create_field_agent(
  p_user_id uuid, p_full_name text, p_phone text, p_service_city text,
  p_service_state char(2), p_service_zip text, p_vehicle agent_vehicle_enum,
  p_has_drivers_license boolean
) returns uuid language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone, status)
    values (p_user_id, p_full_name, p_phone, 'active');

  insert into agent_profiles (user_id, service_city, service_state, service_zip, vehicle, has_drivers_license)
    values (p_user_id, p_service_city, p_service_state, p_service_zip, p_vehicle, p_has_drivers_license);

  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (p_user_id, 'field_agent', 'self', null);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
    values (p_user_id, 'agent', p_user_id, 'agent.registered',
            jsonb_build_object('service_state', p_service_state));

  return p_user_id;
end;
$$;

-- Accounts created before this migration are stranded behind a review queue
-- that no longer exists, so they are released too.
update profiles      set status = 'active' where status = 'pending_verification';
update organizations set status = 'active', verified_at = coalesce(verified_at, now())
  where status = 'pending_verification';
update businesses    set status = 'active' where status = 'pending_verification';
