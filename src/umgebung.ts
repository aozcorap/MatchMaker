/** Demo-Build: Simulationsdaten vorgeladen, nichts wird gespeichert, keine Browser-Dialoge. */
export const DEMO = import.meta.env.MODE === 'demo';

/** Browser-Dialoge sind in eingebetteten Seiten gesperrt, deshalb entfällt die Rückfrage in der Demo. */
export function bestaetige(text: string): boolean {
  return DEMO || window.confirm(text);
}
