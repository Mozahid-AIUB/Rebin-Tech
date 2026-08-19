-- Price by weight, not by the vendor's choice of grade.
--
-- The catalog priced a laptop three ways -- working 9000, broken 2500, parts
-- 700 -- and the vendor picked which one applied. The same twelve machines
-- were therefore worth $84 or $1,080 depending on a dropdown, which is a
-- thirteen-fold spread on identical material chosen by the person being paid.
--
-- E-waste is bought for the metal inside it. Whether a machine powers on does
-- not change what it is worth, so the grade was never load-bearing -- it was
-- just the only lever the schema offered.
--
-- What replaces it: an operator sets a rate per pound and an average weight
-- per component, and a line is quantity x weight x rate. Both numbers are
-- catalog values an operator owns and can correct. The model is never asked
-- for a weight -- a laptop is four to five pounds, which is a table, not a
-- judgement, and a vision model re-deriving it per photograph would price the
-- same laptop differently twice with nothing to check it against.

-- Grams, because packages/shared/src/weight.ts already converts and formats
-- grams and packages/ui renders them. A second integer weight unit in one
-- product is a conversion bug waiting to happen.
alter table price_items add column if not exists avg_weight_g integer
  check (avg_weight_g is null or avg_weight_g > 0);

comment on column price_items.avg_weight_g is
  'Typical weight of one of these, in grams. When set, unit_price_cents is read as a rate per pound and a quote line is quantity x this weight x that rate. Null keeps the row priced per item.';

-- What the line was actually weighed at, copied like the price beside it.
-- 0023 copies prices into quote_items rather than joining, so a quote cannot
-- silently reprice when the catalog moves; the weight it was priced on has to
-- travel the same way or the arithmetic stops being reconstructable.
alter table quote_items add column if not exists weight_g integer
  check (weight_g is null or weight_g >= 0);

comment on column quote_items.weight_g is
  'Total grams this line was priced on: quantity x the catalog average at quote time. Null on lines priced per item.';

/**
 * Upsert one catalog row, now carrying an average weight.
 *
 * p_avg_weight_g defaults to null so every existing caller keeps working and
 * keeps meaning what it meant: a row with no weight is priced per item.
 */
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

/**
 * Turns a finished appraisal into an offer.
 *
 * One RPC rather than an insert plus a loop of inserts: a quote whose total
 * says $360 and whose lines add to $240 is worse than no quote, and a
 * client-side loop can leave exactly that behind when the third call fails.
 *
 * The total is recomputed here from the lines rather than trusted from the
 * caller, because the caller is a phone.
 */
create or replace function create_quote(
  p_business_id uuid,
  p_items       jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_quote   uuid;
  v_version uuid;
  v_total   integer;
  v_count   integer;
begin
  if not (has_role('biz_owner', p_business_id) or has_role('biz_staff', p_business_id)) then
    raise exception 'Only a member of this business can request a quote'
      using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'A quote needs at least one item' using errcode = '22023';
  end if;

  select id into v_version from price_catalog_versions where status = 'active';
  if v_version is null then
    raise exception 'No price catalog is published, so nothing can be quoted'
      using errcode = '22023';
  end if;

  insert into quotes (business_id, created_by, catalog_version_id, total_cents)
  values (p_business_id, auth.uid(), v_version, 0)
  returning id into v_quote;

  -- Prices come from the catalog by key and grade, not from the payload: a
  -- client that could name its own price would be a client that could name
  -- its own payout.
  insert into quote_items (
    quote_id, component_key, display_name, grade, unit,
    quantity, unit_price_cents, weight_g, line_total_cents, confidence, notes, source
  )
  select
    v_quote,
    item ->> 'componentKey',
    p.display_name,
    (item ->> 'grade')::price_grade_enum,
    p.unit,
    (item ->> 'quantity')::integer,
    p.unit_price_cents,
    -- Weight-priced when the catalog row carries an average weight, per-item
    -- when it does not. Rounded to whole cents at the line, not at the total:
    -- a fraction of a cent per line compounding into a total nobody can
    -- reconcile against the lines is worse than a rounding of at most a cent.
    case
      when p.avg_weight_g is not null
        then p.avg_weight_g * (item ->> 'quantity')::integer
      else null
    end,                                    -- weight_g
    case
      when p.avg_weight_g is not null
        -- 453.59237 is grams per pound.
        then round(
               p.unit_price_cents
               * (p.avg_weight_g * (item ->> 'quantity')::integer) / 453.59237
             )::integer
      else p.unit_price_cents * (item ->> 'quantity')::integer
    end,                                    -- line_total_cents
    (item ->> 'confidence')::smallint,
    nullif(item ->> 'notes', ''),
    coalesce(nullif(item ->> 'source', ''), 'scan')
  from jsonb_array_elements(p_items) as item
  join price_items p
    on p.catalog_version_id = v_version
   and p.component_key = item ->> 'componentKey'
   and p.grade = (item ->> 'grade')::price_grade_enum;

  get diagnostics v_count = row_count;
  -- Every line was for something the catalog does not price. Rolling the whole
  -- quote back beats leaving an empty $0 offer that reads as "worthless".
  if v_count = 0 then
    raise exception 'None of those items are in the current price catalog'
      using errcode = '22023';
  end if;

  select coalesce(sum(line_total_cents), 0) into v_total
    from quote_items where quote_id = v_quote;
  update quotes set total_cents = v_total where id = v_quote;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'quote', v_quote, 'quote.created',
          jsonb_build_object('total_cents', v_total, 'lines', v_count));

  return v_quote;
end;
$$;
