import { liesZustand, type Zustand } from '../speicher';
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
