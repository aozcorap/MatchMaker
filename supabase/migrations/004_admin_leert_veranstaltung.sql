-- Admin leert die Veranstaltung eines Kontos: alle Boxer, Kämpfe und Sicherungen weg, Konto und E-Mail bleiben.
-- Erst ändern (der Trigger legt dabei noch eine Sicherung des alten Stands an), danach alle Sicherungen löschen.
create or replace function public.admin_leere_veranstaltung(p_user uuid, p_zustand jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.ist_admin() then
    raise exception 'nicht erlaubt';
  end if;
  update public.veranstaltungen set zustand = p_zustand where user_id = p_user;
  if not found then
    raise exception 'Veranstaltung nicht gefunden';
  end if;
  delete from public.sicherungen where user_id = p_user;
end;
$$;
revoke all on function public.admin_leere_veranstaltung(uuid, jsonb) from public, anon;
grant execute on function public.admin_leere_veranstaltung(uuid, jsonb) to authenticated;
