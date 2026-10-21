# Anforderungen Matchmaking-Webseite (Entwurf zur Bestätigung)

Grundlage: DBV-Wettkampfbestimmungen (WB), gültig ab 01.01.2025. Paragraphen in Klammern.
Status: Anforderungen, noch keine technische Umsetzung.

## 1. Zweck und Umfang
Veranstalter von Amateurboxkämpfen erstellen **Einzelpaarungen** (keine Turniere, kein Breitensport).
Die App erzeugt einen **Entwurf**. Der Veranstalter hat das letzte Wort. Daten der Vereine sind unverifiziert.

**Nicht im Umfang:** Startberechtigung, Handschuhe, Schutzsperren, Turniere/Auslosung, Breitensport, Nutzerrollen (später).

## 2. Ablauf
1. **Meldungen erfassen.** Vereine melden per E-Mail, Excel oder WhatsApp. Der Veranstalter lädt Excel hoch oder fügt Text ein. Boxer lassen sich auch manuell anlegen. Eingelesene Daten werden vor der Übernahme zur Prüfung angezeigt.
2. **Entwurf generieren.** Der Veranstalter löst "Paarungen erzeugen" aus. Es entstehen nur regelkonforme Paarungen.
3. **Sortierung der Kampfkarte.** Jüngste Altersklasse zuerst, darin leichteste Gewichtsklasse zuerst.
4. **Warteliste.** Boxer ohne Gegner kommen mit Grund auf die Warteliste und können später manuell eingefügt werden.
5. **Manuelle Änderung.** Der Veranstalter darf den Entwurf frei ändern. Die App warnt bei Regelverstoß, sperrt aber nicht.
6. **Ausgabe.** Fertige Kampfkarte (PDF/Excel). *(Vorschlag, bitte bestätigen)*

## 3. Eingabedaten pro Boxer
Name, Verein, Geburtsdatum, Geschlecht, Gewicht (Meldegewicht), Kämpfe, Siege, Niederlagen.
Zusatzkennzeichen **Elite** (siehe 4.5), weil Elite auch über internationale Vertretung des DBV entsteht (§12.4).

## 4. Harte Regeln (Standard)
1. **Geschlecht (§19.6):** Nur gleiches Geschlecht. Ausnahme: Jugend (U19) gegen Männer, wenn der Altersunterschied höchstens 24 Monate beträgt (§11.10).
2. **Altersklasse (§11):** Alter = Jahr der Veranstaltung minus Geburtsjahr. 10–12 U13, 13–14 U15, 15–16 U17, 17–18 U19, ab 19 Männer/Frauen. Zwischen Jugendklassen höchstens 24 Monate Unterschied, exakt nach Geburtsdatum (§11.9). Es gelten die Schutzbestimmungen der jüngeren Klasse.
3. **Gewicht (§19):** Gewichtsklassen nach Tabellen (Männer/Frauen/U19, U17, U15, U13). Gleiche Klasse ist ideal. Bei verschiedenen Klassen gilt als erlaubte Differenz die Breite der Klasse des leichteren Boxers (§19.6), auch über Altersklassen hinweg. *Auslegung, bitte bestätigen.*
4. **Rundenzeit (§22):** Männer, Frauen, U19: 3×3 min. U17: 3×2. U15: 3×1,5. U13: 3×1. Bei gemischten Altersklassen gilt die Rundenzeit der jüngeren Klasse. *Auslegung, bitte bestätigen.*
5. **Leistungsklasse (§12):** Unter 7 Siege = C, 7 bis 14 = B, über 14 = A. **Elite** ist eine eigene Klasse: älter als 18 und mehr als 25 Siege, oder international für den DBV gestartet. Standard: nur gleiche Klasse. Elite gegen Elite, keine Ausnahme.
6. **Gleicher Verein:** Keine Paarung zwischen Boxern desselben Vereins.

## 5. Ausnahme Nachbar-Leistungsklasse
Nachbarn A–B und B–C sind möglich, wenn beide Trainer, der Veranstalter und der oberste Ringrichter zustimmen. A–C ist ausgeschlossen, Elite ist ausgeschlossen. Pro Paarung gibt es einen Freigabestatus.

## 6. Qualität der Paarung
Bei mehreren möglichen Gegnern gewinnt die **beste Qualität**, nicht die Zahl der Kämpfe. Reihenfolge der Kriterien:
1. gleiche Leistungsklasse
2. kleinste Gewichtsdifferenz
3. ähnliche **Siegzahl** (z. B. 4 Kämpfe/0 Siege passt zu 0 Kämpfen/0 Siegen)

## 7. Offene Punkte
- Gilt bei der Siegzahl ein fester Höchstunterschied, oder nur Sortierung nach Ähnlichkeit?
- Bestätigung der Auslegungen in 4.3 und 4.4.
- Projektname.
- Ausgabeformat der Kampfkarte.
