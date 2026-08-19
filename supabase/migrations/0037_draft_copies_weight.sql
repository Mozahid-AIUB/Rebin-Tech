-- Two bugs in the weight-pricing surface that final review caught before they
-- shipped again.
--
-- 1. `create_price_catalog_draft` (0021) seeds a new draft by copying every
--    column of the active version's rows -- except `avg_weight_g`, which
--    0034 added after 0021 was written and never came back to fix. Every
--    untouched row in the *next* draft would publish with a null weight, and
--    `create_quote` (0034) reads a null weight as "priced per item": a
--    laptop that should quote at $3.53 (2000g x 80c/lb) would quote at 80c,
--    a CPU that should be $1.98 (50g x 1800c/lb) would quote at $18.00 --  a
--    9x overpayment, silently, on the very next rate change. This is the
--    same shape of bug 0036 already had to clean up once (a draft seeded
--    from the wrong assumption about what copying an active catalog means);
--    the fix there was data cleanup, this is the function itself.
--
--    Copied verbatim from 0021 otherwise -- the staff check, the version
--    numbering, and the audit event are unchanged. Only avg_weight_g is new
--    in both column lists.
--
-- 2. `set_price_item` (0034) checks that a weight is positive but never
--    checks it against `p_unit`, so a row can end up priced per pound while
--    labelled "Each" everywhere both UIs render `unit` -- `create_quote`
--    branches on `avg_weight_g is not null` and ignores `unit` entirely, so
--    the row prices correctly but reads as something else. `NewItemForm` (web)
--    defaults Unit to "each", so this is one un-clicked dropdown away from
--    happening on the next new component. Rejecting the combination outright
--    is cheaper than a UI that has to explain what the mismatch means.

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
    insert into price_items (
      catalog_version_id, component_key, display_name, category, grade, unit,
      unit_price_cents, avg_weight_g
    )
    select v_new, component_key, display_name, category, grade, unit,
           unit_price_cents, avg_weight_g
      from price_items where catalog_version_id = v_active;
  end if;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'price_catalog', v_new, 'price_catalog.drafted',
          jsonb_build_object('note', p_note));

  return v_new;
end;
$$;

create or replace function set_price_item(
  p_version_id       uuid,
  p_component_key    text,
  p_display_name     text,
  p_category         device_category_enum,
  p_grade            price_grade_enum,
  p_unit             price_unit_enum,
  p_unit_price_cents integer,
  p_avg_weight_g     integer default null
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
  if p_avg_weight_g is not null and p_avg_weight_g <= 0 then
    raise exception 'An average weight must be greater than zero' using errcode = '22023';
  end if;
  -- A weight only means something when unit_price_cents is read as a rate per
  -- pound (0034's comment on avg_weight_g). A weight next to unit = 'each'
  -- would price the row by weight while every UI still labels it "Each".
  if p_avg_weight_g is not null and p_unit <> 'lb' then
    raise exception 'A row with an average weight must be priced per pound' using errcode = '22023';
  end if;

  insert into price_items (
    catalog_version_id, component_key, display_name, category, grade, unit,
    unit_price_cents, avg_weight_g
  )
  values (
    p_version_id, p_component_key, p_display_name, p_category, p_grade, p_unit,
    p_unit_price_cents, p_avg_weight_g
  )
  on conflict (catalog_version_id, component_key, grade) do update
    set display_name     = excluded.display_name,
        category         = excluded.category,
        unit             = excluded.unit,
        unit_price_cents = excluded.unit_price_cents,
        avg_weight_g     = excluded.avg_weight_g;
end;
$$;
