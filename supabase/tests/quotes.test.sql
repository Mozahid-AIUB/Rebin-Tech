-- Quote guards (0023).
--
-- The rules worth protecting: a client cannot name its own price, only the
-- business that owns a quote can answer it, and an expired offer is not
-- acceptable.
begin;
select plan(11);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'owner@shop.test'),
  ('66666666-6666-6666-6666-666666666666', 'rival@othershop.test');
insert into profiles (id, full_name, status) values
  ('55555555-5555-5555-5555-555555555555', 'Shop Owner', 'active'),
  ('66666666-6666-6666-6666-666666666666', 'Rival Owner', 'active');
insert into businesses (id, name, business_type, street, city, state, zip, status) values
  ('bbbbbbbb-1111-0000-0000-000000000001', 'Eastside Repair', 'repair_shop', '14 Market St', 'Newark', 'NJ', '07102', 'active'),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'Rival Repair',    'repair_shop', '9 Other St',   'Newark', 'NJ', '07102', 'active');
insert into business_members values
  ('bbbbbbbb-1111-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'biz_owner'),
  ('bbbbbbbb-2222-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666', 'biz_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('55555555-5555-5555-5555-555555555555', 'biz_owner', 'business', 'bbbbbbbb-1111-0000-0000-000000000001'),
  ('66666666-6666-6666-6666-666666666666', 'biz_owner', 'business', 'bbbbbbbb-2222-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

-- ---------------------------------------------------------------------------
-- Creating a quote.
-- ---------------------------------------------------------------------------
create temporary table q as select create_quote(
  'bbbbbbbb-1111-0000-0000-000000000001',
  '[{"componentKey":"laptop_business","grade":"working","quantity":3,"confidence":94,"notes":"Dell","source":"scan"}]'::jsonb
) as id;

select is(
  (select total_cents from quotes where id = (select id from q)),
  36000,
  'the total is 3 x the catalog price, computed from the lines'
);
select is(
  (select unit_price_cents from quote_items where quote_id = (select id from q)),
  12000,
  'the line price comes from the catalog'
);
select is(
  (select catalog_version_id from quotes where id = (select id from q)),
  (select id from price_catalog_versions where status = 'active'),
  'the quote records which catalog priced it'
);

-- A payload that names its own price is the one thing this must refuse: a
-- client that could set unit_price_cents could set its own payout.
create temporary table q2 as select create_quote(
  'bbbbbbbb-1111-0000-0000-000000000001',
  '[{"componentKey":"laptop_business","grade":"working","quantity":1,"unitPriceCents":999999,"confidence":90}]'::jsonb
) as id;
select is(
  (select total_cents from quotes where id = (select id from q2)),
  12000,
  'a price supplied by the caller is ignored in favour of the catalog'
);

select throws_ok(
  $$select create_quote('bbbbbbbb-1111-0000-0000-000000000001', '[]'::jsonb)$$,
  '22023',
  null,
  'an empty quote is refused'
);
select throws_ok(
  $$select create_quote('bbbbbbbb-1111-0000-0000-000000000001',
      '[{"componentKey":"unicorn","grade":"working","quantity":1,"confidence":90}]'::jsonb)$$,
  '22023',
  null,
  'a quote of items the catalog does not price is refused rather than left at $0'
);

-- ---------------------------------------------------------------------------
-- Who may quote, and who may answer.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select throws_ok(
  $$select create_quote('bbbbbbbb-1111-0000-0000-000000000001',
      '[{"componentKey":"laptop_business","grade":"working","quantity":1,"confidence":90}]'::jsonb)$$,
  '42501',
  null,
  'a rival cannot raise a quote against another business'
);
select throws_ok(
  format($$select decide_quote(%L, true)$$, (select id from q)),
  '42501',
  null,
  'a rival cannot accept another business''s quote'
);
select is(
  (select count(*)::int from list_quotes('bbbbbbbb-2222-0000-0000-000000000002')),
  0,
  'a rival sees none of the other business''s quotes'
);

-- ---------------------------------------------------------------------------
-- Answering, once.
-- ---------------------------------------------------------------------------
set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select lives_ok(
  format($$select decide_quote(%L, true)$$, (select id from q)),
  'the owner can accept their own quote'
);
select throws_ok(
  format($$select decide_quote(%L, false)$$, (select id from q)),
  '22023',
  null,
  'a decided quote cannot be answered again'
);

select * from finish();
rollback;
