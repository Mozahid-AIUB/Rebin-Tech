-- What is actually inside each thing, so a scan can say what it is worth
-- recovering rather than only what Rebin will pay for it.
--
-- WHY THIS IS NOT ASKED OF THE MODEL
--
-- Nobody can see the gold content of a laptop in a photograph -- it is inside
-- a chip, under a heatsink, behind a case. A vision model asked "how much gold
-- is in this" answers anyway, and answers differently every time: the same
-- laptop photographed twice returns 0.2g and then 0.6g, and a seller who was
-- shown the higher number first has been misled by us, not by the model.
--
-- So the model is asked only what it can genuinely see -- which component this
-- is -- and the material figures are looked up from here. The consequence
-- worth having: photograph the same laptop ten times and the recoverable
-- content reads the same ten times, because it is a property of the catalog
-- row, not of the photograph. This is the same rule as pricing (plan §6, "AI
-- never prices") applied to the thing that decides the price.
--
-- WHERE THE NUMBERS COME FROM
--
-- Published averages for end-of-life IT equipment: the UNU/StEP e-waste
-- characterisation work, Umicore's smelter feedstock disclosures, and the
-- composition tables in the WEEE recycling literature. They are averages
-- across generations, and generations differ a lot -- a 2008 desktop carries
-- several times the gold of a 2022 one, because connector plating got thinner
-- as gold got expensive. Treat them as an order of magnitude.
--
-- That uncertainty is why these are DISPLAY ONLY and why every surface that
-- shows them marks them as approximate. No quote total is computed from these
-- columns; create_quote is untouched by this migration and still prices on
-- avg_weight_g against the catalog rate. If Rebin ever wants to pay on
-- assayed content, that is a different design and needs a scale and an
-- assay, not a photograph.

alter table price_items
  -- Grams of each per unit of the component. Gold is milligrams: a laptop
  -- holds roughly a fifth of a gram, and storing that as grams would round to
  -- zero in an integer column and read as "no gold" on screen.
  add column if not exists copper_g    integer check (copper_g    is null or copper_g    >= 0),
  add column if not exists aluminium_g integer check (aluminium_g is null or aluminium_g >= 0),
  add column if not exists steel_g     integer check (steel_g     is null or steel_g     >= 0),
  add column if not exists gold_mg     integer check (gold_mg     is null or gold_mg     >= 0);

comment on column price_items.copper_g is
  'Approximate recoverable copper per unit, in grams. Display only -- never priced from.';
comment on column price_items.aluminium_g is
  'Approximate recoverable aluminium per unit, in grams. Display only.';
comment on column price_items.steel_g is
  'Approximate recoverable steel per unit, in grams. Display only.';
comment on column price_items.gold_mg is
  'Approximate recoverable gold per unit, in MILLIGRAMS. Display only. Milligrams because a laptop holds ~200mg and grams would round to zero.';

-- set_price_item gains the four, all defaulted, so every existing call site
-- keeps working untouched.
create or replace function set_price_item(
  p_version_id       uuid,
  p_component_key    text,
  p_display_name     text,
  p_category         device_category_enum,
  p_grade            price_grade_enum,
  p_unit             price_unit_enum,
  p_unit_price_cents integer,
  p_avg_weight_g     integer default null,
  p_copper_g         integer default null,
  p_aluminium_g      integer default null,
  p_steel_g          integer default null,
  p_gold_mg          integer default null
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

  -- The recovered material cannot outweigh the thing it came out of. Catches
  -- a decimal slip -- 18000g of copper in a 2000g laptop -- at the point of
  -- entry rather than on a vendor's screen.
  if p_avg_weight_g is not null
     and coalesce(p_copper_g, 0) + coalesce(p_aluminium_g, 0) + coalesce(p_steel_g, 0)
         > p_avg_weight_g then
    raise exception 'Material content (% g) exceeds the unit weight (% g)',
      coalesce(p_copper_g, 0) + coalesce(p_aluminium_g, 0) + coalesce(p_steel_g, 0),
      p_avg_weight_g
      using errcode = '22023';
  end if;

  insert into price_items (
    catalog_version_id, component_key, display_name, category, grade, unit,
    unit_price_cents, avg_weight_g, copper_g, aluminium_g, steel_g, gold_mg
  )
  values (
    p_version_id, p_component_key, p_display_name, p_category, p_grade, p_unit,
    p_unit_price_cents, p_avg_weight_g, p_copper_g, p_aluminium_g, p_steel_g, p_gold_mg
  )
  on conflict (catalog_version_id, component_key, grade) do update
    set display_name     = excluded.display_name,
        category         = excluded.category,
        unit             = excluded.unit,
        unit_price_cents = excluded.unit_price_cents,
        avg_weight_g     = excluded.avg_weight_g,
        copper_g         = excluded.copper_g,
        aluminium_g      = excluded.aluminium_g,
        steel_g          = excluded.steel_g,
        gold_mg          = excluded.gold_mg;
end $$;

-- A draft copies the active catalog, so it has to copy these too -- exactly
-- the bug 0037 fixed for avg_weight_g, which would recur here otherwise: the
-- next catalog version would silently drop every material figure.
--
-- Body kept identical to 0037 apart from the four columns. The parameter name
-- must stay p_note: Postgres refuses to rename an input parameter in a
-- replacement (42P13), and callers pass it by position anyway.
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
      unit_price_cents, avg_weight_g, copper_g, aluminium_g, steel_g, gold_mg
    )
    select v_new, component_key, display_name, category, grade, unit,
           unit_price_cents, avg_weight_g, copper_g, aluminium_g, steel_g, gold_mg
      from price_items where catalog_version_id = v_active;
  end if;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'price_catalog', v_new, 'price_catalog.drafted',
          jsonb_build_object('note', p_note));

  return v_new;
end;
$$;

-- Fill in the eighteen components of catalog v3, in place.
--
-- Written as an update against the active version rather than as a new draft:
-- these columns are display-only, no quote total changes, and no accepted
-- offer becomes unexplainable. Publishing a v4 to add a label would retire a
-- catalog five accepted quotes point at, for no change to a single price.
--
-- Rounded hard on purpose. A laptop's copper is "about 180 grams", not
-- 183.7 -- a figure with a decimal place claims a precision that averages
-- across a decade of hardware do not have.
update price_items p set
  copper_g    = v.copper_g,
  aluminium_g = v.aluminium_g,
  steel_g     = v.steel_g,
  gold_mg     = v.gold_mg
from (values
  -- key,                copper, alu,   steel,  gold(mg)
  ('laptop',              180,    400,    300,   200),
  ('desktop',             900,   1200,   4500,   250),
  ('tablet',               40,    120,     30,    60),

  ('monitor',             200,    350,    900,    50),
  -- Mostly glass, plastic and a steel frame; the board is a small part of it.
  ('large_display',       450,   1100,   3500,    80),

  ('rack_server',        1800,   3000,  10000,  1200),
  ('network_gear',        350,    600,   1400,   180),
  -- A power supply is copper by nature: the transformer and its windings.
  ('power_supply',        450,    200,    700,    10),

  -- A copier is a steel box with rollers. Very little precious metal for its
  -- 60kg, which is why the rate per pound is the lowest in the catalog.
  ('copier',             2500,   4000,  40000,   150),
  ('printer',             500,   1200,   4500,    60),

  -- A UPS is a lead-acid battery in a case; the lead is the value, and it is
  -- not one of these four columns.
  ('ups',                 800,    600,   2500,    20),
  ('lead_battery',        150,     50,   1200,     0),

  -- Boards and chips: the reason e-waste is mined at all.
  ('motherboard',         120,     60,     40,   180),
  -- A processor is the densest gold in the catalog by weight -- the lid, the
  -- substrate and the pins are all plated.
  ('cpu',                   8,      2,      1,    60),
  ('ram_module',            6,      1,      1,    25),
  ('hard_drive',           60,    180,    250,    30),
  -- No motor, no platters: a board in a shell, so far less of everything.
  ('solid_state_drive',     8,     15,     10,    12),
  ('expansion_card',       45,     60,     25,    70)
) as v(component_key, copper_g, aluminium_g, steel_g, gold_mg)
where p.component_key = v.component_key
  and p.catalog_version_id in (select id from price_catalog_versions where status = 'active');
