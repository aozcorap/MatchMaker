# Bezahlkonzept (Entwurf, noch nicht gebaut)

Stand: 21.10.2026. Das ist ein Konzept, keine Rechts- oder Steuerberatung. Preise und Gebühren von Anbietern ändern sich und müssen vor dem Start noch einmal geprüft werden.

## Ziel
- Der Dienst kostet **10 Euro pro Veranstaltung, inklusive Umsatzsteuer**.
- Bezahlt wird mit Karte oder SEPA-Lastschrift über **Stripe** (Checkout, die Zahlung läuft auf einer Seite von Stripe, auf unserer Seite liegen nie Kartendaten).
- Stripe erstellt die Rechnung automatisch.

## Vorgehen in zwei Schritten
1. **Manuell (Prototyp):** Der Veranstalter überweist, du setzt in der Admin-Liste den Haken "bezahlt". Dafür braucht es nur ein Feld in der Datenbank und einen Knopf. Damit prüfst du, ob jemand zahlt, ohne Stripe einzurichten.
2. **Automatisch mit Stripe:** Knopf "Freischalten" führt zur Zahlungsseite. Nach der Zahlung meldet Stripe sie an eine kleine Server-Funktion, die die Veranstaltung freischaltet.

## Was ist kostenlos, was kostet? (offene Entscheidung)
Vorschlag, noch nicht bestätigt: Meldungen erfassen, Paarungen erzeugen und die Kampfkarte bearbeiten sind kostenlos zum Ausprobieren. Der **PDF-Export** gibt es erst nach der Zahlung, weil er das fertige Ergebnis ist. Leert der Admin eine Veranstaltung, gilt die nächste wieder als unbezahlt.

## Technik (geplant)
- Datenbank: Je Veranstaltung ein Status "bezahlt" mit Zeitpunkt und der Zahlungsnummer von Stripe.
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

**Umsatzsteuer (Rechenbeispiel mit 19 %, nur wenn du umsatzsteuerpflichtig bist):** In 10 € brutto stecken 1,60 € Umsatzsteuer, die du ans Finanzamt abführst.

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
1. Bist du Unternehmen oder Kleinunternehmer, und enthalten die 10 Euro Umsatzsteuer? (Du hast gesagt: inklusive. Der Steuersatz fehlt noch.)
2. Was genau ist kostenlos, was kostet? (Vorschlag oben: PDF-Export gegen Zahlung.)
3. Gibt es Rückerstattung, wenn eine Veranstaltung ausfällt?
4. Reicht für den Anfang der manuelle Schritt?

## Nächste Schritte
1. Entscheidungen oben treffen.
2. Schritt 1 bauen: Feld "bezahlt" je Veranstaltung, Haken in der Admin-Liste, PDF-Export gesperrt ohne Haken.
3. Stripe-Konto anlegen (du), Schlüssel als Secret eintragen (du), Funktionen und Knopf bauen (ich).
