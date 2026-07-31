-- The first platform owner can only be seeded, never self-registered.
-- Replace the UUID with the founder's auth.users id before the first deploy.
insert into role_assignments (user_id, role, scope_type)
select '00000000-0000-0000-0000-000000000001'::uuid, 'platform_owner', 'platform'
where exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001');
