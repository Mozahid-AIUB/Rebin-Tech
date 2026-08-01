-- Let a user edit their own name, phone and avatar.
--
-- Deliberately an RPC rather than an `update` RLS policy on profiles. A policy
-- like `using (id = auth.uid())` would let a user write EVERY column on their
-- own row -- including `status`, which is the account_status_enum that gates
-- access. Anyone could then flip themselves from 'pending_verification' to
-- 'active' with one PATCH and skip verification entirely. Postgres RLS has no
-- per-column restriction for updates, so the safe form is a function that
-- writes only the three columns a user owns.
-- Both optional args carry defaults so the generated TypeScript types treat
-- them as nullable/optional; without a default, supabase gen types emits a
-- non-null `string` and every call site has to lie about clearing a field.
create or replace function update_own_profile(
  p_full_name text,
  p_phone text default null,
  p_avatar_url text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  -- An empty string from a cleared input means "no phone", not "phone is ''".
  p_phone := nullif(trim(coalesce(p_phone, '')), '');
  -- auth.uid(), never a caller-supplied id: a user id parameter would let
  -- anyone edit anyone by passing someone else's uuid.
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if length(trim(p_full_name)) < 2 then
    raise exception 'Full name is required';
  end if;

  -- Matches the 10-digit US phone the signup schemas enforce client-side.
  -- Server-side too, because the client is not a trust boundary.
  if p_phone is not null and p_phone !~ '^\d{10}$' then
    raise exception 'Enter a 10-digit US phone number';
  end if;

  update profiles
     set full_name  = trim(p_full_name),
         phone      = p_phone,
         avatar_url = coalesce(p_avatar_url, avatar_url)
   where id = auth.uid();

  insert into audit_events (actor_id, entity_type, entity_id, action, payload_json)
  values (auth.uid(), 'profile', auth.uid(), 'profile.updated', '{}'::jsonb);
end;
$$;
