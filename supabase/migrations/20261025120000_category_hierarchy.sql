-- ============================================================
--  Category hierarchy (unlimited depth)
--  Books keep storing the category NAME as text, so renaming and book
--  reassignment keep working unchanged. Sub-category navigation is driven
--  by parent_id; books in a subtree are found client-side by name.
-- ============================================================

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete restrict;

alter table public.categories
  drop constraint if exists categories_parent_not_self;
alter table public.categories
  add constraint categories_parent_not_self check (parent_id is null or parent_id <> id);

create index if not exists categories_parent_sort_idx
  on public.categories (parent_id, sort);

-- Deleting a category must never orphan its subtree: direct children move up
-- to the deleted category's parent (appended after the new siblings) before
-- the row is deleted. Atomic, admin-only.
create or replace function public.admin_delete_category(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
  v_sort int;
  v_child record;
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;

  select parent_id into v_parent from public.categories where id = p_id;
  if not found then
    return;
  end if;

  select coalesce(max(sort), 0) into v_sort
    from public.categories
   where parent_id is not distinct from v_parent;

  for v_child in
    select id from public.categories where parent_id = p_id order by sort
  loop
    v_sort := v_sort + 10;
    update public.categories
       set parent_id = v_parent,
           sort = v_sort
     where id = v_child.id;
  end loop;

  delete from public.categories where id = p_id;
end;
$$;

revoke all on function public.admin_delete_category(uuid) from public, anon;
grant execute on function public.admin_delete_category(uuid) to authenticated;
