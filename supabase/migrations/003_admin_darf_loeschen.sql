-- Admin darf Veranstaltungen und Sicherungen sehen und löschen.
create policy "admin löscht veranstaltungen" on public.veranstaltungen
  for delete to authenticated using ((select public.ist_admin()));
create policy "admin liest sicherungen" on public.sicherungen
  for select to authenticated using ((select public.ist_admin()));
create policy "admin löscht sicherungen" on public.sicherungen
  for delete to authenticated using ((select public.ist_admin()));
