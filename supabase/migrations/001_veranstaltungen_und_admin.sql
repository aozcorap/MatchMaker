-- Admin-Liste, Veranstaltungen (eine je Konto) und Zugriffsregeln. Projekt: matchmaker (eu-central-1).
create table public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- keine Policy: nur über die Funktion ist_admin() lesbar
insert into public.admins (email) values ('ahmet@ozcorapci.de');

create or replace function public.ist_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.ist_admin() from public, anon;
grant execute on function public.ist_admin() to authenticated;

create table public.veranstaltungen (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default coalesce(auth.jwt() ->> 'email', ''),
  zustand jsonb not null,
  version integer not null default 1,
  aktualisiert timestamptz not null default now()
);
alter table public.veranstaltungen enable row level security;

create policy "eigene lesen" on public.veranstaltungen
  for select to authenticated using (user_id = (select auth.uid()));
create policy "eigene anlegen" on public.veranstaltungen
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "eigene ändern" on public.veranstaltungen
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "eigene löschen" on public.veranstaltungen
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "admin liest alle" on public.veranstaltungen
  for select to authenticated using ((select public.ist_admin()));

create or replace function public.setze_aktualisiert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.aktualisiert := now();
  new.version := old.version + 1;
  return new;
end;
$$;
create trigger veranstaltungen_aktualisiert
  before update on public.veranstaltungen
  for each row execute function public.setze_aktualisiert();
