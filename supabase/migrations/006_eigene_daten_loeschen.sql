-- Veranstalter löschen ihre Daten selbst.
-- 1) Veranstaltung leeren: alle Boxer, Kämpfe und Sicherungen des eigenen Kontos weg, das Konto bleibt.
--    Erst ändern (der Trigger legt dabei noch eine Sicherung des alten Stands an), danach alle Sicherungen löschen.
create or replace function public.leere_meine_veranstaltung(p_zustand jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  update public.veranstaltungen set zustand = p_zustand where user_id = auth.uid();
  delete from public.sicherungen where user_id = auth.uid();
end;
$$;
revoke all on function public.leere_meine_veranstaltung(jsonb) from public, anon;
grant execute on function public.leere_meine_veranstaltung(jsonb) to authenticated;

-- 2) Konto löschen: Konto, Veranstaltung und Sicherungen endgültig weg (die Fremdschlüssel löschen mit).
--    Das Admin-Konto kann sich nicht selbst löschen.
create or replace function public.loesche_mein_konto()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'nicht angemeldet';
  end if;
  if public.ist_admin() then
    raise exception 'Das Admin-Konto kann hier nicht gelöscht werden';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.loesche_mein_konto() from public, anon;
grant execute on function public.loesche_mein_konto() to authenticated;
