-- Catalog v3 shipped with v2's graded rows still attached.
--
-- 0035 created a draft and set eighteen weight-priced rows on it. But
-- `create_price_catalog_draft` (0021) seeds a new draft by copying every row
-- from the active version -- which is the right behaviour for an operator
-- adjusting rates, and the wrong assumption for a migration replacing the
-- pricing model wholesale.
--
-- So the draft arrived already holding v2's fifty-four rows, and the eighteen
-- `set_price_item` calls upserted on (component_key, grade). Only the `parts`
-- rows matched. The thirty-six `working` and `broken` rows survived the
-- publish, and the live catalog went out priced both ways at once:
--
--   laptop / working  each  9000c   (no weight)
--   laptop / broken   each  2500c   (no weight)
--   laptop / parts    lb      80c   2000g
--
-- Which means the defect v3 existed to remove -- a vendor choosing between a
-- laptop worth 700 cents and one worth 9000 -- was still live after v3
-- published. The weight rows were correct; they were just not alone.
--
-- This drops the graded rows from the active catalog, leaving the eighteen
-- weight-priced ones. It touches no retired version: v1 and v2 keep every row
-- they published, because five accepted quotes were priced against them and a
-- quote whose catalog rows vanished is a quote nobody can explain.

do $$
declare
  v_active  uuid;
  v_removed integer;
  v_left    integer;
begin
  select id into v_active from price_catalog_versions where status = 'active';
  if v_active is null then
    raise exception 'No active catalog to prune';
  end if;

  -- Priced per item, i.e. carrying no weight. Keyed on avg_weight_g rather
  -- than on grade: the column that decides how a line is priced is the honest
  -- thing to filter by, and it stays correct if a future catalog ever prices
  -- something graded by weight.
  delete from price_items
   where catalog_version_id = v_active
     and avg_weight_g is null;
  get diagnostics v_removed = row_count;

  select count(*) into v_left from price_items where catalog_version_id = v_active;

  if v_left = 0 then
    raise exception 'Pruning would empty the active catalog -- refusing';
  end if;

  raise notice 'Pruned % per-item rows, % weight-priced rows remain', v_removed, v_left;
end $$;

-- The first attempt at 0035 failed partway (the SQL editor has no auth.uid(),
-- so create_price_catalog_draft's is_platform_staff() check refused it) and
-- left an empty draft behind. An operator opening Prices would see two drafts
-- and no way to tell which is theirs, so the abandoned one goes.
delete from price_catalog_versions v
 where v.status = 'draft'
   and not exists (select 1 from price_items i where i.catalog_version_id = v.id);

-- Expect: the active version, 18 rows, all weighted, none graded or per-item.
select v.version,
       v.status,
       count(i.id)                                 as items,
       count(i.avg_weight_g)                       as weighted,
       count(*) filter (where i.grade <> 'parts')  as non_parts,
       count(*) filter (where i.unit  <> 'lb')     as non_lb
  from price_catalog_versions v
  left join price_items i on i.catalog_version_id = v.id
 where v.status = 'active'
 group by v.id, v.version, v.status;
