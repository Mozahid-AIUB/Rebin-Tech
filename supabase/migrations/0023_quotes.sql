-- Quotes: the offer a business can hold on to.
--
-- Until now the appraisal camera could say "$360" and then forget it. A vendor
-- who closed the app lost the number, and nobody could answer "what were they
-- offered?" two days later. A quote is that answer, written down.
--
-- Prices are copied into quote_items rather than joined from the catalog at
-- read time. The catalog moves -- that is the whole reason it is versioned --
-- and a quote that silently repriced itself when copper fell would be an offer
-- Rebin never actually made.

create type quote_status_enum as enum ('offered', 'accepted', 'declined', 'expired');

create table quotes (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references businesses(id) on delete cascade,
  created_by         uuid not null references profiles(id),
  status             quote_status_enum not null default 'offered',
  -- Which rates produced this offer. Kept even though the prices are copied
  -- below, because "why was I offered this" is answered by pointing at a
  -- catalog version, not by a number with no provenance.
  catalog_version_id uuid not null references price_catalog_versions(id),
  total_cents        integer not null check (total_cents >= 0),
  -- Offers go stale because metal prices do. Seven days is long enough to
  -- think it over and short enough that Rebin is not honouring last month's
  -- market.
  expires_at         timestamptz not null default now() + interval '7 days',
  decided_at         timestamptz,
  created_at         timestamptz not null default now()
);

create index quotes_business_idx on quotes (business_id, created_at desc);

create table quote_items (
  id               uuid primary key default gen_random_uuid(),
  quote_id         uuid not null references quotes(id) on delete cascade,
  component_key    text not null,
  display_name     text not null,
  grade            price_grade_enum not null,
  unit             price_unit_enum not null,
  quantity         integer not null check (quantity > 0),
  -- Copied from the catalog at quote time, never re-read. See the header.
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  -- What the model thought, kept so a disputed grade can be argued against
  -- what the scan actually claimed.
  confidence       smallint check (confidence between 0 and 100),
  notes            text,
  source           text not null default 'scan' check (source in ('scan', 'manual'))
);

create index quote_items_quote_idx on quote_items (quote_id);

alter table quotes enable row level security;
alter table quote_items enable row level security;

create policy quotes_read on quotes for select using (
  is_business_member(business_id) or is_platform_staff()
);

create policy quote_items_read on quote_items for select using (
  exists (select 1 from quotes q where q.id = quote_id)
);

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
    quantity, unit_price_cents, line_total_cents, confidence, notes, source
  )
  select
    v_quote,
    item ->> 'componentKey',
    p.display_name,
    (item ->> 'grade')::price_grade_enum,
    p.unit,
    (item ->> 'quantity')::integer,
    p.unit_price_cents,
    p.unit_price_cents * (item ->> 'quantity')::integer,
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

/** The vendor's answer. One decision per quote, and only while it stands. */
create or replace function decide_quote(
  p_quote_id uuid,
  p_accept   boolean
) returns void language plpgsql security definer set search_path = public as $$
declare v_quote quotes%rowtype;
begin
  select * into v_quote from quotes where id = p_quote_id;
  if v_quote.id is null then
    raise exception 'No such quote: %', p_quote_id using errcode = 'P0002';
  end if;
  if not (has_role('biz_owner', v_quote.business_id) or has_role('biz_staff', v_quote.business_id)) then
    raise exception 'Only a member of this business can answer its quotes'
      using errcode = '42501';
  end if;
  if v_quote.status <> 'offered' then
    raise exception 'This quote was already %', v_quote.status using errcode = '22023';
  end if;
  -- Checked here rather than relying on a sweep: an expired offer must not be
  -- acceptable in the window between it lapsing and anything noticing.
  if v_quote.expires_at <= now() then
    update quotes set status = 'expired' where id = p_quote_id;
    raise exception 'This quote expired on %', v_quote.expires_at::date
      using errcode = '22023';
  end if;

  -- Cast per branch: a bare CASE over string literals resolves to text, and
  -- assigning that to an enum column fails at runtime rather than at create
  -- time -- the same trap 0016's transition table fell into.
  update quotes
     set status = case
                    when p_accept then 'accepted'::quote_status_enum
                    else 'declined'::quote_status_enum
                  end,
         decided_at = now()
   where id = p_quote_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'quote', p_quote_id,
          case when p_accept then 'quote.accepted' else 'quote.declined' end,
          jsonb_build_object('total_cents', v_quote.total_cents));
end;
$$;

/**
 * Quotes for a business, with their line count -- what the list screen needs
 * without fetching every line of every quote.
 */
create or replace function list_quotes(p_business_id uuid)
returns table (
  id uuid, status quote_status_enum, total_cents integer,
  item_count bigint, expires_at timestamptz, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not (is_business_member(p_business_id) or is_platform_staff()) then
    raise exception 'Not a member of this business' using errcode = '42501';
  end if;

  return query
    select q.id,
           -- Reported as expired the moment it lapses, whether or not a write
           -- has caught up: a list that still says "offered" invites a tap
           -- that can only fail.
           case when q.status = 'offered' and q.expires_at <= now()
                then 'expired'::quote_status_enum else q.status end,
           q.total_cents,
           count(i.id),
           q.expires_at,
           q.created_at
      from quotes q
      left join quote_items i on i.quote_id = q.id
     where q.business_id = p_business_id
     group by q.id
     order by q.created_at desc;
end;
$$;
