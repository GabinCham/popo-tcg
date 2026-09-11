-- Tables PopoTCG. Isolées par le préfixe popo_.

create table if not exists public.popo_owned_sec (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

comment on table public.popo_owned_sec is
  'Cartes SEC One Piece possédées par un compte PopoTCG.';

alter table public.popo_owned_sec enable row level security;

revoke all on public.popo_owned_sec from anon, authenticated;
grant select, insert, delete on public.popo_owned_sec to authenticated;

drop policy if exists popo_owned_sec_select_own on public.popo_owned_sec;
drop policy if exists popo_owned_sec_insert_own on public.popo_owned_sec;
drop policy if exists popo_owned_sec_delete_own on public.popo_owned_sec;

create policy popo_owned_sec_select_own on public.popo_owned_sec
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy popo_owned_sec_insert_own on public.popo_owned_sec
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy popo_owned_sec_delete_own on public.popo_owned_sec
  for delete to authenticated
  using (user_id = (select auth.uid()));
