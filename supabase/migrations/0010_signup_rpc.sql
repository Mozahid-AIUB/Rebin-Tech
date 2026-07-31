create or replace function create_organization_with_owner(
  p_user_id uuid, p_full_name text, p_phone text, p_org_name text,
  p_org_type org_type_enum, p_street text, p_city text, p_state char(2),
  p_zip text, p_dock_access boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_org_id uuid;
begin
  insert into profiles (id, full_name, phone, status)
    values (p_user_id, p_full_name, p_phone, 'pending_verification');

  insert into organizations (name, org_type, street, city, state, zip, dock_access)
    values (p_org_name, p_org_type, p_street, p_city, p_state, p_zip, p_dock_access)
    returning id into v_org_id;

  insert into organization_members (org_id, user_id, member_role)
    values (v_org_id, p_user_id, 'org_owner');

  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (p_user_id, 'org_owner', 'organization', v_org_id);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
    values (p_user_id, 'organization', v_org_id, 'organization.registered', jsonb_build_object('org_name', p_org_name));

  return v_org_id;
end;
$$;
