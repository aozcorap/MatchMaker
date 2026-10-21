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
6. **Ausgabe.** Fertige Kampfkarte. Format wird später festgelegt.

## 3. Eingabedaten pro Boxer
Name, Verein, Geburtsdatum, Geschlecht, Gewicht (Meldegewicht), Kämpfe, Siege, Niederlagen.
Die Leistungsklasse (C/B/A/Elite) wird aus Alter und Siegen berechnet.

## 4. Harte Regeln (Standard)
1. **Geschlecht (§19.6):** Nur gleiches Geschlecht. Ausnahme: Jugend (U19) gegen Männer, wenn der Altersunterschied höchstens 24 Monate beträgt (§11.10).
2. **Altersklasse (§11):** Alter = Jahr der Veranstaltung minus Geburtsjahr. 10–12 U13, 13–14 U15, 15–16 U17, 17–18 U19, ab 19 Männer/Frauen. Zwischen Jugendklassen höchstens 24 Monate Unterschied, exakt nach Geburtsdatum (§11.9). Es gelten die Schutzbestimmungen der jüngeren Klasse.
3. **Gewicht (§19):** Gewichtsklassen nach Tabellen (Männer/Frauen/U19, U17, U15, U13). Gleiche Klasse ist ideal. Bei verschiedenen Klassen gilt als erlaubte Differenz die Breite der Klasse des leichteren Boxers (§19.6), auch über Altersklassen hinweg. *Auslegung, bitte bestätigen.* Boxer unter der untersten Klasse haben "keine Klasse" und kommen auf die Warteliste. Offene Klassen (z. B. Männer über 90 kg) haben keine Obergrenze: Innerhalb derselben offenen Klasse gibt es keine Gewichtsgrenze, die kleinste Differenz wird trotzdem bevorzugt.
4. **Rundenzeit (§22):** Männer, Frauen, U19: 3×3 min. U17: 3×2. U15: 3×1,5. U13: 3×1. Bei gemischten Altersklassen gilt die Rundenzeit der jüngeren Klasse. *Auslegung, bitte bestätigen.*
5. **Leistungsklasse (§12):** Unter 7 Siege = C, 7 bis 14 = B, über 14 = A. **Elite** ist eine eigene Klasse: über 18 Jahre (Stichtag 31.12. des Vorjahres) und mehr als 25 Siege, sonst nichts. (Bewusste Festlegung des Auftraggebers; die WB nennen zusätzlich "international vertreten", das entfällt hier.) Standard: nur gleiche Klasse. Elite gegen Elite, keine Ausnahme.
6. **Gleicher Verein:** Keine Paarung zwischen Boxern desselben Vereins.

## 5. Ausnahme Nachbar-Leistungsklasse
Nachbarn A–B und B–C sind möglich, wenn die beiden Trainer der Boxer zustimmen. Eine weitere Zustimmung (Veranstalter, oberster Ringrichter) ist nicht nötig. A–C ist ausgeschlossen, Elite ist ausgeschlossen. Pro Paarung gibt es einen Freigabestatus (Zustimmung beider Trainer liegt vor: ja/nein).

## 6. Qualität der Paarung
Bei mehreren möglichen Gegnern gewinnt die **beste Qualität**, nicht die Zahl der Kämpfe. Kein fester Höchstunterschied bei den Siegen; die Grenze setzen die Leistungsklassen. Reihenfolge der Kriterien:
1. gleiche Leistungsklasse
2. kleinste Gewichtsdifferenz
3. ähnliche **Siegzahl** (z. B. 4 Kämpfe/0 Siege passt zu 0 Kämpfen/0 Siegen)

## 6b. Einstellbare Grenzen (Erfahrungswerte, nicht aus den WB)
- **Gewicht:** Höchstens 10 % Unterschied, bezogen auf den leichteren Boxer, zusätzlich zur Klassenbreite. In nach oben offenen Gewichtsklassen gilt keine Prozentgrenze.
- **Siege bei Nachbar-Leistungsklassen:** Höchstens 5 Siege Unterschied, sonst kein Vorschlag (12 gegen 7 ist noch möglich, 12 gegen 1 nicht).
- Beide Werte stehen oben auf der Kampfkarte und lassen sich ändern.

## 6a. Ausfälle und Zeitplan
- **Ausfall:** Jeder Boxer kann als Ausfall gemeldet werden (Verletzung, Krankheit, Sonstiges, mit Notiz), auch wenn er schon einen Kampf hat. Der Kampf entfällt, der Gegner kommt auf die Warteliste. Ausgefallene Boxer werden bei neuen Paarungen übergangen und können wieder aufgenommen werden.
- **Uhrzeiten:** Die Kampfkarte zeigt je Kampf die voraussichtliche Startzeit. Grundlage ist der eingegebene Beginn (Annahme 14:00 Uhr), die Rundenzeit der Altersklasse mit einer Minute Pause zwischen den Runden und 2 Minuten zwischen den Kämpfen.
- **Verschieben:** Kämpfe lassen sich nach oben und unten oder auf eine Position verschieben. Neue Kämpfe werden an der Standardstelle einsortiert, "Automatisch sortieren" stellt die Standardreihenfolge wieder her.
- **Eigene Pausen:** Vor jedem Kampf kann eine Pause mit Bezeichnung und Dauer eingefügt werden. Sie bleibt an ihrer Position stehen, wenn Kämpfe verschoben werden. Eine Pause von mindestens der Länge der großen Pause setzt den Zwei-Stunden-Takt zurück.
- **Pausendauer:** Pause zwischen Kämpfen, große Pause und der Zwei-Stunden-Takt sind einstellbar. Die Dauer jeder automatischen Pause lässt sich einzeln ändern.
- **Große Pause:** Sind seit Beginn (oder seit der letzten Pause) 2 Stunden Wettkampf vergangen, folgt nach dem laufenden Kampf eine Pause von 30 Minuten.

## 7. Offene Punkte
- Bestätigung der Auslegungen in 4.3 (Gewichtstoleranz) und 4.4 (Rundenzeit).
- Spätere Themen: Projektname, Ausgabeformat, Nutzerrollen.

## Anhang: Gewichtsklassen (§19), "über" bis "bis einschließlich" in kg
**Männer und männl. Jugend (U19):** 47–50, 50–55, 55–60, 60–65, 65–70, 70–75, 75–80, 80–85, 85–90, über 90 (offen).
**Frauen und weibl. Jugend (U19):** 45–48, 48–51, 51–54, 54–57, 57–60, 60–65, 65–70, 70–75, 75–80, über 80 (offen).
**Junioren U17 (w/m):** 40–42, 42–44, 44–46, 46–48, 48–50, 50–52, 52–54, 54–57, 57–60, 60–63, 63–66, 66–70, 70–75, 75–80, über 80 (offen).
**Kadetten U15 und Schüler U13 (w/m):** wie U17, zusätzlich 38–40.
Unter der untersten Klasse: keine Klasse, Warteliste.
