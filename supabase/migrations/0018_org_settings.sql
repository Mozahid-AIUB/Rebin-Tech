-- Editing an organization's own details (S33).
--
-- organizations had no UPDATE path at all: an org that moved buildings, or
-- typed its dock address wrong at signup, could never fix it.
--
-- An RPC rather than an UPDATE policy, for the reason 0015 spells out: a
-- policy grants the whole row, and `status` and `verified_at` live on this
-- table. An org admin who could write their own row could mark their account
-- active or stamp itself verified. The function takes only the fields a
-- customer owns, so those two are unreachable by construction.
create or replace function update_own_organization(
  p_org_id      uuid,
  p_name        text,
  p_org_type    org_type_enum,
  p_street      text,
  p_city        text,
  p_state       char(2),
  p_zip         text,
  p_dock_access boolean,
  p_facility_timezone text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  -- Owners and admins, not requesters: booking a pickup and changing the
  -- address every future pickup arrives at are different levels of authority.
  if not (has_role('org_owner', p_org_id) or has_role('org_admin', p_org_id)) then
    raise exception 'Only an organization owner or admin can change these details'
      using errcode = '42501';
  end if;

  if length(trim(p_name)) < 2 then
    raise exception 'Organization name is required' using errcode = '22023';
  end if;
  if length(trim(p_street)) < 3 or length(trim(p_city)) < 2 then
    raise exception 'A street address and city are required' using errcode = '22023';
  end if;
  if p_zip !~ '^\d{5}(\d{4})?$' then
    raise exception 'Enter a valid ZIP code' using errcode = '22023';
  end if;

  update organizations
     set name        = trim(p_name),
         org_type    = p_org_type,
         street      = trim(p_street),
         city        = trim(p_city),
         state       = p_state,
         zip         = p_zip,
         dock_access = p_dock_access,
         -- Null means "leave it alone": the settings form does not offer a
         -- timezone picker yet, and passing the column's default back in
         -- would silently reset an org that had been corrected by hand.
         facility_timezone = coalesce(p_facility_timezone, facility_timezone)
   where id = p_org_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'organization', p_org_id, 'organization.updated',
          jsonb_build_object('name', trim(p_name), 'city', trim(p_city)));
end;
$$;
