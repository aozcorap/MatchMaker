-- Datensicherung: frühere Stände je Veranstaltung.
create table public.sicherungen (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  zustand jsonb not null,
  erstellt timestamptz not null default now(),
  manuell boolean not null default false,
  boxer integer not null default 0,
  kaempfe integer not null default 0
);
create index sicherungen_user_zeit on public.sicherungen (user_id, erstellt desc);
alter table public.sicherungen enable row level security;

create policy "eigene sicherungen lesen" on public.sicherungen
  for select to authenticated using (user_id = (select auth.uid()));
create policy "eigene sicherung anlegen" on public.sicherungen
  for insert to authenticated with check (user_id = (select auth.uid()) and manuell);

-- Automatische Sicherung: vor einer Änderung wird der alte Stand abgelegt, höchstens alle 10 Minuten.
create or replace function public.sichere_alten_stand()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.zustand is distinct from new.zustand
     and (jsonb_array_length(old.zustand -> 'boxer') > 0 or jsonb_array_length(old.zustand -> 'kampfkarte') > 0)
     and not exists (
       select 1 from public.sicherungen s
       where s.user_id = old.user_id and s.erstellt > now() - interval '10 minutes'
     ) then
    insert into public.sicherungen (user_id, zustand, boxer, kaempfe)
    values (old.user_id, old.zustand, jsonb_array_length(old.zustand -> 'boxer'), jsonb_array_length(old.zustand -> 'kampfkarte'));
  end if;
  return new;
end;
$$;
revoke all on function public.sichere_alten_stand() from public, anon, authenticated;
create trigger veranstaltungen_sicherung
  before update on public.veranstaltungen
  for each row execute function public.sichere_alten_stand();
