create table organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  org_type          org_type_enum not null,
  street            text not null,
  city              text not null,
  state             char(2) not null,
  zip               text not null,
  facility_timezone text not null default 'America/New_York',
  dock_access       boolean not null default false,
  status            account_status_enum not null default 'pending_verification',
  verified_at       timestamptz,
  created_at        timestamptz not null default now()
);

create table organization_members (
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  member_role role_enum not null,
  primary key (org_id, user_id)
);
