-- Catalog version 2: fewer products, all six categories, and the parts.
--
-- Two problems with version 1, fixed together.
--
-- It priced two categories out of five. Printers, server gear and batteries
-- had no rates at all, and an unpriced category is not "missing some options"
-- -- it is invisible. The Edge Function builds the model's vocabulary from the
-- live catalog, so a printer in a photograph could not be returned, and
-- `create_quote` refuses a key it cannot price. And nowhere at all for the
-- parts a machine breaks down into, which are the highest-value things in the
-- waste stream: a tray of memory is worth more than the tower it came out of.
--
-- It was also too finely split, in a way that looked like precision and was
-- not. `laptop_business` and `laptop_consumer` are a real commercial
-- distinction and a coin flip from a photograph of a closed lid. The same goes
-- for DDR3 against DDR4, a desktop CPU against a server one, and a 24" panel
-- against a 27". Splitting a price on a difference the camera cannot see does
-- not make the quote more accurate -- it makes the model guess, and the guess
-- becomes money.
--
-- So the rule for what gets its own key here is: can the camera actually tell
-- these apart? Eighteen products rather than the thirty-odd a full expansion
-- of version 1 would have produced -- 54 rows against 121. That matters
-- because a person has to maintain it, and until the admin dashboard exists
-- that person is editing SQL.
--
-- Version 1's keys are not carried forward; this replaces them. Retired rather
-- than deleted, so every quote already priced against it stays explainable.
--
-- THESE NUMBERS ARE PLACEHOLDERS. Right order of magnitude for US refurb and
-- scrap in 2026, nothing more. Real rates depend on the client's buyers and
-- their margins, and trading on these loses real money on every collection.
--
-- KNOWN GAP, deliberately not worked around. `price_items` has
-- `check (unit_price_cents >= 0)`, so the catalog cannot express something
-- that costs money to take away. Lithium packs, CRT glass and damaged sealed
-- batteries are all net costs to a US recycler; pricing them at zero would
-- promise to take them for free. They are absent rather than wrong. Carrying
-- them needs a decision about what the business does, not a migration.
do $$
declare
  v_old uuid;
  v_new uuid;
begin
  select id into v_old from price_catalog_versions where status = 'active';

  insert into price_catalog_versions (version, status, note, published_at)
  values (
    (select coalesce(max(version), 0) + 1 from price_catalog_versions),
    'draft',
    'All six categories, consolidated products -- placeholder rates, replace before trading',
    null
  )
  returning id into v_new;

  insert into price_items
    (catalog_version_id, component_key, display_name, category, grade, unit, unit_price_cents)
  values
    -- Computers. One laptop key, not two: business and consumer machines are
    -- worth very different money and look the same closed.
    (v_new, 'laptop',        'Laptop',                  'computers_laptops', 'working', 'each',  9000),
    (v_new, 'laptop',        'Laptop',                  'computers_laptops', 'broken',  'each',  2500),
    (v_new, 'laptop',        'Laptop',                  'computers_laptops', 'parts',   'each',   700),
    (v_new, 'desktop',       'Desktop computer',        'computers_laptops', 'working', 'each',  7000),
    (v_new, 'desktop',       'Desktop computer',        'computers_laptops', 'broken',  'each',  2000),
    (v_new, 'desktop',       'Desktop computer',        'computers_laptops', 'parts',   'each',   900),
    (v_new, 'tablet',        'Tablet',                  'computers_laptops', 'working', 'each',  5000),
    (v_new, 'tablet',        'Tablet',                  'computers_laptops', 'broken',  'each',  1000),
    (v_new, 'tablet',        'Tablet',                  'computers_laptops', 'parts',   'each',   300),

    -- Displays. Screen size is legible in a photo only next to something of
    -- known size, which a pallet shot never has.
    (v_new, 'monitor',       'Monitor',                 'monitors_displays', 'working', 'each',  2500),
    (v_new, 'monitor',       'Monitor',                 'monitors_displays', 'broken',  'each',   500),
    (v_new, 'monitor',       'Monitor',                 'monitors_displays', 'parts',   'each',   200),
    (v_new, 'large_display', 'Large display or TV',     'monitors_displays', 'working', 'each',  6000),
    (v_new, 'large_display', 'Large display or TV',     'monitors_displays', 'broken',  'each',   800),
    (v_new, 'large_display', 'Large display or TV',     'monitors_displays', 'parts',   'each',   300),

    -- Server gear. A rack server is the most valuable whole unit in the
    -- catalog; switches and routers sit together because they photograph the
    -- same and sell for roughly the same.
    (v_new, 'rack_server',   'Rack server',             'server_gear', 'working', 'each', 28000),
    (v_new, 'rack_server',   'Rack server',             'server_gear', 'broken',  'each',  7000),
    (v_new, 'rack_server',   'Rack server',             'server_gear', 'parts',   'each',  3000),
    (v_new, 'network_gear',  'Switch or router',        'server_gear', 'working', 'each', 10000),
    (v_new, 'network_gear',  'Switch or router',        'server_gear', 'broken',  'each',  2000),
    (v_new, 'network_gear',  'Switch or router',        'server_gear', 'parts',   'each',   800),

    -- Printers. Heavy, cheap, expensive to move: a dead office copier is close
    -- to worthless once freight is counted.
    (v_new, 'printer',       'Printer',                 'copiers_printers', 'working', 'each',  3000),
    (v_new, 'printer',       'Printer',                 'copiers_printers', 'broken',  'each',   600),
    (v_new, 'printer',       'Printer',                 'copiers_printers', 'parts',   'each',   250),
    (v_new, 'copier',        'Copier or MFP',           'copiers_printers', 'working', 'each', 15000),
    (v_new, 'copier',        'Copier or MFP',           'copiers_printers', 'broken',  'each',  2000),
    (v_new, 'copier',        'Copier or MFP',           'copiers_printers', 'parts',   'each',   800),

    -- Power. Only what has positive scrap value -- see the note above for why
    -- lithium is absent rather than priced at zero.
    (v_new, 'ups',           'UPS',                     'batteries_ups', 'working', 'each',  6000),
    (v_new, 'ups',           'UPS',                     'batteries_ups', 'broken',  'each',  1200),
    (v_new, 'ups',           'UPS',                     'batteries_ups', 'parts',   'each',   600),
    (v_new, 'lead_battery',  'Lead-acid battery',       'batteries_ups', 'working', 'each',  1500),
    (v_new, 'lead_battery',  'Lead-acid battery',       'batteries_ups', 'broken',  'each',   900),
    (v_new, 'lead_battery',  'Lead-acid battery',       'batteries_ups', 'parts',   'each',   700),

    -- Harvested parts. The reason this version exists.
    --
    -- One memory key, not four. A photograph of a tray of RAM does not say
    -- DDR3 from DDR4, and the two are worth six times apart -- so a split key
    -- would have the model picking which one, on no evidence, for money.
    -- Same for CPUs: desktop and server silicon are indistinguishable in a
    -- tray and an order of magnitude apart in value.
    --
    -- Grades read differently here than on a whole device: "working" goes back
    -- into a machine, "broken" does not, "parts" is metal recovery. The gap
    -- between the ends is narrowest here, because even a dead one carries gold.
    (v_new, 'ram_module',    'Memory module',           'components_parts', 'working', 'each',   800),
    (v_new, 'ram_module',    'Memory module',           'components_parts', 'broken',  'each',   250),
    (v_new, 'ram_module',    'Memory module',           'components_parts', 'parts',   'each',   150),
    (v_new, 'cpu',           'Processor',               'components_parts', 'working', 'each',  2500),
    (v_new, 'cpu',           'Processor',               'components_parts', 'broken',  'each',   800),
    (v_new, 'cpu',           'Processor',               'components_parts', 'parts',   'each',   600),
    -- A drive that spins is worth less than the certainty that it is wiped: an
    -- unwiped drive off a hospital rack is a liability, not an asset. Priced
    -- conservatively for that reason.
    (v_new, 'hard_drive',    'Hard drive',              'components_parts', 'working', 'each',   600),
    (v_new, 'hard_drive',    'Hard drive',              'components_parts', 'broken',  'each',   150),
    (v_new, 'hard_drive',    'Hard drive',              'components_parts', 'parts',   'each',   100),
    -- Kept apart from spinning disks: an NVMe stick and a 3.5" drive are not
    -- remotely the same object in a photo.
    (v_new, 'solid_state_drive','Solid-state drive',    'components_parts', 'working', 'each',  1400),
    (v_new, 'solid_state_drive','Solid-state drive',    'components_parts', 'broken',  'each',   250),
    (v_new, 'solid_state_drive','Solid-state drive',    'components_parts', 'parts',   'each',   130),
    (v_new, 'motherboard',   'Motherboard',             'components_parts', 'working', 'each',  2000),
    (v_new, 'motherboard',   'Motherboard',             'components_parts', 'broken',  'each',   800),
    (v_new, 'motherboard',   'Motherboard',             'components_parts', 'parts',   'each',   600),
    (v_new, 'expansion_card','Graphics or expansion card','components_parts','working','each',  3000),
    (v_new, 'expansion_card','Graphics or expansion card','components_parts','broken', 'each',   600),
    (v_new, 'expansion_card','Graphics or expansion card','components_parts','parts',  'each',   400),
    (v_new, 'power_supply',  'Power supply unit',       'components_parts', 'working', 'each',   900),
    (v_new, 'power_supply',  'Power supply unit',       'components_parts', 'broken',  'each',   300),
    (v_new, 'power_supply',  'Power supply unit',       'components_parts', 'parts',   'each',   250);

  -- Retire first: the partial unique index allows exactly one active row.
  update price_catalog_versions set status = 'retired' where id = v_old;
  update price_catalog_versions
     set status = 'active', published_at = now()
   where id = v_new;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (null, 'price_catalog', v_new, 'price_catalog.published',
          jsonb_build_object(
            'items', (select count(*) from price_items where catalog_version_id = v_new),
            'via', 'migration 0029'));
end $$;
