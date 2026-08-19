-- Catalog version 3: one grade, priced by weight.
--
-- Grade and per-item pricing are gone. The catalog priced a laptop three ways
-- -- working 9000, broken 2500, parts 700 -- and the vendor picked which one
-- applied, so the same twelve machines were worth $84 or $1,080 depending on
-- a dropdown the person being paid controlled. E-waste is bought for the
-- metal inside it; whether a machine powers on does not change what it is
-- worth. Every row here is 'parts' because grade no longer means anything --
-- the enum value stays only because 0021's type keeps values it has shipped.
--
-- unit_price_cents now means cents per pound, not cents per item. Every row
-- is 'lb'. A line is quantity x avg_weight_g x unit_price_cents, converted
-- through grams-per-pound by create_quote (0034).
--
-- The weights below are starting values for an operator to correct, not
-- measured data. Nobody has put these eighteen things on a scale; a laptop is
-- "roughly four to five pounds" the way a printer is "roughly heavy", and
-- that is exactly the precision a catalog value should carry until an
-- operator with a scale overwrites it. Same caveat 0029 put on its rates:
-- right order of magnitude, nothing more, and trading on them as researched
-- figures loses real money on every collection.
--
-- The eighteen keys, names and categories come from 0029 and are not
-- reinvented here -- this is the same eighteen things priced once each
-- instead of three times.
--
-- v2 retires rather than being deleted. Five accepted quotes were priced
-- against it, and those are offers Rebin actually made; deleting the rows
-- would make them unexplainable.
do $$
declare
  v_draft uuid;
begin
  v_draft := create_price_catalog_draft('Catalog v3 -- one grade, priced by weight per pound');

  perform set_price_item(v_draft, 'laptop',            'Laptop',                'computers_laptops', 'parts', 'lb',  80, 2000);
  perform set_price_item(v_draft, 'desktop',           'Desktop computer',      'computers_laptops', 'parts', 'lb',  70, 8000);
  perform set_price_item(v_draft, 'tablet',            'Tablet',                'computers_laptops', 'parts', 'lb',  90,  500);

  perform set_price_item(v_draft, 'monitor',           'Monitor',               'monitors_displays', 'parts', 'lb',  25, 3500);
  perform set_price_item(v_draft, 'large_display',     'Large display or TV',   'monitors_displays', 'parts', 'lb',  20, 12000);

  perform set_price_item(v_draft, 'rack_server',       'Rack server',           'server_gear', 'parts', 'lb', 90, 18000);
  perform set_price_item(v_draft, 'network_gear',      'Network equipment',     'server_gear', 'parts', 'lb', 85, 3000);
  perform set_price_item(v_draft, 'power_supply',      'Power supply',          'server_gear', 'parts', 'lb', 75, 1500);

  perform set_price_item(v_draft, 'copier',            'Copier or MFP',         'copiers_printers', 'parts', 'lb', 15, 60000);
  perform set_price_item(v_draft, 'printer',           'Printer',               'copiers_printers', 'parts', 'lb', 18, 9000);

  perform set_price_item(v_draft, 'ups',               'UPS',                   'batteries_ups', 'parts', 'lb', 30, 12000);
  perform set_price_item(v_draft, 'lead_battery',      'Lead-acid battery',     'batteries_ups', 'parts', 'lb', 22, 15000);

  perform set_price_item(v_draft, 'motherboard',       'Motherboard',           'components_parts', 'parts', 'lb', 220,  700);
  perform set_price_item(v_draft, 'cpu',                'Processor',            'components_parts', 'parts', 'lb', 1800,  50);
  perform set_price_item(v_draft, 'ram_module',        'Memory module',         'components_parts', 'parts', 'lb', 900,   30);
  perform set_price_item(v_draft, 'hard_drive',        'Hard drive',            'components_parts', 'parts', 'lb', 130,  600);
  perform set_price_item(v_draft, 'solid_state_drive', 'Solid-state drive',     'components_parts', 'parts', 'lb', 150,   80);
  perform set_price_item(v_draft, 'expansion_card',    'Expansion card',        'components_parts', 'parts', 'lb', 400,  200);

  perform publish_price_catalog(v_draft);
end $$;
