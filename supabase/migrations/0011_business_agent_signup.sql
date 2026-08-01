-- Business and field-agent signup.
--
-- Until now only organizations could self-register (0003_tenants.sql,
-- 0010_signup_rpc.sql). The signup role picker offers three paths, so the two
-- missing ones need their own tenant/profile tables and the same
-- one-transaction RPC treatment: create everything or nothing, so a failure
-- halfway through can't leave an auth user with no role assignment.

create type business_type_enum as enum (
  'repair_shop','electronics_retailer','scrap_dealer','it_reseller','refurbisher','other'
);
create type agent_vehicle_enum as enum ('car','van','box_truck','none');

create table businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  business_type business_type_enum not null,
  -- Nullable: sole proprietors operate on an SSN and have no EIN to give at
  -- signup. Collected during payout verification instead.
  ein           text,
  street        text not null,
  city          text not null,
  state         char(2) not null,
  zip           text not null,
  status        account_status_enum not null default 'pending_verification',
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  member_role role_enum not null,
  primary key (business_id, user_id)
);

-- An agent is a person, not a tenant, so this hangs off the profile rather
-- than getting an entity table of its own. Service area is where they can
-- work; it is deliberately not their home address.
create table agent_profiles (
  user_id             uuid primary key references profiles(id) on delete cascade,
  service_city        text not null,
  service_state       char(2) not null,
  service_zip         text not null,
  vehicle             agent_vehicle_enum not null,
  has_drivers_license boolean not null default false,
  created_at          timestamptz not null default now()
);

-- RLS, matching 0008_rls.sql. Every table in this schema is deny-by-default
-- and opens up only through explicit policies; a new table that skips this is
-- readable by anyone holding the anon key.
--
-- No insert/update policies on purpose: rows here are only ever created by the
-- signup RPCs, which are `security definer` and so bypass RLS. Anything a user
-- should be able to change about their own business comes later, through a
-- deliberate policy rather than a blanket one written before the screens exist.
alter table businesses       enable row level security;
alter table business_members enable row level security;
alter table agent_profiles   enable row level security;

-- security definer, and therefore RLS-exempt, on purpose: a policy ON
-- business_members cannot test membership with a subquery against
-- business_members itself -- that subquery is evaluated under the same policy
-- and Postgres aborts with "infinite recursion detected in policy". Reading
-- the table through a definer function breaks the cycle. It leaks nothing: it
-- answers only "is the *calling* user in this business", never who else is.
create or replace function is_business_member(p_business uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members where business_id = p_business and user_id = auth.uid()
  );
$$;

create policy business_read on businesses for select using (
  is_business_member(id)
  or has_role('platform_ops') or has_role('platform_support')
);

create policy business_members_read on business_members for select using (
  user_id = auth.uid()
  or is_business_member(business_id)
  or has_role('platform_ops') or has_role('platform_support')
);

-- An agent's service area and vehicle are personal data: their own row, plus
-- the platform staff who dispatch and verify them. Deliberately not readable
-- by organizations or businesses.
create policy agent_profiles_read on agent_profiles for select using (
  user_id = auth.uid()
  or has_role('platform_ops') or has_role('platform_support')
);

create or replace function create_business_with_owner(
  p_user_id uuid, p_full_name text, p_phone text, p_business_name text,
  p_business_type business_type_enum, p_ein text, p_street text, p_city text,
  p_state char(2), p_zip text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_business_id uuid;
begin
  insert into profiles (id, full_name, phone, status)
    values (p_user_id, p_full_name, p_phone, 'pending_verification');

  insert into businesses (name, business_type, ein, street, city, state, zip)
    values (p_business_name, p_business_type, nullif(p_ein, ''), p_street, p_city, p_state, p_zip)
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
    values (p_user_id, p_full_name, p_phone, 'pending_verification');

  insert into agent_profiles (user_id, service_city, service_state, service_zip, vehicle, has_drivers_license)
    values (p_user_id, p_service_city, p_service_state, p_service_zip, p_vehicle, p_has_drivers_license);

  -- scope 'self': an agent's authority covers their own assigned work, not a
  -- tenant. role_assignments' check constraint allows a null scope_id here.
  insert into role_assignments (user_id, role, scope_type, scope_id)
    values (p_user_id, 'field_agent', 'self', null);

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
    values (p_user_id, 'agent', p_user_id, 'agent.registered',
            jsonb_build_object('service_state', p_service_state));

  return p_user_id;
end;
$$;
