# Übergabe: Stand des Projekts "Matchmaking Boxen"

Dieses Dokument ist für eine neue Arbeitssitzung gedacht. Fachliche Regeln stehen in `ANFORDERUNGEN.md`.

## Begriffe
In der Oberfläche und im PDF heißt die Kampfkarte "Kampfpaarungen" (Reiter, Überschrift, PDF-Titel, Dateiname `Kampfpaarungen-<Datum>.pdf`). Im Code und in den gespeicherten Daten bleibt der Name `kampfkarte`, damit bestehende Veranstaltungen und Sicherungen lesbar bleiben. Die Fachtexte (`ANFORDERUNGEN.md`) sagen weiterhin "Kampfkarte".

## Zweck
Webseite für Veranstalter von Amateur-Boxveranstaltungen: Meldungen einlesen, Einzelpaarungen nach den DBV-Wettkampfbestimmungen 2025 vorschlagen, Kampfkarte mit Zeitplan bearbeiten, als PDF ausgeben. Live: https://aozcorap.github.io/MatchMaker/

## Zusammenarbeit mit dem Auftraggeber (Ahmet, Veranstalter)
- Deutsch, kurz, ehrlich, ohne Floskeln, keine technische Sprache. Unbequemes zuerst sagen, Gesichertes von Vermutung trennen, nichts erfinden, im Zweifel nachfragen.
- Regeln, die der Auftraggeber setzt, gelten, auch wenn sie strenger als die WB sind (z. B. Klassenwechsel nur mit Freigabe). Abweichungen von den WB ehrlich benennen.
- Das Repository und die Webseite sind **öffentlich**: keine echten Namen, Geburtsdaten oder Screenshots echter Boxer einchecken. Testdaten sind erfunden.
- Pull Requests nur auf ausdrückliche Bitte.

## Technik
- TypeScript, React 19, Vite 8, vitest 5. Prüfen mit `npm run typecheck` und `npm test`, bauen mit `npm run build` (Demo: `npm run build:demo`).
- Regelwerk ohne Oberfläche in `src/regeln/` (`paarung.ts` Prüfung, `generator.ts` Paarungen, `kampfkarte.ts` Ecken/Sortierung, `zeitplan.ts` Zeiten, `klassen.ts`).
- Zustand einer Veranstaltung: `src/speicher.ts` (`Zustand`, `liesZustand` prüft und ergänzt Standardwerte).
- Oberfläche: `src/App.tsx` (Reiter Boxer/Kampfkarte/Import), `KampfkarteTab.tsx`, `BoxerTab.tsx`, `ImportTab.tsx`, Filter, Dialoge.
- Import: `src/importieren/` (Excel/CSV/Text/Chat; Screenshots per Texterkennung `tesseract.js` im Browser, Dateien werden vom Vite-Plugin in `dist/ocr/` bereitgestellt). Wichtig: Bilder mit `createImageBitmap(..., {colorSpaceConversion:'none'})` lesen, sonst verändert der Browser die Farben und die Tabellenlinien-Entfernung scheitert. `scripts/ocr-labor.ts` probiert die Bildaufbereitung in Node aus.
- PDF: `src/pdfdoc.ts` (Layout, pdfmake) und `src/pdf.ts` (Download). Jeder Kampf bleibt mit den Pausen davor auf einer Seite.
- Konten: `src/konto/` (Supabase-Anmeldung, Speichern mit Versionsprüfung, Sicherungen, Admin-Funktionen), Einstieg `src/Wurzel.tsx`. Die Demo (`DEMO`) läuft ohne Konto.
- Veröffentlichung: `.github/workflows/pages.yml` baut und veröffentlicht bei jedem Push auf `main` und auf `claude/zen-cannon-ty3o2q` (Typprüfung, Tests, Build).

## Funktionsstand
Fertig und getestet: Regeln und Generator, Kampfkarte mit Zeitplan/Pausen/Ausfällen/Verschieben, Filter, Import (Excel, CSV, Text, Screenshots; Prüfansicht; Verein aus Signatur), PDF-Export (mit Alters- und Gewichtsklasse je Boxer), Konten mit Registrierung/Passwort vergessen, automatische Speicherung je Veranstalter, Datensicherung mit Wiederherstellung, Admin-Übersicht mit Ansehen (nur lesen) und Löschen.

Einstellungen in der Kampfkarte: max. Gewichtsdifferenz in % (10), max. Siegdifferenz bei Freigabe (5), "Andere Alters- oder Gewichtsklasse nur mit Freigabe" (an; die WB erlauben das laut §11.9 und §19.6 ohne Zustimmung, der Auftraggeber will es strenger).

## Supabase
- Projekt `matchmaker`, Ref `ymqzqfrskvmpyamvmnbe`, Region eu-central-1 (Frankfurt), kostenloser Plan, Organisation "ahmet@ozcorapci.de's Org".
- URL und veröffentlichbarer Schlüssel stehen in `src/konto/client.ts` (für den Browser gedacht). Der Schutz der Daten liegt in den Zugriffsregeln (RLS).
- Datenbank: `supabase/migrations/001..003` (bereits angewendet). Tabellen `admins`, `veranstaltungen` (eine je Konto, Zustand als JSON, Versionszähler), `sicherungen`.
- Admin: Tabelle `admins`, Eintrag `ahmet@ozcorapci.de`. Admin sieht alle Veranstaltungen nur lesend und darf sie löschen.
- Im Dashboard gesetzt: Authentication → URL Configuration, Site URL und Redirect URL = `https://aozcorap.github.io/MatchMaker/`.
- Hinweis zu den Werkzeugen: Über den Supabase-Zugang der Sitzung hängen Anweisungen mit `DELETE FROM` (vermutlich eine nicht beantwortete Bestätigung). Das nicht umgehen, sondern Löschen über die Oberfläche der App oder das Dashboard machen.

## Impressum und Datenschutz
`src/rechtliches.tsx` (Seiten über `#/impressum` und `#/datenschutz`, Links im Fuß jeder Seite, beim Registrieren Häkchen "Datenschutzerklärung gelesen", Hinweis "nur erfundene Daten" auf der Anmeldeseite). **Vor der Veröffentlichung:** die Anschrift in `BETREIBER` eintragen (steht noch als Platzhalter in eckigen Klammern) und die Texte juristisch prüfen lassen. Die Datenschutzerklärung ist ein Entwurf nach dem Stand der Technik (Supabase Frankfurt, Hosting GitHub Pages, keine Tracking-Dienste). Eine Vereinbarung zur Auftragsverarbeitung mit den Veranstaltern gibt es noch nicht.

## Offene Punkte
1. Vier Testkonten `zz-test-a/b/c/admin@example.com` (gesperrt, Passwort ersetzt) im Dashboard unter Authentication → Users löschen; dazu die Zeile `zz-test-admin@example.com` in der Tabelle `admins`. Ihre Veranstaltungen sind schon gelöscht.
2. E-Mails kommen vom Standard-Absender von Supabase, englisch und stark begrenzt. Vor dem echten Betrieb: eigener SMTP-Dienst mit eigener Absenderadresse und deutsche Vorlagen.
3. Datenschutz (Namen, Geburtsdaten, teils Minderjährige): Datenschutzerklärung und Auftragsverarbeitung klären, bevor echte Veranstalter die Seite nutzen. Der kostenlose Plan pausiert ungenutzte Projekte nach etwa einer Woche (Wissensstand, prüfen).
4. Screenshots: Texterkennung ist bei stark komprimierten JPGs und schmalen Handy-Tabellen unzuverlässig; alle Zahlen müssen in der Prüfansicht kontrolliert werden. Mehr echte (anonymisierte) Beispiele wären hilfreich. Eine KI-Bilderkennung über einen Server wäre eine Datenschutzentscheidung.
5. Offen aus den Anforderungen: Heimverein/blaue Ecke (WB §4.6), Bestätigung der Auslegungen (Gewichtstoleranz, Rundenzeit bei gemischten Klassen).
6. Optional: Veranstalter dürfen ihre eigene Veranstaltung nicht löschen; Sicherungen werden nie automatisch bereinigt; kein Mehrbenutzerbetrieb pro Konto (bewusst: eine Person je Konto).
7. Die Demo-Datei (`dist-demo`) ist durch die PDF-Schriften auf etwa 2 MB gewachsen.
