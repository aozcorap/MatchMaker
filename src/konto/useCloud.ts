import { useCallback, useEffect, useRef, useState } from 'react';
import type { Zustand } from '../speicher';
import { speichereCloud, ueberschreibe } from './cloud';

export type SpeicherStatus = 'gespeichert' | 'speichert' | 'fehler' | 'konflikt';

/**
 * Speichert Änderungen kurz nach dem Bearbeiten in der Datenbank. Bei einem Fehler (z. B. keine Verbindung)
 * wird alle 10 Sekunden erneut versucht. Wurde woanders neuer gespeichert, bleibt der Konflikt stehen, bis der Nutzer entscheidet.
 */
export function useCloud(zustand: Zustand, userId: string | null, startVersion: number) {
  const [status, setStatus] = useState<SpeicherStatus>('gespeichert');
  const version = useRef(startVersion);
  const zuletztGespeichert = useRef(zustand);
  const aktuell = useRef(zustand);
  const laeuft = useRef(false);
  const nochmal = useRef(false);
  aktuell.current = zustand;

  const speichere = useCallback(async () => {
    if (!userId) return;
    if (laeuft.current) {
      nochmal.current = true;
      return;
    }
    const stand = aktuell.current;
    if (stand === zuletztGespeichert.current) return;
    laeuft.current = true;
    setStatus('speichert');
    try {
      const neu = await speichereCloud(userId, stand, version.current);
      if (neu === null) {
        setStatus('konflikt');
        return;
      }
      version.current = neu;
      zuletztGespeichert.current = stand;
      // Während des Speicherns weiter bearbeitet: noch einmal
      setStatus(aktuell.current === stand ? 'gespeichert' : 'speichert');
    } catch {
      setStatus('fehler');
    } finally {
      laeuft.current = false;
      if (nochmal.current) {
        nochmal.current = false;
        void speichere();
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || zustand === zuletztGespeichert.current) return;
    const t = setTimeout(() => void speichere(), 800);
    return () => clearTimeout(t);
  }, [zustand, userId, speichere]);

  useEffect(() => {
    if (status !== 'fehler' && status !== 'speichert') return;
    const t = setTimeout(() => void speichere(), 10000);
    return () => clearTimeout(t);
  }, [status, speichere, zustand]);

  useEffect(() => {
    const warnen = (e: BeforeUnloadEvent) => {
      if (userId && aktuell.current !== zuletztGespeichert.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warnen);
    return () => window.removeEventListener('beforeunload', warnen);
  }, [userId]);

  /** Eigenen Stand trotz Konflikt speichern. */
  const erzwinge = useCallback(async () => {
    if (!userId) return;
    setStatus('speichert');
    try {
      const stand = aktuell.current;
      version.current = await ueberschreibe(userId, stand);
      zuletztGespeichert.current = stand;
      setStatus('gespeichert');
    } catch {
      setStatus('fehler');
    }
  }, [userId]);

  return { status, erzwinge };
}
