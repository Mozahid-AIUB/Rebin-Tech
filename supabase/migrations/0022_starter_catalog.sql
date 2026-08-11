-- A starter catalog, so the quote flow has something to price against.
--
-- THESE NUMBERS ARE PLACEHOLDERS. They are the right order of magnitude for US
-- refurb/scrap in 2026 and nothing more -- real rates depend on the client's
-- buyers, their margins, and what metals are doing this week. Operations edits
-- them by drafting a new version (create_price_catalog_draft -> set_price_item
-- -> publish_price_catalog); nothing here is edited in place.
--
-- Only 'each' units are seeded. Weight rates need the field agent's scale, and
-- a price the vendor flow cannot measure would be a promise nothing can honour.
--
-- Grades, and why the spread is so wide: a working business laptop is resold,
-- a broken one is harvested for parts, and a parts-grade one is scrap metal
-- with a recycling cost attached. The same object, three different businesses.
do $$
declare v_version uuid;
begin
  insert into price_catalog_versions (version, status, note, published_at)
  values (1, 'active', 'Starter catalog -- placeholder rates, replace before trading', now())
  returning id into v_version;

  insert into price_items
    (catalog_version_id, component_key, display_name, category, grade, unit, unit_price_cents)
  values
    -- Computers and laptops. Business-class machines hold value; consumer
    -- plastic does not, whatever it cost new.
    (v_version, 'laptop_business',    'Business laptop',        'computers_laptops', 'working', 'each', 12000),
    (v_version, 'laptop_business',    'Business laptop',        'computers_laptops', 'broken',  'each',  3500),
    (v_version, 'laptop_business',    'Business laptop',        'computers_laptops', 'parts',   'each',   800),
    (v_version, 'laptop_consumer',    'Consumer laptop',        'computers_laptops', 'working', 'each',  6000),
    (v_version, 'laptop_consumer',    'Consumer laptop',        'computers_laptops', 'broken',  'each',  1500),
    (v_version, 'laptop_consumer',    'Consumer laptop',        'computers_laptops', 'parts',   'each',   500),
    (v_version, 'desktop_tower',      'Desktop tower',          'computers_laptops', 'working', 'each',  7000),
    (v_version, 'desktop_tower',      'Desktop tower',          'computers_laptops', 'broken',  'each',  2000),
    (v_version, 'desktop_tower',      'Desktop tower',          'computers_laptops', 'parts',   'each',   900),
    (v_version, 'all_in_one_pc',      'All-in-one PC',          'computers_laptops', 'working', 'each',  8000),
    (v_version, 'all_in_one_pc',      'All-in-one PC',          'computers_laptops', 'broken',  'each',  1800),
    (v_version, 'all_in_one_pc',      'All-in-one PC',          'computers_laptops', 'parts',   'each',   600),
    (v_version, 'tablet',             'Tablet',                 'computers_laptops', 'working', 'each',  5000),
    (v_version, 'tablet',             'Tablet',                 'computers_laptops', 'broken',  'each',  1000),
    (v_version, 'tablet',             'Tablet',                 'computers_laptops', 'parts',   'each',   300),

    -- Displays. Heavy, cheap to buy, expensive to ship -- which is why a
    -- parts-grade panel is worth almost nothing.
    (v_version, 'monitor_lcd_24',     'LCD monitor, up to 24"', 'monitors_displays', 'working', 'each',  2500),
    (v_version, 'monitor_lcd_24',     'LCD monitor, up to 24"', 'monitors_displays', 'broken',  'each',   500),
    (v_version, 'monitor_lcd_24',     'LCD monitor, up to 24"', 'monitors_displays', 'parts',   'each',   150),
    (v_version, 'monitor_lcd_27',     'LCD monitor, 27" and up','monitors_displays', 'working', 'each',  4500),
    (v_version, 'monitor_lcd_27',     'LCD monitor, 27" and up','monitors_displays', 'broken',  'each',   800),
    (v_version, 'monitor_lcd_27',     'LCD monitor, 27" and up','monitors_displays', 'parts',   'each',   200),

    -- Server gear. The one category where broken still pays: the metal, the
    -- gold on the boards and the drive caddies all have buyers.
    (v_version, 'server_rack_1u',     'Rack server, 1U',        'server_gear',       'working', 'each', 25000),
    (v_version, 'server_rack_1u',     'Rack server, 1U',        'server_gear',       'broken',  'each',  8000),
    (v_version, 'server_rack_1u',     'Rack server, 1U',        'server_gear',       'parts',   'each',  3000),
    (v_version, 'network_switch',     'Network switch',         'server_gear',       'working', 'each',  9000),
    (v_version, 'network_switch',     'Network switch',         'server_gear',       'broken',  'each',  2000),
    (v_version, 'network_switch',     'Network switch',         'server_gear',       'parts',   'each',   700),
    (v_version, 'hard_drive',         'Hard drive',             'server_gear',       'working', 'each',  1200),
    (v_version, 'hard_drive',         'Hard drive',             'server_gear',       'broken',  'each',   300),
    (v_version, 'hard_drive',         'Hard drive',             'server_gear',       'parts',   'each',   100),

    -- Print devices. Big, awkward, and worth very little unless they run.
    (v_version, 'printer_desktop',    'Desktop printer',        'copiers_printers',  'working', 'each',  1500),
    (v_version, 'printer_desktop',    'Desktop printer',        'copiers_printers',  'broken',  'each',   300),
    (v_version, 'printer_desktop',    'Desktop printer',        'copiers_printers',  'parts',   'each',   100),
    (v_version, 'copier_floor',       'Floor-standing copier',  'copiers_printers',  'working', 'each', 15000),
    (v_version, 'copier_floor',       'Floor-standing copier',  'copiers_printers',  'broken',  'each',  2500),
    (v_version, 'copier_floor',       'Floor-standing copier',  'copiers_printers',  'parts',   'each',  1000),

    -- Batteries and UPS. Handled as hazardous waste, so a dead one costs money
    -- to dispose of; zero here means "we'll take it", not "it's worthless".
    (v_version, 'ups_desktop',        'Desktop UPS',            'batteries_ups',     'working', 'each',  2000),
    (v_version, 'ups_desktop',        'Desktop UPS',            'batteries_ups',     'broken',  'each',   400),
    (v_version, 'ups_desktop',        'Desktop UPS',            'batteries_ups',     'parts',   'each',     0),
    (v_version, 'ups_rack',           'Rack-mount UPS',         'batteries_ups',     'working', 'each',  6000),
    (v_version, 'ups_rack',           'Rack-mount UPS',         'batteries_ups',     'broken',  'each',  1200),
    (v_version, 'ups_rack',           'Rack-mount UPS',         'batteries_ups',     'parts',   'each',     0),
    (v_version, 'battery_ups_cell',   'UPS battery cell',       'batteries_ups',     'working', 'each',   800),
    (v_version, 'battery_ups_cell',   'UPS battery cell',       'batteries_ups',     'broken',  'each',   200),
    (v_version, 'battery_ups_cell',   'UPS battery cell',       'batteries_ups',     'parts',   'each',     0);
end $$;
