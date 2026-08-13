-- Quote guards (0023).
--
-- The rules worth protecting: a client cannot name its own price, only the
-- business that owns a quote can answer it, and an expired offer is not
-- acceptable.
begin;
select plan(22);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'owner@shop.test'),
  ('66666666-6666-6666-6666-666666666666', 'rival@othershop.test'),
  -- The driver and the office. They belong to no business, which is the point:
  -- the collection block below turns on a vendor being told about work these
  -- two did, without either of them being a member of anything.
  ('77777777-7777-7777-7777-777777777777', 'agent@rebin.test'),
  ('33333333-3333-3333-3333-333333333333', 'ops@rebin.test');
insert into profiles (id, full_name, status) values
  ('55555555-5555-5555-5555-555555555555', 'Shop Owner', 'active'),
  ('66666666-6666-6666-6666-666666666666', 'Rival Owner', 'active'),
  ('77777777-7777-7777-7777-777777777777', 'Agent One', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Ops Staff', 'active');
insert into businesses (id, name, business_type, street, city, state, zip, status) values
  ('bbbbbbbb-1111-0000-0000-000000000001', 'Eastside Repair', 'repair_shop', '14 Market St', 'Newark', 'NJ', '07102', 'active'),
  ('bbbbbbbb-2222-0000-0000-000000000002', 'Rival Repair',    'repair_shop', '9 Other St',   'Newark', 'NJ', '07102', 'active');
insert into business_members values
  ('bbbbbbbb-1111-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'biz_owner'),
  ('bbbbbbbb-2222-0000-0000-000000000002', '66666666-6666-6666-6666-666666666666', 'biz_owner');
insert into role_assignments (user_id, role, scope_type, scope_id) values
  ('55555555-5555-5555-5555-555555555555', 'biz_owner', 'business', 'bbbbbbbb-1111-0000-0000-000000000001'),
  ('66666666-6666-6666-6666-666666666666', 'biz_owner', 'business', 'bbbbbbbb-2222-0000-0000-000000000002'),
  ('77777777-7777-7777-7777-777777777777', 'field_agent',  'self',     null),
  ('33333333-3333-3333-3333-333333333333', 'platform_ops', 'platform', null);

set local role authenticated;
set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

-- ---------------------------------------------------------------------------
-- Creating a quote.
-- ---------------------------------------------------------------------------
create temporary table q as select create_quote(
  'bbbbbbbb-1111-0000-0000-000000000001',
  '[{"componentKey":"laptop","grade":"working","quantity":3,"confidence":94,"notes":"Dell","source":"scan"}]'::jsonb
) as id;

select is(
  (select total_cents from quotes where id = (select id from q)),
  27000,
  'the total is 3 x the catalog price, computed from the lines'
);
select is(
  (select unit_price_cents from quote_items where quote_id = (select id from q)),
  9000,
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
  '[{"componentKey":"laptop","grade":"working","quantity":1,"unitPriceCents":999999,"confidence":90}]'::jsonb
) as id;
select is(
  (select total_cents from quotes where id = (select id from q2)),
  9000,
  'a price supplied by the caller is ignored in favour of the catalog'
);

-- ---------------------------------------------------------------------------
-- A quote typed in by hand.
--
-- The camera is the way this portal is meant to be used, but it is not the
-- only way it can be: a vendor with the permission switched off, a dead
-- warehouse light, or a model that will not read the photo still has stock to
-- sell. A hand-typed line has no model behind it, so it carries no confidence
-- and says so -- but it is priced by exactly the same catalog, because a
-- vendor who could type their own price could set their own payout.
-- ---------------------------------------------------------------------------
create temporary table q3 as select create_quote(
  'bbbbbbbb-1111-0000-0000-000000000001',
  '[{"componentKey":"laptop","grade":"broken","quantity":4,"confidence":null,"notes":null,"source":"manual"}]'::jsonb
) as id;

select is(
  (select source from quote_items where quote_id = (select id from q3)),
  'manual',
  'a hand-typed line records that a person entered it, not the camera'
);
select is(
  (select confidence from quote_items where quote_id = (select id from q3)),
  null,
  'a hand-typed line carries no confidence -- there was no model to be unsure'
);
select is(
  (select total_cents from quotes where id = (select id from q3)),
  10000,
  'a hand-typed line is priced by the catalog, same as a scanned one'
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
      '[{"componentKey":"laptop","grade":"working","quantity":1,"confidence":90}]'::jsonb)$$,
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

-- ---------------------------------------------------------------------------
-- What actually came off the dock, told to the side whose money it is (0031).
--
-- 0030 compares the collected count against the quote and holds the payout
-- when they disagree. The agent could see the number they typed and the office
-- could see the flag; the vendor saw an accepted offer that had simply stopped
-- paying, with no sentence anywhere saying why. Silence is the worst possible
-- answer to "where is my money" -- it reads as the platform hoping nobody
-- asks.
-- ---------------------------------------------------------------------------
-- Nothing has been collected against an open offer, so there is nothing to
-- report -- and no row is the honest answer, not a row of nulls that the
-- screen would have to guess its way through.
select is(
  (select count(*)::int from quote_collection((select id from q3))),
  0,
  'a quote nobody has collected against reports no outcome at all'
);

set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
create temporary table cjob as select claim_collection((select id from q)) as id;
select advance_job((select id from cjob), 'en_route');
select advance_job((select id from cjob), 'on_site');
-- Two laptops on the dock against the three the offer covered.
select advance_job((select id from cjob), 'collected', 2);

set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select is(
  (select reconciliation from quote_collection((select id from q))),
  'mismatch',
  'the business is told its payout is being held, not left to wonder'
);
select is(
  (select expected_units from quote_collection((select id from q))),
  3,
  'what the offer covered comes back'
);
select is(
  (select actual_units from quote_collection((select id from q))),
  2,
  'and what the driver actually took, so the screen can name both numbers'
);

-- The agent reads the same quote screen the vendor does -- the job detail
-- screen loads the quote behind the errand, exactly as `quotes_read` has
-- allowed since 0026. Shutting them out here would not hide anything (they
-- typed the count and can read their own job row) -- it would just make the
-- screen they work from fail to load.
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select is(
  (select actual_units from quote_collection((select id from q))),
  2,
  'the agent sent for the stock can still read the quote they collected against'
);

-- The whole reason this goes through a function: the outcome is readable
-- through the quote, and a quote belongs to one business.
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select throws_ok(
  format($$select * from quote_collection(%L)$$, (select id from q)),
  '42501',
  null,
  'a rival cannot read the collection behind another business''s quote'
);

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select resolve_collection_units((select id from cjob), 'vendor sold one before pickup');

set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select is(
  (select reconciliation from quote_collection((select id from q))),
  'resolved',
  'the business learns when the hold is lifted'
);
select is(
  (select resolution_note from quote_collection((select id from q))),
  'vendor sold one before pickup',
  'and reads the reason, which is the only account of it anyone will have'
);

select * from finish();
rollback;
