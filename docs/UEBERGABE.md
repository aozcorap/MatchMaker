# Übergabe: Stand des Projekts "Matchmaking Boxen"

Dieses Dokument ist für eine neue Arbeitssitzung gedacht. Fachliche Regeln stehen in `ANFORDERUNGEN.md`.

## Begriffe
In der Oberfläche und im PDF heißt die Kampfkarte "Kampfpaarungen" (Reiter, Überschrift, PDF-Titel, Dateiname `Kampfpaarungen-<Datum>.pdf`). Im Code und in den gespeicherten Daten bleibt der Name `kampfkarte`, damit bestehende Veranstaltungen und Sicherungen lesbar bleiben. Die Fachtexte (`ANFORDERUNGEN.md`) sagen weiterhin "Kampfkarte".

## Zweck
Webseite für Veranstalter von Amateur-Boxveranstaltungen: Meldungen einlesen, Einzelpaarungen nach den DBV-Wettkampfbestimmungen 2025 vorschlagen, Kampfkarte mit Zeitplan bearbeiten, als PDF ausgeben. Live: https://aozcorap.github.io/MatchMaker/

## Zusammenarbeit mit dem Auftraggeber (Ahmet, Veranstalter)
- Deutsch, kurz, ehrlich, ohne Floskeln, keine technische Sprache. Unbequemes zuerst sagen, Gesichertes von Vermutung trennen, nichts erfinden, im Zweifel nachfragen.
- Regeln, die der Auftraggeber setzt, gelten, auch wenn sie strenger als die WB sind (z. B. Klassenwechsel nur mit Freigabe). Abweichungen von den WB ehrlich benennen.
- Das Repository und die Webseite sind **öffentlich**: keine echten Namen, Geburtsdaten oder Screenshots echter Boxer einchecken. Beispieldaten sind erfunden; die frühere Simulation (Knopf "Testdaten laden", Ordner testdaten, Demo-Daten) wurde entfernt.
- Pull Requests nur auf ausdrückliche Bitte.

## Technik
- TypeScript, React 19, Vite 8, vitest 5. Prüfen mit `npm run typecheck` und `npm test`, bauen mit `npm run build` (Demo: `npm run build:demo`).
- Regelwerk ohne Oberfläche in `src/regeln/` (`paarung.ts` Prüfung, `generator.ts` Paarungen, `kampfkarte.ts` Ecken/Sortierung, `zeitplan.ts` Zeiten, `klassen.ts`).
- Zustand einer Veranstaltung: `src/speicher.ts` (`Zustand`, `liesZustand` prüft und ergänzt Standardwerte).
- Oberfläche: `src/App.tsx` (Reiter Boxer/Kampfkarte/Import), `KampfkarteTab.tsx`, `BoxerTab.tsx`, `ImportTab.tsx`, Filter, Dialoge.
- Import: `src/importieren/` (Excel/CSV/Text/Chat; Screenshots per Texterkennung `tesseract.js` im Browser, Dateien werden vom Vite-Plugin in `dist/ocr/` bereitgestellt). Wichtig: Bilder mit `createImageBitmap(..., {colorSpaceConversion:'none'})` lesen, sonst verändert der Browser die Farben und die Tabellenlinien-Entfernung scheitert. `scripts/ocr-labor.ts` probiert die Bildaufbereitung in Node aus.
- PDF: `src/pdfdoc.ts` (Layout, pdfmake) und `src/pdf.ts` (Download). Jeder Kampf bleibt mit den Pausen davor auf einer Seite.
- Konten: `src/konto/` (Supabase-Anmeldung, Speichern mit Versionsprüfung, Sicherungen, Admin-Funktionen), Einstieg `src/Wurzel.tsx`. Die Demo (`DEMO`) läuft ohne Konto.
- Veröffentlichung: `.github/workflows/pages.yml` baut und veröffentlicht bei jedem Push auf `main` (Typprüfung, Tests, Build).

## Funktionsstand
Fertig und getestet: Regeln und Generator, Kampfkarte mit Zeitplan/Pausen/Ausfällen/Verschieben, Filter, Import (Excel, CSV, Text, Screenshots; Prüfansicht; Verein aus Signatur; Doppelte werden erkannt: gleiches Geburtsdatum und gleicher Name, unabhängig von Reihenfolge, Umlauten und einem Tippfehler; schon vorhandene und spätere Wiederholungen in derselben Eingabe sind nicht vorgewählt, geänderte Angaben wie Gewicht oder Bilanz werden in der Prüfansicht angezeigt, aber nicht automatisch übernommen), PDF-Export (mit Alters- und Gewichtsklasse je Boxer), Konten mit Registrierung/Passwort vergessen, automatische Speicherung je Veranstalter, Datensicherung mit Wiederherstellung, Admin-Übersicht mit Ansehen (nur lesen) und Löschen.

Einstellungen in der Kampfkarte: Rundenzeit Erwachsene/U19 (3 × 3 oder 3 × 2 Minuten, Standard 3 × 3; wirkt auf Zeitplan, Anzeige und PDF), max. Gewichtsdifferenz in % (10), max. Siegdifferenz bei Freigabe (5), "Andere Alters- oder Gewichtsklasse nur mit Freigabe" (an; die WB erlauben das laut §11.9 und §19.6 ohne Zustimmung, der Auftraggeber will es strenger).

## Supabase
- Projekt `matchmaker`, Ref `ymqzqfrskvmpyamvmnbe`, Region eu-central-1 (Frankfurt), kostenloser Plan, Organisation "ahmet@ozcorapci.de's Org".
- URL und veröffentlichbarer Schlüssel stehen in `src/konto/client.ts` (für den Browser gedacht). Der Schutz der Daten liegt in den Zugriffsregeln (RLS).
- Datenbank: `supabase/migrations/001..006` (001 bis 005 angewendet; **006 (`eigene_daten_loeschen`) muss noch im SQL-Editor des Supabase-Dashboards ausgeführt werden**, sonst funktionieren "Veranstaltung leeren" und "Konto löschen" unter "Konto und Daten" nicht). Tabellen `admins`, `veranstaltungen` (eine je Konto, Zustand als JSON, Versionszähler), `sicherungen`.
- Admin: Tabelle `admins`, Eintrag `ahmet@ozcorapci.de`. Admin sieht alle Veranstaltungen nur lesend und kann sie leeren (Boxer, Kämpfe, Sicherungen weg; Konto und E-Mail bleiben).
- Im Dashboard gesetzt: Authentication → URL Configuration, Site URL und Redirect URL = `https://aozcorap.github.io/MatchMaker/`.
- Hinweis zu den Werkzeugen: Über den Supabase-Zugang der Sitzung hängen Anweisungen mit `DELETE FROM` (vermutlich eine nicht beantwortete Bestätigung). Das nicht umgehen, sondern Löschen über die Oberfläche der App oder das Dashboard machen.

## Impressum und Datenschutz
`src/rechtliches.tsx` (Seiten über `#/impressum` und `#/datenschutz`, Links im Fuß jeder Seite, beim Registrieren Häkchen "Datenschutzerklärung gelesen", Hinweis "nur erfundene Daten" auf der Anmeldeseite). Die Anschrift steht in `BETREIBER`. **Offen:** die Texte juristisch prüfen lassen. Die Datenschutzerklärung ist ein Entwurf nach dem Stand der Technik (Supabase Frankfurt, Hosting GitHub Pages, keine Tracking-Dienste). Eine Vereinbarung zur Auftragsverarbeitung mit den Veranstaltern gibt es noch nicht.

## Offene Punkte
1. E-Mails kommen vom Standard-Absender von Supabase, englisch und stark begrenzt. Vor dem echten Betrieb: eigener SMTP-Dienst mit eigener Absenderadresse und deutsche Vorlagen.
2. Datenschutz (Namen, Geburtsdaten, teils Minderjährige): Datenschutzerklärung und Auftragsverarbeitung klären, bevor echte Veranstalter die Seite nutzen. Der kostenlose Plan pausiert ungenutzte Projekte nach etwa einer Woche (Wissensstand): `.github/workflows/supabase-wachhalten.yml` fragt die Datenbank alle drei Tage ab (bei Fehlschlag schickt GitHub eine E-Mail; geplante Läufe stoppen nach 60 Tagen ohne Aktivität im Repository). Der kostenlose Plan hat keine automatischen Backups (Wissensstand): Admin lädt unter "Alle Veranstaltungen" regelmäßig die Gesamtsicherung herunter.
3. Screenshots: Texterkennung im Browser, ohne KI und ohne API. Sie ist bei stark komprimierten JPGs, schmalen Handy-Tabellen und Fotos von Bildschirmen unzuverlässig; alle Zahlen müssen in der Prüfansicht kontrolliert werden. Entschieden: Eine KI-Bilderkennung über einen Server brauchen wir nicht. Sicherer Weg sind Excel-Dateien, eingefügter Text und saubere Screenshots (Cmd+Shift+4).
4. Gewichtstoleranz (Klassenbreite des Leichteren, höchstens 10 %, einstellbar) und Rundenzeit sind bestätigt. Volltext der WB in `docs/Wettkampfbestimmungen-DBV-2025.pdf`. Heimverein und blaue Ecke (WB §4.6) entfallen: Bei diesen Veranstaltungen gibt es keinen Heimverein.
5. Veranstalter löschen ihre Daten selbst unter "Konto und Daten" (Veranstaltung leeren, Konto löschen; Admin-Konto ausgenommen). Kein Mehrbenutzerbetrieb pro Konto (bewusst: eine Person je Konto).
6. Die Demo-Datei (`dist-demo`) ist durch die PDF-Schriften auf etwa 2 MB gewachsen.
7. Bezahlmethode: Konzept mit Stripe (10 Euro pro Veranstaltung inkl. USt, Kosten, Ablauf, offene Entscheidungen) in `docs/BEZAHLKONZEPT.md`. Noch nicht gebaut; erst Impressum und Datenschutz (Punkt 2) und die steuerliche Klärung.


## Bewusst nicht gebaut (entschieden)
KI-Bilderkennung für Fotos, Hinweis bei Ende nach Mitternacht, Prüfung des US-Datumsformats (03/04/2009), Ausschluss versteckter Excel-Blätter, Barrierefreiheit der Knöpfe, Heimverein und blaue Ecke, Sonderdauer der automatischen Pause beim Verschieben aufräumen, zwei kleine Datenbank-Absicherungen (E-Mail im Konto, Form der gespeicherten Daten), Passwort-Mindestlänge in Supabase.
