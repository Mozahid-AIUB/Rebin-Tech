create table pickup_requests (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations(id) on delete cascade,
  created_by           uuid not null references profiles(id),
  size_tier            size_tier_enum not null,
  unit_count           integer not null check (unit_count >= 10),
  categories           device_category_enum[] not null check (array_length(categories, 1) >= 1),
  window_start         timestamptz not null,
  window_end           timestamptz not null check (window_end > window_start),
  timezone             text not null,
  on_site_contact_name  text not null,
  on_site_contact_phone text not null,
  dock_address         text not null,
  instructions         text not null default '',
  status               request_status_enum not null default 'pending',
  created_at           timestamptz not null default now()
);

create index pickup_requests_org_idx on pickup_requests (org_id, created_at desc);
