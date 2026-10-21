-- Sicherungen begrenzen: je Veranstaltung höchstens 20 automatische und 50 manuelle, die ältesten fallen weg.
-- Läuft nach jedem Einfügen einer Sicherung. Löscht der Admin eine Veranstaltung, gehen alle Sicherungen ohnehin weg.
create or replace function public.raeume_sicherungen_auf()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sicherungen s
  where s.user_id = new.user_id and not s.manuell
    and s.id not in (
      select t.id from public.sicherungen t
      where t.user_id = new.user_id and not t.manuell
      order by t.erstellt desc, t.id desc limit 20
    );
  delete from public.sicherungen s
  where s.user_id = new.user_id and s.manuell
    and s.id not in (
      select t.id from public.sicherungen t
      where t.user_id = new.user_id and t.manuell
      order by t.erstellt desc, t.id desc limit 50
    );
  return null;
end;
$$;
revoke all on function public.raeume_sicherungen_auf() from public, anon, authenticated;

create trigger sicherungen_aufraeumen
  after insert on public.sicherungen
  for each row execute function public.raeume_sicherungen_auf();

-- Einmalig: schon vorhandene überzählige Sicherungen aufräumen.
delete from public.sicherungen s
where s.id in (
  select x.id from (
    select id, manuell,
           row_number() over (partition by user_id, manuell order by erstellt desc, id desc) as rang
    from public.sicherungen
  ) x
  where (not x.manuell and x.rang > 20) or (x.manuell and x.rang > 50)
);
