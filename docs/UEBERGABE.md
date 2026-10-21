# Übergabe: Stand des Projekts "Matchmaking Boxen"

Dieses Dokument ist für eine neue Arbeitssitzung gedacht. Fachliche Regeln stehen in `ANFORDERUNGEN.md`.

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
- Veröffentlichung: `.github/workflows/pages.yml` baut und veröffentlicht bei jedem Push auf `main` (Typprüfung, Tests, Build).

## Funktionsstand
Fertig und getestet: Regeln und Generator, Kampfkarte mit Zeitplan/Pausen/Ausfällen/Verschieben, Filter, Import (Excel, CSV, Text, Screenshots; Prüfansicht; Verein aus Signatur), PDF-Export (mit Alters- und Gewichtsklasse je Boxer), Konten mit Registrierung/Passwort vergessen, automatische Speicherung je Veranstalter, Datensicherung mit Wiederherstellung, Admin-Übersicht mit Ansehen (nur lesen) und Löschen.

Einstellungen in der Kampfkarte: Rundenzeit Erwachsene/U19 (3 × 3 oder 3 × 2 Minuten, Standard 3 × 3; wirkt auf Zeitplan, Anzeige und PDF), max. Gewichtsdifferenz in % (10), max. Siegdifferenz bei Freigabe (5), "Andere Alters- oder Gewichtsklasse nur mit Freigabe" (an; die WB erlauben das laut §11.9 und §19.6 ohne Zustimmung, der Auftraggeber will es strenger).

## Supabase
- Projekt `matchmaker`, Ref `ymqzqfrskvmpyamvmnbe`, Region eu-central-1 (Frankfurt), kostenloser Plan, Organisation "ahmet@ozcorapci.de's Org".
- URL und veröffentlichbarer Schlüssel stehen in `src/konto/client.ts` (für den Browser gedacht). Der Schutz der Daten liegt in den Zugriffsregeln (RLS).
- Datenbank: `supabase/migrations/001..004` (angewendet), `005` (Sicherungen begrenzen: noch im SQL-Editor auszuführen). Tabellen `admins`, `veranstaltungen` (eine je Konto, Zustand als JSON, Versionszähler), `sicherungen`.
- Admin: Tabelle `admins`, Eintrag `ahmet@ozcorapci.de`. Admin sieht alle Veranstaltungen nur lesend und kann sie leeren (Boxer, Kämpfe, Sicherungen weg; Konto und E-Mail bleiben).
- Im Dashboard gesetzt: Authentication → URL Configuration, Site URL und Redirect URL = `https://aozcorap.github.io/MatchMaker/`.
- Hinweis zu den Werkzeugen: Über den Supabase-Zugang der Sitzung hängen Anweisungen mit `DELETE FROM` (vermutlich eine nicht beantwortete Bestätigung). Das nicht umgehen, sondern Löschen über die Oberfläche der App oder das Dashboard machen.

## Offene Punkte
1. E-Mails kommen vom Standard-Absender von Supabase, englisch und stark begrenzt. Vor dem echten Betrieb: eigener SMTP-Dienst mit eigener Absenderadresse und deutsche Vorlagen.
2. Datenschutz (Namen, Geburtsdaten, teils Minderjährige): Datenschutzerklärung und Auftragsverarbeitung klären, bevor echte Veranstalter die Seite nutzen. Der kostenlose Plan pausiert ungenutzte Projekte nach etwa einer Woche (Wissensstand, prüfen).
3. Screenshots: Texterkennung ist bei stark komprimierten JPGs und schmalen Handy-Tabellen unzuverlässig; alle Zahlen müssen in der Prüfansicht kontrolliert werden. Mehr echte (anonymisierte) Beispiele wären hilfreich. Eine KI-Bilderkennung über einen Server wäre eine Datenschutzentscheidung.
4. Offen aus den Anforderungen: Heimverein/blaue Ecke (WB §4.6), Bestätigung der Auslegungen (Gewichtstoleranz (die Rundenzeit ist gegen die WB geprüft, Volltext der WB in `docs/Wettkampfbestimmungen-DBV-2025.pdf`)).
5. Optional: Veranstalter dürfen ihre eigene Veranstaltung nicht löschen; kein Mehrbenutzerbetrieb pro Konto (bewusst: eine Person je Konto).
6. Die Demo-Datei (`dist-demo`) ist durch die PDF-Schriften auf etwa 2 MB gewachsen.
7. Bezahlmethode: noch keine Überlegungen (Preismodell, Zahlungsanbieter, Rechnungen, Steuern). Muss später eingebaut werden, ist aktuell nicht dringend.
