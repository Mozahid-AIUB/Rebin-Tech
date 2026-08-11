-- What an organization has actually recycled.
--
-- The dashboard has been computing its stats from the five requests it loads
-- for the list. That was fine while every number described work in flight --
-- an org has a handful of those -- but "devices recycled" is a lifetime total,
-- and reading it off the five most recent rows would undercount every
-- organization that has used the product for more than a month.
--
-- Possible at all only now: until job_assignments existed (0024) no request
-- could reach 'completed', so this would have been a permanent zero.
create or replace function my_org_summary(p_org_id uuid)
returns table (
  active_count      bigint,
  active_devices    bigint,
  next_pickup       timestamptz,
  completed_count   bigint,
  -- What the agent counted onto the truck, falling back to what was booked
  -- for any pickup completed before agents recorded counts. The customer's
  -- recycling record should say what was collected, not what was promised.
  devices_recycled  bigint
) language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where r.status in ('pending','under_review','scheduled','dispatched','in_transit')),
    coalesce(sum(r.unit_count) filter (where r.status in ('pending','under_review','scheduled','dispatched','in_transit')), 0),
    min(r.window_start) filter (where r.status in ('pending','under_review','scheduled','dispatched','in_transit')),
    count(*) filter (where r.status = 'completed'),
    coalesce(sum(coalesce(a.actual_units, r.unit_count)) filter (where r.status = 'completed'), 0)
  from pickup_requests r
  left join job_assignments a
    on a.request_id = r.id and a.status = 'collected'
  where r.org_id = p_org_id
    and (is_org_member(p_org_id) or is_platform_staff());
$$;
