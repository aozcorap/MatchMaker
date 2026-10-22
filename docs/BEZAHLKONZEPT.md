# Bezahlkonzept (Entwurf, noch nicht gebaut)

Entscheidungen vom 21.10.2026: Bezahlung direkt mit Stripe (kein Zwischenschritt), Paarungen erst nach Zahlung, der Betreiber ist Unternehmer, keine Erstattung bei Absage.

Stand: 21.10.2026. Das ist ein Konzept, keine Rechts- oder Steuerberatung. Preise und Gebühren von Anbietern ändern sich und müssen vor dem Start noch einmal geprüft werden.

## Ziel
- Der Dienst kostet **10 Euro pro Veranstaltung, inklusive Umsatzsteuer**.
- Bezahlt wird mit Karte oder SEPA-Lastschrift über **Stripe** (Checkout: Die Zahlung läuft auf einer Seite von Stripe, auf unserer Seite liegen nie Kartendaten). Es gibt keinen manuellen Zwischenschritt.
- Stripe erstellt die Rechnung automatisch.
- **Keine Erstattung**, wenn die Veranstaltung abgesagt wird. Das muss in den Geschäftsbedingungen und vor der Zahlung auf der Seite stehen (rechtlich prüfen lassen).

## Was ist kostenlos, was kostet?
- **Kostenlos:** Konto anlegen, Boxer erfassen und importieren, Boxerliste ansehen.
- **Erst nach Zahlung:** Paarungen erzeugen, Kämpfe in die Kampfkarte aufnehmen, Kampfkarte bearbeiten und als PDF ausgeben. Vorher zeigt die Kampfkarte nur den Hinweis "Für diese Veranstaltung freischalten (10 €)" mit dem Knopf zur Zahlung.
- Leert der Admin eine Veranstaltung (nach dem Termin), gilt die nächste wieder als unbezahlt.
- Annahme: Die Boxer-Erfassung bleibt frei, weil man sonst nichts sieht. Wenn auch die schon gesperrt sein soll, bitte sagen.

## Technik (geplant)
- Datenbank: Je Veranstaltung ein Status "bezahlt" mit Zeitpunkt und der Zahlungsnummer von Stripe.
- Die Sperre muss auch in der Datenbank gelten (nicht nur im Browser), sonst kann ein technisch versierter Nutzer sie umgehen. Das ist der aufwendigste Teil.
- Zwei kleine Funktionen in Supabase: eine startet die Zahlung (Stripe Checkout), eine nimmt die Meldung von Stripe an (Webhook) und setzt den Status.
- Der geheime Schlüssel von Stripe liegt als Secret in Supabase, nie im Programm. Die Funktionen müssen im Supabase-Dashboard eingefügt werden (mein Zugang bricht bei Server-Code meist ab).
- Die Meldung von Stripe wird mit der Signatur geprüft, sonst könnte jeder eine Zahlung vortäuschen.

## Kosten, die auf dich zukommen

**Stripe (laut Preisseiten vom 21.10.2026, keine Grund- oder Einrichtungsgebühr):**

| Zahlungsart | Zahlungsgebühr | Rechnung (0,4 %) | Gesamt je 10 € |
|---|---|---|---|
| Standardkarte aus dem EWR | 1,5 % + 0,25 € = 0,40 € | 0,04 € | **0,44 €** |
| SEPA-Lastschrift | 0,35 € | 0,04 € | **0,39 €** |
| Premiumkarte aus dem EWR | 2,8 % + 0,25 € = 0,53 € | 0,04 € | 0,57 € |
| Ausländische Karte | 3,15 % + 0,25 € = 0,57 € (plus 2 % bei Währungsumrechnung) | 0,04 € | 0,61 € |

Die Rechnungsgebühr für automatisch erstellte Rechnungen nach Checkout nennt die Preisseite mit 0,4 % und einer Obergrenze von 2,00 $; bei Stripe Invoicing "Starter" 0,4 %, "Plus" 0,5 %. Nicht belegt: ob die Stripe-Gebühren selbst Umsatzsteuer enthalten. Das zeigt die erste Abrechnung.

**Umsatzsteuer (Rechenbeispiel mit 19 %, solange nicht bestätigt ist, dass du nicht Kleinunternehmer nach §19 UStG bist):** In 10 € brutto stecken 1,60 € Umsatzsteuer, die du ans Finanzamt abführst.

**Was bei einer 10-€-Zahlung übrig bleibt, vor Einkommensteuer:**
- Mit Umsatzsteuer: ca. **7,96 €** (Karte) oder **8,01 €** (SEPA).
- Als Kleinunternehmer ohne Umsatzsteuer: ca. **9,56 €** (Karte) oder **9,61 €** (SEPA).

**Weitere laufende Kosten (nicht geprüft, bitte klären):**
- **Supabase:** Der kostenlose Plan pausiert nach etwa einer Woche ohne Nutzung und hat Grenzen. Mit zahlenden Kunden sollte der bezahlte Plan her. Der Preis ist nicht geprüft.
- **Eigener E-Mail-Dienst** für Registrierung und Passwort vergessen (der Standard-Absender von Supabase ist stark begrenzt, siehe Übergabe).
- **Steuerberatung** für Umsatzsteuer und Buchhaltung.

## Voraussetzungen, bevor Geld fließt
- Impressum und Datenschutzerklärung auf der Seite (offener Punkt in der Übergabe, braucht deine Betreiberangaben). Stripe ist ein weiterer Auftragsverarbeiter.
- Klärung der steuerlichen Seite: Unternehmen oder Kleinunternehmer, Umsatzsteuer, Pflichtangaben auf der Rechnung. Das klärst du mit deinem Steuerberater.
- Geschäftsbedingungen und Hinweis zum Widerruf bei einer digitalen Leistung, soweit Verbraucher zahlen. Auch das gehört rechtlich geprüft.

## Offene Entscheidungen
1. Umsatzsteuerpflichtig (19 %) oder Kleinunternehmer nach §19 UStG? Du bist Unternehmer; das ist noch nicht dasselbe. Die Rechnung oben rechnet beides.
2. Bleibt die Boxer-Erfassung wirklich kostenlos (Annahme oben)?
3. Zahlen vor allem Vereine (Rechnung an eine Organisation) oder Privatpersonen? Das bestimmt, ob ein Widerrufsrecht gilt und was auf die Rechnung muss.

## Nächste Schritte
1. Entscheidungen oben treffen, Impressum und Datenschutzerklärung schreiben (deine Betreiberangaben), Geschäftsbedingungen mit dem Ausschluss der Erstattung prüfen lassen.
2. Stripe-Konto anlegen (du) und den geheimen Schlüssel als Secret in Supabase eintragen (du, nicht im Chat posten).
3. Bauen (ich): Statusfeld, Zahlungsknopf, Funktion für die Meldung von Stripe, Sperre von Paarungen und PDF in Programm und Datenbank. Die Funktionen fügst du im Supabase-Dashboard ein.
