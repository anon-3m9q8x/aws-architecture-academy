-- Academy-only table and function; existing NutriPath data is not changed.
-- Run once in the Supabase SQL Editor. Safe to rerun for this schema version.
create table if not exists public.academy_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint academy_data_shape check (
    jsonb_typeof(data) = 'object'
    and data ?& array['format', 'records']
    and coalesce(data ->> 'format', '') = 'aws-academy-v1'
    and jsonb_typeof(data -> 'records') = 'object'
    and octet_length(data::text) <= 4194304
  )
);

alter table public.academy_accounts enable row level security;
revoke all on public.academy_accounts from public, anon, authenticated;
grant select, insert, update on public.academy_accounts to authenticated;

drop policy if exists "Read own Academy data" on public.academy_accounts;
create policy "Read own Academy data" on public.academy_accounts
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own Academy data" on public.academy_accounts;
create policy "Insert own Academy data" on public.academy_accounts
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own Academy data" on public.academy_accounts;
create policy "Update own Academy data" on public.academy_accounts
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Compare-and-swap prevents two devices silently overwriting each other.
-- SECURITY INVOKER keeps RLS enforced, including for calls to this RPC.
create or replace function public.save_academy_state(
  p_data jsonb, p_expected_revision bigint, p_user_id uuid
) returns setof public.academy_accounts
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or uid is distinct from p_user_id then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_expected_revision = 0 then
    return query insert into public.academy_accounts (user_id, data)
      values (uid, p_data) on conflict (user_id) do nothing returning *;
  else
    return query update public.academy_accounts
      set data = p_data, revision = revision + 1, updated_at = now()
      where user_id = uid and revision = p_expected_revision returning *;
  end if;
  if not found then
    raise exception 'Data changed on another device' using errcode = 'PT409';
  end if;
end;
$$;

revoke all on function public.save_academy_state(jsonb, bigint, uuid) from public, anon;
grant execute on function public.save_academy_state(jsonb, bigint, uuid) to authenticated;
