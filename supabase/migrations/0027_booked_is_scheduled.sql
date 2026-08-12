-- A booked pickup reaches a driver.
--
-- pickup_requests defaulted to 'pending', and the job board only shows
-- 'scheduled'. Moving between the two needs advance_pickup_request, which only
-- platform staff may call -- and there is no platform staff account, no admin
-- screen, and no queue anyone is working. So every pickup an organization
-- booked sat in 'pending' forever, invisible to every agent. Three were
-- already stuck that way in production.
--
-- The states themselves were not wrong; the review they imply is. An
-- organization picks its own date and window two business days out, and
-- nothing about that needs a human to agree before a driver can see it. The
-- quote side already works this way: a vendor accepts, and the collection is
-- on the board.
--
-- 'pending' and 'under_review' stay in the enum and stay reachable through
-- advance_pickup_request. When there is a reason to hold a booking back --
-- capacity, an address out of area -- the states and the transitions are
-- there. What changes is that nothing lands in them by default.
alter table pickup_requests alter column status set default 'scheduled';

-- The three already stranded. They were booked in good faith and no agent has
-- ever been able to see them.
update pickup_requests
   set status = 'scheduled'
 where status in ('pending', 'under_review');

/**
 * What a customer sees while a pickup is waiting for a driver.
 *
 * 'scheduled' is accurate to the system and cold to a customer, who booked a
 * date rather than a state. The request detail screen reads this rather than
 * the enum, so the two can differ without either lying.
 */
create or replace function request_status_label(p_status request_status_enum)
returns text language sql immutable as $$
  select case p_status
    when 'pending'      then 'Received'
    when 'under_review' then 'Being checked'
    when 'scheduled'    then 'Booked in'
    when 'dispatched'   then 'Agent assigned'
    when 'in_transit'   then 'On the way'
    when 'completed'    then 'Collected'
    when 'cancelled'    then 'Cancelled'
  end;
$$;
