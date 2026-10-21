import { createClient } from '@supabase/supabase-js';

// Projekt-URL und veröffentlichbarer Schlüssel sind für den Browser gedacht (kein Geheimnis);
// den Schutz der Daten übernehmen die Zugriffsregeln (Row Level Security) in der Datenbank.
const URL = 'https://ymqzqfrskvmpyamvmnbe.supabase.co';
const SCHLUESSEL = 'sb_publishable_2B8JvFPbuUqv780W8rMl9w_9JkqLdMu';

export const supabase = createClient(URL, SCHLUESSEL);
