import { leererZustand, liesZustand, type Zustand } from '../speicher';
import { supabase } from './client';

export interface Gespeichert {
  zustand: Zustand;
  version: number;
}

export interface Uebersicht {
  userId: string;
  email: string;
  aktualisiert: string;
  zustand: Zustand;
}

export async function ladeVeranstaltung(userId: string): Promise<Gespeichert | null> {
  const { data, error } = await supabase
    .from('veranstaltungen')
    .select('zustand, version')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const zustand = liesZustand(data.zustand);
  if (!zustand) throw new Error('Gespeicherte Daten sind beschädigt');
  return { zustand, version: data.version as number };
}

export async function legeAn(userId: string, zustand: Zustand): Promise<number> {
  const { error } = await supabase.from('veranstaltungen').insert({ user_id: userId, zustand });
  if (error) throw error;
  return 1;
}

/** Speichert nur, wenn die Version in der Datenbank noch die bekannte ist. `null` heißt: woanders wurde neuer gespeichert. */
export async function speichereCloud(userId: string, zustand: Zustand, version: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('veranstaltungen')
    .update({ zustand })
    .eq('user_id', userId)
    .eq('version', version)
    .select('version');
  if (error) throw error;
  return data && data.length > 0 ? (data[0].version as number) : null;
}

/** Überschreibt den Stand in der Datenbank unabhängig von dessen Version. */
export async function ueberschreibe(userId: string, zustand: Zustand): Promise<number> {
  const { data, error } = await supabase.from('veranstaltungen').update({ zustand }).eq('user_id', userId).select('version');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Veranstaltung nicht gefunden');
  return data[0].version as number;
}

export async function istAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('ist_admin');
  return !error && data === true;
}

export async function ladeAlle(): Promise<Uebersicht[]> {
  const { data, error } = await supabase
    .from('veranstaltungen')
    .select('user_id, email, aktualisiert, zustand')
    .order('aktualisiert', { ascending: false });
  if (error) throw error;
  const liste: Uebersicht[] = [];
  for (const z of data ?? []) {
    const zustand = liesZustand(z.zustand);
    if (zustand) liste.push({ userId: z.user_id as string, email: z.email as string, aktualisiert: z.aktualisiert as string, zustand });
  }
  return liste;
}

export interface Sicherung {
  id: number;
  erstellt: string;
  manuell: boolean;
  boxer: number;
  kaempfe: number;
}

export async function ladeSicherungen(userId: string): Promise<Sicherung[]> {
  const { data, error } = await supabase
    .from('sicherungen')
    .select('id, erstellt, manuell, boxer, kaempfe')
    .eq('user_id', userId)
    .order('erstellt', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Sicherung[];
}

export async function ladeSicherung(id: number): Promise<Zustand> {
  const { data, error } = await supabase.from('sicherungen').select('zustand').eq('id', id).single();
  if (error) throw error;
  const zustand = liesZustand(data.zustand);
  if (!zustand) throw new Error('Sicherung ist beschädigt');
  return zustand;
}

export async function legeSicherungAn(userId: string, zustand: Zustand): Promise<void> {
  const { error } = await supabase.from('sicherungen').insert({
    user_id: userId,
    zustand,
    manuell: true,
    boxer: zustand.boxer.length,
    kaempfe: zustand.kampfkarte.length,
  });
  if (error) throw error;
}

/** Nur Admin: leert die Veranstaltung samt Sicherungen. Konto und E-Mail bleiben bestehen. */
export async function loescheVeranstaltung(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_leere_veranstaltung', { p_user: userId, p_zustand: leererZustand() });
  if (error) throw error;
}
