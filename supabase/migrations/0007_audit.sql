create table audit_events (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles(id),
  entity_type  text not null,
  entity_id    uuid,
  action       text not null,
  payload_json jsonb,
  created_at   timestamptz not null default now()
);
