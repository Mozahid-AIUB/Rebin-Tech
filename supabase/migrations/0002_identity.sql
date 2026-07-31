create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  avatar_url  text,
  status      account_status_enum not null default 'pending_verification',
  created_at  timestamptz not null default now()
);

create table role_assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  role        role_enum   not null,
  scope_type  scope_enum  not null,
  scope_id    uuid,
  granted_by  uuid references profiles(id),
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  check (scope_type = 'platform' or scope_type = 'self' or scope_id is not null)
);

create unique index role_assignments_active_uniq
  on role_assignments (user_id, role, coalesce(scope_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where revoked_at is null;

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  role        role_enum not null,
  scope_id    uuid,
  token_hash  text not null unique,
  invited_by  uuid references profiles(id),
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
