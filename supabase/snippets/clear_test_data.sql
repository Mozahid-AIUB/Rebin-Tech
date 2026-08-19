-- Remove the scratch accounts left over from building this, keeping the
-- twelve demo vendors and the operator account.
--
-- What goes: names typed while testing a form ("Collect", "555555"), rows
-- carrying a "(demo)" suffix from an earlier seeding pass, and the probe
-- accounts created to reproduce a signup bug. What stays: the four
-- organizations, four businesses and four suppliers seeded at rebin.demo, and
-- admin@rebin.test.
--
-- Deletes cascade from businesses and organizations to their members, quotes,
-- quote_items, pickup_requests and payouts (see the foreign keys in 0011,
-- 0023 and 0038), so removing the tenant removes everything hanging off it.
-- The auth.users rows are deliberately left alone -- deleting an auth user is
-- a separate, unrecoverable act, and an orphaned login that can no longer
-- reach any tenant is harmless.
--
-- Run it once. Re-running is safe: everything is keyed on a name pattern that
-- nothing surviving matches.

begin;

-- Quotes and requests belonging to the scratch tenants, removed first so the
-- deletes below have nothing referencing them by the time they run. (The
-- cascades would handle it; being explicit makes the row counts readable.)
delete from quote_items
 where quote_id in (
   select q.id from quotes q
     join businesses b on b.id = q.business_id
    where b.name in ('Collect', 'Faisal Yousuf Osman', '555555')
       or b.name like '%(demo)%'
 );

delete from quotes
 where business_id in (
   select id from businesses
    where name in ('Collect', 'Faisal Yousuf Osman', '555555')
       or name like '%(demo)%'
 );

delete from pickup_requests
 where org_id in (
   select id from organizations
    where name like '%(demo)%'
       or name in ('Other Org', '555555')
 );

delete from businesses
 where name in ('Collect', 'Faisal Yousuf Osman', '555555')
    or name like '%(demo)%';

delete from organizations
 where name like '%(demo)%'
    or name in ('Other Org', '555555');

-- The probe profiles from reproducing the signup failure. Matched on the
-- e-mail rather than the name, because the names were whatever the form had
-- in it at the time.
delete from profiles
 where id in (
   select id from auth.users
    where email like 'probe%@rebin.test'
 );

commit;

-- What should be left: 4 organizations, 8 businesses (4 trade + 4 supplier),
-- and nothing named Collect or carrying a (demo) suffix.
select 'organizations' as table_name, count(*) from organizations
union all
select 'businesses', count(*) from businesses
union all
select 'suppliers', count(*) from businesses where business_type = 'supplier'
union all
select 'leftover scratch rows', count(*) from businesses
 where name in ('Collect', 'Faisal Yousuf Osman', '555555') or name like '%(demo)%';
