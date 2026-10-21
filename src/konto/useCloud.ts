import { useCallback, useEffect, useRef, useState } from 'react';
import { gleicherZustand, istLeer, type Zustand } from '../speicher';
import { ladeVeranstaltung, speichereCloud, ueberschreibe } from './cloud';

export type SpeicherStatus = 'gespeichert' | 'speichert' | 'fehler' | 'konflikt';
/** Warum es einen Konflikt gibt: woanders neuer gespeichert, vom Admin geleert oder gelöscht. */
export type KonfliktGrund = 'neuer' | 'geleert' | 'geloescht';

/**
 * Speichert Änderungen kurz nach dem Bearbeiten in der Datenbank. Bei einem Fehler (z. B. keine Verbindung)
 * wird alle 10 Sekunden erneut versucht. Wurde woanders neuer gespeichert, bleibt der Konflikt stehen, bis der Nutzer entscheidet.
 */
export function useCloud(zustand: Zustand, userId: string | null, startVersion: number) {
  const [status, setStatus] = useState<SpeicherStatus>('gespeichert');
  const [konfliktGrund, setKonfliktGrund] = useState<KonfliktGrund>('neuer');
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
      let neu = await speichereCloud(userId, stand, version.current);
      if (neu === null) {
        // Vielleicht kam nur die Antwort eines früheren, erfolgreichen Speicherns nicht an: dann steht unser Stand schon dort
        const dort = await ladeVeranstaltung(userId).catch(() => undefined);
        if (dort && gleicherZustand(dort.zustand, stand)) {
          neu = dort.version;
        } else {
          setKonfliktGrund(dort === null ? 'geloescht' : dort && istLeer(dort.zustand) && !istLeer(stand) ? 'geleert' : 'neuer');
          setStatus('konflikt');
          return;
        }
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

  // Sofort speichern, wenn der Tab in den Hintergrund geht oder geschlossen wird (nicht erst nach der Pause)
  useEffect(() => {
    if (!userId) return;
    const sofort = () => {
      if (document.visibilityState === 'hidden' && aktuell.current !== zuletztGespeichert.current) void speichere();
    };
    const beimSchliessen = () => {
      if (aktuell.current !== zuletztGespeichert.current) void speichere();
    };
    document.addEventListener('visibilitychange', sofort);
    window.addEventListener('pagehide', beimSchliessen);
    return () => {
      document.removeEventListener('visibilitychange', sofort);
      window.removeEventListener('pagehide', beimSchliessen);
    };
  }, [userId, speichere]);

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

  return { status, erzwinge, konfliktGrund };
}
