-- A supplier: someone who collects e-waste and sells it on.
--
-- "A supplier can be anyone who wants to do business. Rakib collects e-waste
-- from stores, stores it, manages e-waste from neighbours -- he is a supplier,
-- he can sell his e-waste to us."
--
-- Modelled as a business_type rather than a new table. A supplier and a
-- business are quoted from the same catalog at the same rates, so they are the
-- same kind of thing to every part of this schema: business_members,
-- is_business_member(), the quotes foreign key and the RLS policies all apply
-- unchanged. What differs is one rule -- a supplier ships to the warehouse and
-- never books a pickup -- and a rule does not need its own table.

alter type business_type_enum add value if not exists 'supplier';

-- Enum values are not visible to later statements in the same transaction, so
-- anything reading 'supplier' must land in its own migration or after a
-- commit. That is why the guard below compares text rather than the enum.

/** Is this business a supplier, i.e. ships rather than being collected from. */
create or replace function is_supplier(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from businesses
     where id = p_business_id
       and business_type::text = 'supplier'
  );
$$;

comment on function is_supplier(uuid) is
  'True when the business ships to the warehouse instead of booking a pickup.';
