-- The price catalog: what Rebin pays a business for each thing it buys.
--
-- Two rules shape this table, both from plan §6.
--
-- "AI never prices. It classifies; the catalog prices." The vision model
-- returns a component_key and a grade; what those are worth is looked up here.
-- So a rate change is one row, not a retrain, and every quote can be explained
-- in an audit by pointing at the row it came from.
--
-- Versioned, because a quote is a promise. A vendor quoted $80 on Monday and
-- accepting on Wednesday is owed $80, whatever copper did on Tuesday. Prices
-- are never edited in place: a new version is drafted, filled, and published,
-- and every quote pins the version it was priced against.

create type price_grade_enum as enum ('working', 'broken', 'parts');

-- Whole devices are priced per piece; scrap follows the metal markets and is
-- priced by weight. A single column rather than two tables -- the arithmetic
-- is `price x quantity` either way, only the meaning of "quantity" changes.
--
-- Only 'each' is populated to begin with: the camera can tell a working laptop
-- from a broken one, but no photograph reveals what a spool of wire weighs.
-- Weight rates arrive with the field agent's scale (S53-S57).
create type price_unit_enum as enum ('each', 'lb');

create table price_catalog_versions (
  id             uuid primary key default gen_random_uuid(),
  version        integer not null unique,
  status         text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  note           text,
  published_at   timestamptz,
  published_by   uuid references profiles(id),
  created_at     timestamptz not null default now()
);

-- Exactly one live catalog. Without this, "the current price" stops having an
-- answer the first time someone forgets to retire the old version.
create unique index price_catalog_one_active on price_catalog_versions (status)
  where status = 'active';

create table price_items (
  id                 uuid primary key default gen_random_uuid(),
  catalog_version_id uuid not null references price_catalog_versions(id) on delete cascade,
  -- The vocabulary the vision model is constrained to. Free text rather than
  -- an enum because adding a component must not require a migration -- the
  -- whole point of the catalog is that operations can change it.
  component_key      text not null,
  display_name       text not null,
  -- Groups items for browsing, reusing the categories organizations already
  -- pick from rather than inventing a second taxonomy.
  category           device_category_enum not null,
  grade              price_grade_enum not null,
  unit               price_unit_enum not null default 'each',
  unit_price_cents   integer not null check (unit_price_cents >= 0),
  created_at         timestamptz not null default now(),
  unique (catalog_version_id, component_key, grade)
);

create index price_items_version_idx on price_items (catalog_version_id, category);

alter table price_catalog_versions enable row level security;
alter table price_items enable row level security;

-- Published prices are public. The portal picker offers "Browse Price Catalog"
-- before anyone logs in (S02, S66), and a scrap buyer's rates are a shopfront,
-- not a secret. Drafts stay hidden -- an unpublished price is not an offer.
create policy price_versions_read_active on price_catalog_versions for select
  using (status = 'active' or is_platform_staff());

create policy price_items_read_active on price_items for select using (
  exists (
    select 1 from price_catalog_versions v
     where v.id = catalog_version_id
       and (v.status = 'active' or is_platform_staff())
  )
);

/**
 * Starts a new draft, copying the live prices as its starting point.
 *
 * Copying rather than starting empty: a rate change usually touches a handful
 * of rows, and an empty draft would mean retyping the entire catalog to alter
 * one line -- which is how a catalog ends up with things missing.
 */
create or replace function create_price_catalog_draft(p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_new    uuid;
  v_active uuid;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can change prices' using errcode = '42501';
  end if;

  insert into price_catalog_versions (version, status, note)
  values ((select coalesce(max(version), 0) + 1 from price_catalog_versions), 'draft', p_note)
  returning id into v_new;

  select id into v_active from price_catalog_versions where status = 'active';
  if v_active is not null then
    insert into price_items (catalog_version_id, component_key, display_name, category, grade, unit, unit_price_cents)
    select v_new, component_key, display_name, category, grade, unit, unit_price_cents
      from price_items where catalog_version_id = v_active;
  end if;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'price_catalog', v_new, 'price_catalog.drafted',
          jsonb_build_object('note', p_note));

  return v_new;
end;
$$;

/** Sets one price in a draft. Published versions are immutable. */
create or replace function set_price_item(
  p_version_id       uuid,
  p_component_key    text,
  p_display_name     text,
  p_category         device_category_enum,
  p_grade            price_grade_enum,
  p_unit             price_unit_enum,
  p_unit_price_cents integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can change prices' using errcode = '42501';
  end if;
  -- The published catalog is what quotes were priced against. Editing it would
  -- rewrite the past and make an accepted quote unexplainable.
  if not exists (select 1 from price_catalog_versions where id = p_version_id and status = 'draft') then
    raise exception 'Prices can only be set on a draft catalog' using errcode = '42501';
  end if;
  if p_unit_price_cents < 0 then
    raise exception 'A price cannot be negative' using errcode = '22023';
  end if;

  insert into price_items (catalog_version_id, component_key, display_name, category, grade, unit, unit_price_cents)
  values (p_version_id, p_component_key, p_display_name, p_category, p_grade, p_unit, p_unit_price_cents)
  on conflict (catalog_version_id, component_key, grade) do update
    set display_name     = excluded.display_name,
        category         = excluded.category,
        unit             = excluded.unit,
        unit_price_cents = excluded.unit_price_cents;
end;
$$;

/** Makes a draft live and retires whatever it replaces. */
create or replace function publish_price_catalog(p_version_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_items integer;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can publish prices' using errcode = '42501';
  end if;
  if not exists (select 1 from price_catalog_versions where id = p_version_id and status = 'draft') then
    raise exception 'Only a draft catalog can be published' using errcode = '42501';
  end if;

  select count(*) into v_items from price_items where catalog_version_id = p_version_id;
  -- An empty catalog would price every scan at nothing, which reads as a
  -- working quote for $0 rather than as the misconfiguration it is.
  if v_items = 0 then
    raise exception 'A catalog with no prices cannot be published' using errcode = '22023';
  end if;

  -- Retire first: the partial unique index allows exactly one active row.
  update price_catalog_versions set status = 'retired' where status = 'active';
  update price_catalog_versions
     set status = 'active', published_at = now(), published_by = auth.uid()
   where id = p_version_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'price_catalog', p_version_id, 'price_catalog.published',
          jsonb_build_object('items', v_items));
end;
$$;

/**
 * What one component is worth right now.
 *
 * Returns the row rather than a bare number so a caller can record which
 * version priced a quote -- the number alone cannot be defended later.
 */
create or replace function current_price(
  p_component_key text,
  p_grade         price_grade_enum
) returns table (
  catalog_version_id uuid,
  version            integer,
  display_name       text,
  unit               price_unit_enum,
  unit_price_cents   integer
) language sql stable security definer set search_path = public as $$
  select i.catalog_version_id, v.version, i.display_name, i.unit, i.unit_price_cents
    from price_items i
    join price_catalog_versions v on v.id = i.catalog_version_id
   where v.status = 'active'
     and i.component_key = p_component_key
     and i.grade = p_grade;
$$;
