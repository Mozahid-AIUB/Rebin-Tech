-- Price catalog guards and versioning (0021).
--
-- The rule these tests exist to protect: a published price is a promise. It
-- cannot be edited, and exactly one catalog is live at a time.
begin;
select plan(12);

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'ops@rebin.test'),
  ('44444444-4444-4444-4444-444444444444', 'vendor@shop.test');
insert into profiles (id, full_name, status) values
  ('33333333-3333-3333-3333-333333333333', 'Ops Staff', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'A Vendor',  'active');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('33333333-3333-3333-3333-333333333333', 'platform_ops', 'platform', null);

set local role authenticated;

-- ---------------------------------------------------------------------------
-- The starter catalog (0022) shipped live and priced.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select is(
  (select count(*)::int from price_catalog_versions where status = 'active'),
  1,
  'exactly one catalog is active'
);
select is(
  (select unit_price_cents from current_price('laptop_business', 'working')),
  12000,
  'a vendor can read the live price of a working business laptop'
);
select is(
  (select unit_price_cents from current_price('laptop_business', 'parts')),
  800,
  'the same component grades down to a different price'
);

-- ---------------------------------------------------------------------------
-- Only platform staff may change prices.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select create_price_catalog_draft('vendor tries a discount')$$,
  '42501',
  null,
  'a vendor cannot draft a catalog'
);
select throws_ok(
  $$select publish_price_catalog((select id from price_catalog_versions where status = 'active'))$$,
  '42501',
  null,
  'a vendor cannot publish a catalog'
);

-- ---------------------------------------------------------------------------
-- Drafting copies the live prices, so a rate change edits a handful of rows
-- rather than retyping the catalog.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
create temporary table draft as select create_price_catalog_draft('copper up') as id;

select is(
  (select count(*)::int from price_items where catalog_version_id = (select id from draft)),
  (select count(*)::int from price_items i join price_catalog_versions v on v.id = i.catalog_version_id
    where v.status = 'active'),
  'a new draft starts as a copy of the live catalog'
);

-- ---------------------------------------------------------------------------
-- A published catalog is immutable; the draft is where work happens.
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select set_price_item((select id from price_catalog_versions where status = 'active'),
      'laptop_business', 'Business laptop', 'computers_laptops', 'working', 'each', 999)$$,
  '42501',
  null,
  'a published price cannot be edited'
);
select lives_ok(
  $$select set_price_item((select id from draft), 'laptop_business', 'Business laptop',
      'computers_laptops', 'working', 'each', 15000)$$,
  'a draft price can be set'
);
select is(
  (select unit_price_cents from current_price('laptop_business', 'working')),
  12000,
  'the live price is unchanged while the draft is unpublished'
);

-- ---------------------------------------------------------------------------
-- Publishing swaps which catalog is live, and only one ever is.
-- ---------------------------------------------------------------------------
select lives_ok(
  $$select publish_price_catalog((select id from draft))$$,
  'ops can publish a draft'
);
select is(
  (select unit_price_cents from current_price('laptop_business', 'working')),
  15000,
  'the new price is live once published'
);
select is(
  (select count(*)::int from price_catalog_versions where status = 'active'),
  1,
  'publishing retires the previous catalog rather than adding a second live one'
);

select * from finish();
rollback;
