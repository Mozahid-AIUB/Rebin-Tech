-- What Rebin actually paid, and when.
--
-- A supplier ships, Rebin weighs and sorts, and money moves -- by bank
-- transfer, outside this system. Nothing here initiates a payment. This is the
-- record of one that already happened, which is a different and much smaller
-- thing than a payments integration, and the one the client asked for: "once
-- Rebintech gets the e-waste from supplier, after sort it out, within 7 days
-- supplier will get his payout."
--
-- Two facts are worth distinguishing and the quote status cannot carry both:
-- an accepted quote whose goods have not arrived, and one that arrived and was
-- paid. So arrival is recorded here -- `received_at` -- rather than by adding
-- values to quote_status_enum, which would put a warehouse fact inside an enum
-- about whether a vendor said yes.
--
-- One payout per quote. A quote is a single offer settled once; splitting a
-- payment across two transfers is a bank detail, and `reference` is where that
-- belongs.

create table payouts (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null unique references quotes(id) on delete cascade,

  -- When the shipment reached the warehouse. The seven days the app promises
  -- are counted from here, not from the day the quote was accepted -- a
  -- supplier who sits on a box for a month has not started Rebin's clock.
  received_at   timestamptz not null default now(),

  -- What the scale said, and what that came to. Null until an operator has
  -- weighed and sorted: a row exists from the moment goods arrive, because
  -- "arrived, not yet weighed" is a real state an operator needs to see.
  actual_weight_g  integer check (actual_weight_g is null or actual_weight_g >= 0),
  final_cents      integer check (final_cents is null or final_cents >= 0),

  -- Null until money has actually left. This column, not a status enum, is
  -- what "have I been paid" asks.
  paid_at       timestamptz,
  paid_by       uuid references profiles(id),
  -- Whatever the bank called it. Free text on purpose: Rebin pays by transfer,
  -- and a transfer reference has no shape this schema could usefully enforce.
  reference     text,

  notes         text,
  created_at    timestamptz not null default now()
);

-- The queue an operator works: unpaid, oldest first.
create index payouts_unpaid_idx on payouts (received_at) where paid_at is null;

alter table payouts enable row level security;

-- A supplier reads their own, because the alternative is that they telephone
-- to ask -- and "have you paid me yet" is the single most predictable support
-- call this product will ever get. Platform staff read all of them.
create policy payouts_read on payouts for select using (
  is_platform_staff()
  or exists (
    select 1 from quotes q
     where q.id = payouts.quote_id
       and is_business_member(q.business_id)
  )
);

-- No insert, update or delete policy. Every write goes through the RPCs below,
-- which check is_platform_staff() first -- the same shape as every other
-- money-adjacent write in this schema. A supplier who could write here could
-- mark themselves paid.

/** Record that a consignment arrived. Starts the seven-day clock. */
create or replace function record_consignment_received(
  p_quote_id uuid,
  p_notes    text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_status quote_status_enum;
  v_id     uuid;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can record a consignment' using errcode = '42501';
  end if;

  select status into v_status from quotes where id = p_quote_id;
  if v_status is null then
    raise exception 'No such quote: %', p_quote_id using errcode = 'P0002';
  end if;
  -- Goods against an offer nobody accepted are not a payout waiting to happen.
  if v_status <> 'accepted' then
    raise exception 'Only an accepted quote can have a consignment (this one is %)', v_status
      using errcode = '22023';
  end if;

  insert into payouts (quote_id, notes)
  values (p_quote_id, nullif(p_notes, ''))
  on conflict (quote_id) do nothing
  returning id into v_id;

  -- Already recorded: return the existing row rather than raising. An operator
  -- clicking twice has made no mistake worth an error message.
  if v_id is null then
    select id into v_id from payouts where quote_id = p_quote_id;
  end if;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'payout', v_id, 'payout.received',
          jsonb_build_object('quote_id', p_quote_id));

  return v_id;
end;
$$;

/**
 * What the scale said, and what it is worth.
 *
 * The final figure is passed in rather than derived here: an operator sorting
 * a mixed pallet is pricing several components against the catalog, and that
 * arithmetic lives where the sorting happens. What this enforces is that the
 * number is recorded alongside the weight it came from, so a supplier asking
 * "why this much" has both halves of the answer.
 */
create or replace function record_consignment_weighed(
  p_quote_id        uuid,
  p_actual_weight_g integer,
  p_final_cents     integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can weigh a consignment' using errcode = '42501';
  end if;
  if p_actual_weight_g < 0 or p_final_cents < 0 then
    raise exception 'A weight and a payout cannot be negative' using errcode = '22023';
  end if;
  if not exists (select 1 from payouts where quote_id = p_quote_id) then
    raise exception 'That consignment has not been recorded as received' using errcode = 'P0002';
  end if;
  -- Reweighing after payment would change what a supplier was told they were
  -- paid, after they were paid it.
  if exists (select 1 from payouts where quote_id = p_quote_id and paid_at is not null) then
    raise exception 'That payout has already been paid' using errcode = '22023';
  end if;

  update payouts
     set actual_weight_g = p_actual_weight_g,
         final_cents     = p_final_cents
   where quote_id = p_quote_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'payout', (select id from payouts where quote_id = p_quote_id),
          'payout.weighed',
          jsonb_build_object('actual_weight_g', p_actual_weight_g, 'final_cents', p_final_cents));
end;
$$;

/** Money has left. A record, not a transfer. */
create or replace function record_payout_paid(
  p_quote_id  uuid,
  p_reference text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_final integer;
begin
  if not is_platform_staff() then
    raise exception 'Only platform staff can record a payment' using errcode = '42501';
  end if;

  select final_cents into v_final from payouts where quote_id = p_quote_id;
  if not found then
    raise exception 'That consignment has not been recorded as received' using errcode = 'P0002';
  end if;
  -- Paying before weighing means paying a figure nobody has checked.
  if v_final is null then
    raise exception 'Weigh the consignment before recording a payment' using errcode = '22023';
  end if;
  if exists (select 1 from payouts where quote_id = p_quote_id and paid_at is not null) then
    raise exception 'That payout is already recorded as paid' using errcode = '22023';
  end if;

  update payouts
     set paid_at   = now(),
         paid_by   = auth.uid(),
         reference = nullif(p_reference, '')
   where quote_id = p_quote_id;

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'payout', (select id from payouts where quote_id = p_quote_id),
          'payout.paid',
          jsonb_build_object('final_cents', v_final, 'reference', p_reference));
end;
$$;
