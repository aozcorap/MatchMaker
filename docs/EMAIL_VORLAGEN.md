# Deutsche E-Mail-Vorlagen für Supabase

Supabase verschickt zwei E-Mails, die in dieser App vorkommen: die Bestätigung nach der Registrierung und den Link zum Zurücksetzen des Passworts.
Standardmäßig sind sie englisch. Die Texte unten sind die deutschen Fassungen (Sie-Form, wie in der App).

## Einbauen
Supabase-Dashboard, Projekt `matchmaker`: **Authentication → Emails → Templates** (Bezeichnung kann je nach Dashboard-Version leicht abweichen).
Je Vorlage den Betreff und den Text ersetzen. Die Platzhalter `{{ .ConfirmationURL }}`, `{{ .Email }}` und `{{ .SiteURL }}` füllt Supabase selbst, nicht verändern.

Wichtig für den echten Betrieb: Der Standard-Absender von Supabase ist nur zum Ausprobieren gedacht. Nach meinem Wissensstand (nicht verifiziert, bitte im Dashboard prüfen) verschickt er nur an Mitglieder der eigenen Supabase-Organisation, stark begrenzt pro Stunde. Für fremde Nutzer braucht es einen eigenen SMTP-Dienst (Authentication → Emails → SMTP Settings) mit eigener Absenderadresse, zum Beispiel `noreply@ozcorapci.de`.
Ohne eigenen SMTP-Dienst die E-Mail-Bestätigung ausschalten, sonst kommen die Mails bei Testern nicht an. Dann funktioniert allerdings auch „Passwort vergessen“ nicht.

## 1. Registrierung bestätigen („Confirm signup“)
**Betreff:** `Bitte bestätigen Sie Ihre E-Mail-Adresse – Matchmaking Boxen`

```html
<h2>Willkommen bei Matchmaking Boxen</h2>
<p>Sie haben sich mit der E-Mail-Adresse {{ .Email }} registriert. Bitte bestätigen Sie Ihre Adresse mit einem Klick:</p>
<p><a href="{{ .ConfirmationURL }}">E-Mail-Adresse bestätigen</a></p>
<p>Danach können Sie sich anmelden.</p>
<p>Wenn Sie sich nicht registriert haben, können Sie diese E-Mail ignorieren. Es passiert nichts.</p>
<p style="color:#666;font-size:12px">Matchmaking Boxen ist ein Prototyp in der Testphase. <a href="{{ .SiteURL }}#/impressum">Impressum</a> · <a href="{{ .SiteURL }}#/datenschutz">Datenschutz</a></p>
```

## 2. Passwort zurücksetzen („Reset password“)
**Betreff:** `Passwort zurücksetzen – Matchmaking Boxen`

```html
<h2>Passwort zurücksetzen</h2>
<p>Für Ihr Konto ({{ .Email }}) wurde das Zurücksetzen des Passworts angefordert. Mit diesem Link können Sie ein neues Passwort festlegen:</p>
<p><a href="{{ .ConfirmationURL }}">Neues Passwort festlegen</a></p>
<p>Wenn Sie das nicht angefordert haben, können Sie diese E-Mail ignorieren. Ihr Passwort bleibt dann unverändert.</p>
<p style="color:#666;font-size:12px">Matchmaking Boxen ist ein Prototyp in der Testphase. <a href="{{ .SiteURL }}#/impressum">Impressum</a> · <a href="{{ .SiteURL }}#/datenschutz">Datenschutz</a></p>
```

## Nicht benutzt
„Invite user“, „Magic link“, „Change email address“ und „Reauthentication“ kommen in dieser App nicht vor und brauchen keine Übersetzung.

## Absender
Unter SMTP Settings: Absendername `Matchmaking Boxen`, Absenderadresse eine Adresse auf einer eigenen Domain, die der SMTP-Dienst freigegeben hat (die Domain muss dort verifiziert werden, sonst landen die Mails im Spam oder werden abgelehnt).
