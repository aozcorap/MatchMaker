import { Fragment, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { fuegeSortiertEin, kampfSchluessel, verschiebe } from './ablauf';
import { hebeAusfallAuf, meldeAusfall } from './ausfall';
import { AusfallDialog } from './AusfallDialog';
import { BoxerZelle } from './BoxerZelle';
import { FilterLeiste } from './FilterLeiste';
import { filterOptionen, istAktiv, passt, passtEiner, type Filter } from './filter';
import { PaarungsDialog } from './PaarungsDialog';
import { erzeugePaarungen } from './regeln/generator';
import { altersklasseText, boxerInfo, gewichtsklasseText } from './regeln/info';
import { baueKampf, leichterZuerst, type Kampf, vergleicheKampf, vergleicheWartende } from './regeln/kampfkarte';
import { rundenzeitFuer } from './regeln/klassen';
import { ladeKampfkartePdf, ladeVorab } from './pdf';
import { altersdifferenzMonate, paarungsGuete } from './regeln/paarung';
import type { Boxer } from './regeln/typen';
import { kampfdauer, plane, uhrzeit } from './regeln/zeitplan';
import type { GeplanterKampf, Zustand } from './speicher';
import { bestaetige } from './umgebung';

function minutenText(m: number): string {
  return String(m).replace('.', ',');
}

/** Zahlenfeld für die Position eines Kampfes; übernommen wird bei Enter oder beim Verlassen. */
function PositionFeld(props: { wert: number; max: number; onWahl: (nummer: number) => void }) {
  const { wert, max, onWahl } = props;
  const [text, setText] = useState(String(wert));
  useEffect(() => setText(String(wert)), [wert]);
  const uebernehme = () => {
    const n = Number(text);
    if (Number.isInteger(n) && n >= 1 && n <= max && n !== wert) onWahl(n);
    else setText(String(wert));
  };
  return (
    <label className="position">
      Position
      <input
        type="number"
        min="1"
        max={max}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={uebernehme}
        onKeyDown={(e) => e.key === 'Enter' && uebernehme()}
      />
    </label>
  );
}

function ganzeMinuten(text: string): number | null {
  const n = Number(text);
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

interface Vorschlag {
  a: Boxer;
  b: Boxer;
  hinweise: string[];
  guete: [number, number, number];
}

function gruppenName(b: Boxer, datum: string): string {
  const geschlecht = b.geschlecht === 'M' ? 'Männer' : 'Frauen';
  const ak = boxerInfo(b, datum).altersklasse;
  return `${geschlecht} · ${ak ? altersklasseText(ak) : 'keine Altersklasse'}`;
}

export function KampfkarteTab(props: {
  zustand: Zustand;
  setZustand: Dispatch<SetStateAction<Zustand>>;
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const { zustand, setZustand, filter, setFilter } = props;
  const { datum, beginn, boxer, kampfkarte, ausfaelle, regeln, zeit, extraPausen, autoPausen } = zustand;
  const [auswahl, setAuswahl] = useState<string[]>([]);
  const [ausfallFuer, setAusfallFuer] = useState<Boxer | null>(null);

  const nachId = useMemo(() => new Map(boxer.map((b) => [b.id, b])), [boxer]);

  const kaempfe = useMemo(
    () =>
      kampfkarte
        .map((geplant) => ({
          geplant,
          kampf: baueKampf(nachId.get(geplant.aId)!, nachId.get(geplant.bId)!, datum, regeln),
        })),
    [kampfkarte, nachId, datum, regeln],
  );

  // Voraussichtliche Zeiten; ohne Altersklasse (nur bei manuell angelegten Regelverstößen) gilt 3 × 3 Minuten
  const zeiten = useMemo(
    () =>
      plane(
        beginn,
        kaempfe.map((k) => kampfdauer(rundenzeitFuer(k.kampf.altersklasse ?? 'Erwachsene', zeit.erwachsenenRundeMin))),
        {
          zeit,
          extraPausen,
          autoDauerMin: (i) => autoPausen[kampfSchluessel(kaempfe[i].geplant)],
        },
      ),
    [kaempfe, beginn, zeit, extraPausen, autoPausen],
  );

  const belegt = useMemo(() => new Set(kampfkarte.flatMap((k) => [k.aId, k.bId])), [kampfkarte]);
  const wartende = useMemo(
    () =>
      boxer
        .filter((b) => !belegt.has(b.id) && !ausfaelle[b.id])
        .sort((x, y) => vergleicheWartende(x, y, datum)),
    [boxer, belegt, ausfaelle, datum],
  );
  const ausgefallene = useMemo(
    () => boxer.filter((b) => ausfaelle[b.id]).sort((x, y) => vergleicheWartende(x, y, datum)),
    [boxer, ausfaelle, datum],
  );

  // Alle möglichen Paarungen unter den Wartenden: erst die regelkonformen, dann die nur mit Freigabe
  const moeglich = useMemo(() => {
    const ok: Vorschlag[] = [];
    const freigabe: Vorschlag[] = [];
    for (let i = 0; i < wartende.length; i++) {
      for (let j = i + 1; j < wartende.length; j++) {
        const [a, b] = leichterZuerst(wartende[i], wartende[j]);
        const k = baueKampf(a, b, datum, regeln);
        if (k.pruefung.status === 'verboten') continue;
        const eintrag = { a, b, hinweise: k.pruefung.hinweise, guete: paarungsGuete(a, b, datum) };
        (k.pruefung.status === 'ok' ? ok : freigabe).push(eintrag);
      }
    }
    const vergleiche = (x: Vorschlag, y: Vorschlag) =>
      x.guete[1] - y.guete[1] || x.guete[2] - y.guete[2] || x.a.name.localeCompare(y.a.name, 'de');
    return { ok: ok.sort(vergleiche), freigabe: freigabe.sort(vergleiche) };
  }, [wartende, datum, regeln]);
  const mitFreigabe = useMemo(
    () => new Set(moeglich.freigabe.flatMap((v) => [v.a.id, v.b.id])),
    [moeglich],
  );

  // Filter: Kämpfe und Paarungen erscheinen, wenn mindestens ein Boxer alle Kriterien erfüllt
  const filterAktiv = istAktiv(filter);
  const treffer = (boxer: Boxer[]) => passtEiner(boxer, filter, datum);
  const kaempfeSichtbar = kaempfe.filter((k) => treffer([k.kampf.rot, k.kampf.blau])).length;
  const okSichtbar = moeglich.ok.filter((p) => treffer([p.a, p.b]));
  const freigabeSichtbar = moeglich.freigabe.filter((p) => treffer([p.a, p.b]));
  const wartendeSichtbar = wartende.filter((b) => passt(b, filter, datum));
  const ausgefalleneSichtbar = ausgefallene.filter((b) => passt(b, filter, datum));
  const optionen = useMemo(() => filterOptionen(boxer, datum, filter), [boxer, datum, filter]);
  const zaehler = (sichtbar: number, gesamt: number) => (filterAktiv ? `${sichtbar} von ${gesamt}` : String(gesamt));
  const vorschlagAnzahl = moeglich.ok.length + moeglich.freigabe.length;

  function springe(id: string) {
    const kurz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: kurz ? 'auto' : 'smooth', block: 'start' });
  }

  const gewaehlt = auswahl.filter((id) => !belegt.has(id)).map((id) => nachId.get(id)!).filter(Boolean);
  const vorschauAuswahl =
    gewaehlt.length === 2 ? baueKampf(gewaehlt[0], gewaehlt[1], datum, regeln) : null;

  /** Standardreihenfolge der Kampfkarte: jüngste Altersklasse zuerst, darin leichtester Boxer zuerst. */
  function vergleicheGeplant(x: GeplanterKampf, y: GeplanterKampf): number {
    const kx = baueKampf(nachId.get(x.aId)!, nachId.get(x.bId)!, datum, regeln);
    const ky = baueKampf(nachId.get(y.aId)!, nachId.get(y.bId)!, datum, regeln);
    return vergleicheKampf(kx, ky);
  }

  function ergaenze(neu: GeplanterKampf[]) {
    setZustand((z) => ({
      ...z,
      kampfkarte: neu.reduce((liste, k) => fuegeSortiertEin(liste, k, vergleicheGeplant), z.kampfkarte),
    }));
    setAuswahl([]);
  }

  function bewege(von: number, nach: number) {
    setZustand((z) => ({ ...z, kampfkarte: verschiebe(z.kampfkarte, von, nach) }));
  }

  function sortiereAutomatisch() {
    if (!bestaetige('Die Reihenfolge der Kämpfe wird auf die Standardsortierung zurückgesetzt. Fortfahren?')) return;
    setZustand((z) => ({ ...z, kampfkarte: [...z.kampfkarte].sort(vergleicheGeplant) }));
  }

  function fuegePauseEin(vorKampf: number) {
    setZustand((z) => ({
      ...z,
      extraPausen: [...z.extraPausen, { id: crypto.randomUUID(), vorKampf, minuten: 15, text: 'Pause' }],
    }));
  }

  function aenderePause(id: string, teil: Partial<{ vorKampf: number; minuten: number; text: string }>) {
    setZustand((z) => ({
      ...z,
      // Wird die Pause verschoben, löst sie sich vom alten Kampf und hängt sich an den an der neuen Position
      extraPausen: z.extraPausen.map((p) =>
        p.id === id ? { ...p, ...teil, ...(teil.vorKampf !== undefined ? { kampf: undefined } : {}) } : p,
      ),
    }));
  }

  function loeschePause(id: string) {
    setZustand((z) => ({ ...z, extraPausen: z.extraPausen.filter((p) => p.id !== id) }));
  }

  function setzeAutoPause(schluessel: string, minuten: number | null) {
    setZustand((z) => {
      const rest = { ...z.autoPausen };
      if (minuten === null) delete rest[schluessel];
      else rest[schluessel] = minuten;
      return { ...z, autoPausen: rest };
    });
  }

  const [pdfLaeuft, setPdfLaeuft] = useState(false);
  const [pdfFehler, setPdfFehler] = useState(false);
  useEffect(() => {
    if (kampfkarte.length > 0) ladeVorab();
  }, [kampfkarte.length]);
  const pdfBoxer = (b: Boxer) => ({ name: b.name, verein: b.verein, gewicht: b.gewicht });
  /** Alters- und Leistungsklasse des Kampfes, z. B. "U17 C", "Männer B" oder bei Nachbarklassen "Männer B/A". */
  const pdfKlasse = (kampf: Kampf) => {
    const rot = boxerInfo(kampf.rot, datum);
    const blau = boxerInfo(kampf.blau, datum);
    const ak = kampf.altersklasse ?? rot.altersklasse;
    const alter = ak === 'Erwachsene' ? (kampf.rot.geschlecht === 'W' ? 'Frauen' : 'Männer') : (ak ?? '');
    const lk = [rot.leistungsklasse, blau.leistungsklasse].filter((l, i, a): l is NonNullable<typeof l> => l !== null && a.indexOf(l) === i).join('/');
    return [alter, lk].filter(Boolean).join(' ');
  };
  async function erstellePdf() {
    const offen = kaempfe.filter((k) => k.kampf.pruefung.status === 'freigabe' && !k.geplant.freigabe).length;
    const verboten = kaempfe.filter((k) => k.kampf.pruefung.status === 'verboten').length;
    if (
      (offen > 0 || verboten > 0) &&
      !bestaetige(
        `Achtung: ${offen} Kampf/Kämpfe ohne Zustimmung der Trainer und ${verboten} mit Regelverstoß. PDF trotzdem erstellen?`,
      )
    ) {
      return;
    }
    setPdfLaeuft(true);
    setPdfFehler(false);
    try {
      const [j, m, t] = datum.split('-');
      await ladeKampfkartePdf(
        {
          titel: 'Kampfkarte',
          datum: `${t}.${m}.${j}`,
          beginn: uhrzeit(zeiten[0].start),
          ende: uhrzeit(zeiten[zeiten.length - 1].ende),
          kaempfe: kaempfe.map(({ kampf }, i) => {
            const slot = zeiten[i];
            return {
              nr: i + 1,
              start: uhrzeit(slot.start),
              klasse: pdfKlasse(kampf),
              rot: pdfBoxer(kampf.rot),
              blau: pdfBoxer(kampf.blau),
              pausenDavor: [
                ...(slot.auto
                  ? [{ text: 'Pause', von: uhrzeit(slot.auto.von), bis: uhrzeit(slot.auto.bis), minuten: Math.round((slot.auto.bis - slot.auto.von) / 60) }]
                  : []),
                ...slot.extra.map(({ pause, von, bis }) => ({
                  text: pause.text || 'Pause',
                  von: uhrzeit(von),
                  bis: uhrzeit(bis),
                  minuten: pause.minuten,
                })),
              ],
            };
          }),
        },
        `Kampfkarte-${datum}.pdf`,
      );
    } catch {
      setPdfFehler(true);
    } finally {
      setPdfLaeuft(false);
    }
  }

  function erzeugeAlle() {
    if (kampfkarte.length > 0 && !bestaetige('Die bisherige Kampfkarte wird ersetzt. Fortfahren?')) {
      return;
    }
    const ergebnis = erzeugePaarungen(
      boxer.filter((b) => !ausfaelle[b.id]),
      datum,
      regeln,
    );
    setZustand((z) => ({
      ...z,
      kampfkarte: ergebnis.paarungen.map((p) => ({ aId: p.a.id, bId: p.b.id, freigabe: false })),
    }));
    setAuswahl([]);
  }

  function entferne(g: GeplanterKampf) {
    setZustand((z) => ({
      ...z,
      kampfkarte: z.kampfkarte.filter((k) => !(k.aId === g.aId && k.bId === g.bId)),
    }));
  }

  function setzeFreigabe(g: GeplanterKampf, wert: boolean) {
    setZustand((z) => ({
      ...z,
      kampfkarte: z.kampfkarte.map((k) =>
        k.aId === g.aId && k.bId === g.bId ? { ...k, freigabe: wert } : k,
      ),
    }));
  }

  function tauscheEcken(g: GeplanterKampf) {
    setZustand((z) => ({
      ...z,
      kampfkarte: z.kampfkarte.map((k) =>
        k.aId === g.aId && k.bId === g.bId ? { ...k, aId: k.bId, bId: k.aId } : k,
      ),
    }));
  }

  function schalte(id: string) {
    setAuswahl((a) => (a.includes(id) ? a.filter((x) => x !== id) : a.length < 2 ? [...a, id] : [a[1], id]));
  }

  /** Name des Gegners, wenn der Boxer gerade in einem Kampf steht. */
  function gegnerVon(b: Boxer): string | null {
    const k = kampfkarte.find((x) => x.aId === b.id || x.bId === b.id);
    return k ? (nachId.get(k.aId === b.id ? k.bId : k.aId)?.name ?? null) : null;
  }

  function ausfallKnopf(b: Boxer) {
    return (
      <button className="klein" onClick={() => setAusfallFuer(b)}>
        Ausfall
      </button>
    );
  }

  function grund(b: Boxer): string {
    const info = boxerInfo(b, datum);
    if (!info.altersklasse) return 'Keine Altersklasse (unter 10 Jahre)';
    if (!info.gewichtsklasse) return 'Keine Gewichtsklasse (zu leicht)';
    const ausgefallenerGegner = Object.entries(ausfaelle).find(([, a]) => a.gegnerId === b.id);
    if (ausgefallenerGegner) {
      const name = nachId.get(ausgefallenerGegner[0])?.name ?? 'Gegner';
      return `Gegner ${name} ausgefallen (${ausgefallenerGegner[1].grund})`;
    }
    const hatVorschlag = moeglich.ok.some((p) => p.a.id === b.id || p.b.id === b.id);
    return hatVorschlag ? 'Noch nicht eingeplant' : 'Kein freier passender Gegner';
  }

  const offeneFreigaben = kaempfe.filter(
    (k) => k.kampf.pruefung.status === 'freigabe' && !k.geplant.freigabe,
  ).length;
  const verstoesse = kaempfe.filter((k) => k.kampf.pruefung.status === 'verboten').length;

  return (
    <section>
      <nav className="sprungleiste" aria-label="Zu einem Abschnitt springen">
        <button onClick={() => springe('abschnitt-kampfkarte')}>Kampfkarte ({kaempfe.length})</button>
        <button disabled={vorschlagAnzahl === 0} onClick={() => springe('abschnitt-vorschlaege')}>
          Vorschläge ({vorschlagAnzahl})
        </button>
        <button disabled={wartende.length === 0} onClick={() => springe('abschnitt-warteliste')}>
          Warteliste ({wartende.length})
        </button>
        <button disabled={ausgefallene.length === 0} onClick={() => springe('abschnitt-ausfaelle')}>
          Ausfälle ({ausgefallene.length})
        </button>
      </nav>

      <FilterLeiste
        filter={filter}
        setFilter={setFilter}
        optionen={optionen}
        ergebnis={
          filterAktiv
            ? `Kämpfe ${kaempfeSichtbar} von ${kaempfe.length} · Vorschläge ${okSichtbar.length + freigabeSichtbar.length} von ${vorschlagAnzahl} · Wartende ${wartendeSichtbar.length} von ${wartende.length} · Pausen ausgeblendet`
            : undefined
        }
      />

      <div className="grenzen">
        <label>
          Max. Gewichtsdifferenz (%)
          <input
            id="max-gewicht"
            type="number"
            min="0"
            step="0.5"
            value={regeln.maxGewichtProzent}
            onChange={(e) =>
              e.target.value !== '' &&
              setZustand((z) => ({ ...z, regeln: { ...z.regeln, maxGewichtProzent: Number(e.target.value) } }))
            }
          />
        </label>
        <label>
          Max. Siegdifferenz bei Freigabe
          <input
            id="max-siege"
            type="number"
            min="0"
            step="1"
            value={regeln.maxSiegdifferenzFreigabe}
            onChange={(e) =>
              e.target.value !== '' &&
              setZustand((z) => ({
                ...z,
                regeln: { ...z.regeln, maxSiegdifferenzFreigabe: Number(e.target.value) },
              }))
            }
          />
        </label>
        <label>
          <input
            id="klassenwechsel"
            type="checkbox"
            checked={regeln.klassenwechselFreigabe}
            onChange={(e) =>
              setZustand((z) => ({ ...z, regeln: { ...z.regeln, klassenwechselFreigabe: e.target.checked } }))
            }
          />{' '}
          Andere Alters- oder Gewichtsklasse nur mit Freigabe
        </label>
      </div>

      <div className="grenzen">
        {[
          { id: 'kampfpause', text: 'Pause zwischen Kämpfen (min)', feld: 'kampfPauseMin' },
          { id: 'grossepause', text: 'Große Pause (min)', feld: 'grossePauseMin' },
          { id: 'blockdauer', text: 'Große Pause nach (min Wettkampf)', feld: 'blockMin' },
        ].map(({ id, text, feld }) => (
          <label key={id}>
            {text}
            <input
              id={id}
              type="number"
              min="0"
              step="1"
              value={zeit[feld as keyof typeof zeit]}
              onChange={(e) => {
                const m = ganzeMinuten(e.target.value);
                if (m !== null) setZustand((z) => ({ ...z, zeit: { ...z.zeit, [feld]: m } }));
              }}
            />
          </label>
        ))}
        <label>
          Rundenzeit Erwachsene und U19
          <select
            id="erwachsenenrunde"
            value={zeit.erwachsenenRundeMin}
            onChange={(e) => setZustand((z) => ({ ...z, zeit: { ...z.zeit, erwachsenenRundeMin: Number(e.target.value) } }))}
          >
            <option value={3}>3 × 3 Minuten</option>
            <option value={2}>3 × 2 Minuten</option>
          </select>
        </label>
      </div>

      <div className="aktionen">
        <button className="primaer" onClick={erzeugeAlle} disabled={boxer.length < 2}>
          Paarungen erzeugen
        </button>
        {kampfkarte.length > 1 && <button onClick={sortiereAutomatisch}>Automatisch sortieren</button>}
        {kampfkarte.length > 0 && (
          <button onClick={erstellePdf} disabled={pdfLaeuft}>
            {pdfLaeuft ? 'PDF wird erstellt …' : 'PDF erstellen'}
          </button>
        )}
        {pdfFehler && <span className="fehler">Das PDF konnte nicht erstellt werden.</span>}
        {kampfkarte.length > 0 && (
          <button
            onClick={() => {
              if (bestaetige('Alle Kämpfe verwerfen? Die Boxer bleiben erhalten.')) {
                setZustand((z) => ({ ...z, kampfkarte: [] }));
              }
            }}
          >
            Alle verwerfen
          </button>
        )}
      </div>

      <h2 id="abschnitt-kampfkarte">Kampfkarte (Entwurf)</h2>
      {kaempfe.length > 0 && (
        <p className="zusammenfassung">
          {kaempfe.length} {kaempfe.length === 1 ? 'Kampf' : 'Kämpfe'} · {wartende.length} wartend · Beginn{' '}
          {uhrzeit(zeiten[0].start)} Uhr, Ende ca. {uhrzeit(zeiten[zeiten.length - 1].ende)} Uhr
          {ausgefallene.length > 0 && <span> · {ausgefallene.length} Ausfall</span>}
          {offeneFreigaben > 0 && <span className="warn"> · {offeneFreigaben} Freigabe(n) offen</span>}
          {verstoesse > 0 && <span className="fehler"> · {verstoesse} Regelverstoß</span>}
        </p>
      )}
      {kaempfe.length === 0 ? (
        <p className="leer">
          Noch keine Kämpfe. Erfassen Sie Boxer und klicken Sie auf „Paarungen erzeugen“.
        </p>
      ) : (
        <ol className="kampfliste">
          {kaempfe.map(({ geplant, kampf }, i) => {
            const status = kampf.pruefung.status;
            const rz = kampf.altersklasse ? rundenzeitFuer(kampf.altersklasse, zeit.erwachsenenRundeMin) : null;
            const slot = zeiten[i];
            if (!treffer([kampf.rot, kampf.blau])) return null;
            return (
              <Fragment key={`${geplant.aId}-${geplant.bId}`}>
                {!filterAktiv && slot.auto && (
                  <li className="pause-zeile">
                    <span className="pause-titel">Automatische Pause nach {zeit.blockMin} Minuten Wettkampf</span>
                    <label>
                      Dauer
                      <input
                        id={`auto-pause-${i}`}
                        type="number"
                        min="0"
                        value={autoPausen[kampfSchluessel(geplant)] ?? zeit.grossePauseMin}
                        onChange={(e) => {
                          const m = ganzeMinuten(e.target.value);
                          if (m !== null) setzeAutoPause(kampfSchluessel(geplant), m);
                        }}
                      />
                      min
                    </label>
                    <span className="pause-zeit">
                      {uhrzeit(slot.auto.von)} bis {uhrzeit(slot.auto.bis)} Uhr
                    </span>
                    {autoPausen[kampfSchluessel(geplant)] !== undefined && (
                      <button className="klein" onClick={() => setzeAutoPause(kampfSchluessel(geplant), null)}>
                        Standard ({zeit.grossePauseMin} min)
                      </button>
                    )}
                  </li>
                )}
                {!filterAktiv && slot.extra.map(({ pause, von, bis }) => (
                  <li key={pause.id} className="pause-zeile extra">
                    <input
                      id={`pause-text-${pause.id}`}
                      className="pause-text"
                      aria-label="Bezeichnung der Pause"
                      value={pause.text}
                      onChange={(e) => aenderePause(pause.id, { text: e.target.value })}
                    />
                    <label>
                      Dauer
                      <input
                        id={`pause-dauer-${pause.id}`}
                        type="number"
                        min="0"
                        value={pause.minuten}
                        onChange={(e) => {
                          const m = ganzeMinuten(e.target.value);
                          if (m !== null) aenderePause(pause.id, { minuten: m });
                        }}
                      />
                      min
                    </label>
                    <span className="pause-zeit">
                      {uhrzeit(von)} bis {uhrzeit(bis)} Uhr
                    </span>
                    <span className="kampfknoepfe">
                      <button
                        className="klein"
                        aria-label="Pause nach oben"
                        disabled={pause.vorKampf <= 1}
                        onClick={() => aenderePause(pause.id, { vorKampf: pause.vorKampf - 1 })}
                      >
                        ▲
                      </button>
                      <button
                        className="klein"
                        aria-label="Pause nach unten"
                        disabled={pause.vorKampf >= kaempfe.length}
                        onClick={() => aenderePause(pause.id, { vorKampf: pause.vorKampf + 1 })}
                      >
                        ▼
                      </button>
                      <button className="klein" onClick={() => loeschePause(pause.id)}>
                        Entfernen
                      </button>
                    </span>
                  </li>
                ))}
                <li className={`kampf ${status}`}>
                  <div className="kampfkopf">
                    <span className="nr">Kampf {i + 1}</span>
                    <span className="uhrzeit">ca. {uhrzeit(slot.start)} Uhr</span>
                    {status === 'verboten' && <span className="statusmarke verboten">Regelverstoß</span>}
                    {status === 'freigabe' && !geplant.freigabe && (
                      <span className="statusmarke freigabe">Zustimmung der Trainer offen</span>
                    )}
                    <span>{altersklasseText(kampf.altersklasse)}</span>
                    <span>Leistungsklasse {kampf.leistungsklasse}</span>
                    <span>{rz ? `${rz.runden} × ${minutenText(rz.minuten)} min` : '–'}</span>
                    <span>
                      Altersdifferenz {altersdifferenzMonate(kampf.a.geburtsdatum, kampf.b.geburtsdatum)} Monate
                    </span>
                    <span className="kampfknoepfe">
                      <button
                        className="klein"
                        aria-label="Kampf nach oben"
                        disabled={i === 0}
                        onClick={() => bewege(i, i - 1)}
                      >
                        ▲
                      </button>
                      <button
                        className="klein"
                        aria-label="Kampf nach unten"
                        disabled={i === kaempfe.length - 1}
                        onClick={() => bewege(i, i + 1)}
                      >
                        ▼
                      </button>
                      <PositionFeld wert={i + 1} max={kaempfe.length} onWahl={(n) => bewege(i, n - 1)} />
                      <button onClick={() => fuegePauseEin(i + 1)}>Pause davor</button>
                      <button onClick={() => tauscheEcken(geplant)}>Ecken tauschen</button>
                      <button onClick={() => entferne(geplant)}>Entfernen</button>
                    </span>
                  </div>
                  <div className="gegner">
                    <BoxerZelle b={kampf.rot} datum={datum} ecke="rot" aktion={ausfallKnopf(kampf.rot)} />
                    <span className="gegen">gegen</span>
                    <BoxerZelle b={kampf.blau} datum={datum} ecke="blau" aktion={ausfallKnopf(kampf.blau)} />
                  </div>
                  {status === 'verboten' && (
                    <ul className="fehler">
                      {kampf.pruefung.gruende.map((g) => (
                        <li key={g}>Regelverstoß: {g}</li>
                      ))}
                    </ul>
                  )}
                  {status === 'freigabe' && (
                    <label className="freigabe-feld">
                      <input
                        type="checkbox"
                        checked={geplant.freigabe}
                        onChange={(e) => setzeFreigabe(geplant, e.target.checked)}
                      />
                      Zustimmung beider Trainer liegt vor
                    </label>
                  )}
                  {kampf.pruefung.hinweise
                    .filter((h) => status !== 'freigabe' || !h.startsWith('Nachbar'))
                    .map((h) => (
                      <p key={h} className="hinweis">
                        {h}
                      </p>
                    ))}
                </li>
              </Fragment>
            );
          })}
        </ol>
      )}
      {filterAktiv && kaempfe.length > 0 && kaempfeSichtbar === 0 && (
        <p className="leer">Kein Kampf passt zum Filter.</p>
      )}
      {extraPausen.some((p) => p.vorKampf > kaempfe.length) && (
        <ul className="warteliste">
          {extraPausen
            .filter((p) => p.vorKampf > kaempfe.length)
            .map((p) => (
              <li key={p.id}>
                <span className="grund">
                  Pause „{p.text}“ ({p.minuten} min) steht hinter dem letzten Kampf und hat keine Wirkung.
                </span>
                <button className="klein" onClick={() => loeschePause(p.id)}>
                  Entfernen
                </button>
              </li>
            ))}
        </ul>
      )}

      {vorschlagAnzahl > 0 && (
        <>
          <h2 id="abschnitt-vorschlaege">Vorschläge für Wartende</h2>
          {filterAktiv && okSichtbar.length + freigabeSichtbar.length === 0 && (
            <p className="leer">Kein Vorschlag passt zum Filter.</p>
          )}
          {[
            { titel: 'Entsprechen den Regeln', status: 'ok', liste: okSichtbar, gesamt: moeglich.ok.length },
            { titel: 'Nur mit Freigabe', status: 'freigabe', liste: freigabeSichtbar, gesamt: moeglich.freigabe.length },
          ]
            .filter((g) => g.liste.length > 0)
            .map((g) => (
              <div key={g.status}>
                <h3 className="vorschlag-titel">
                  {g.titel} ({zaehler(g.liste.length, g.gesamt)})
                </h3>
                <ul className="vorschlaege">
                  {g.liste.map((p) => (
                    <li key={`${p.a.id}-${p.b.id}`} className={`vorschlag ${g.status}`}>
                      <div className="kampfkopf">
                        <span>
                          Altersdifferenz {altersdifferenzMonate(p.a.geburtsdatum, p.b.geburtsdatum)} Monate
                        </span>
                        <span>
                          Gewichtsdifferenz {Math.abs(p.a.gewicht - p.b.gewicht).toFixed(1).replace('.', ',')} kg
                        </span>
                        <span className="kampfknoepfe">
                          <button onClick={() => ergaenze([{ aId: p.a.id, bId: p.b.id, freigabe: false }])}>
                            Übernehmen
                          </button>
                        </span>
                      </div>
                      <div className="gegner">
                        <BoxerZelle b={p.a} datum={datum} ecke="rot" />
                        <span className="gegen">gegen</span>
                        <BoxerZelle b={p.b} datum={datum} ecke="blau" />
                      </div>
                      {p.hinweise.map((h) => (
                        <p key={h} className={`hinweis vorschlag-grund ${g.status}`}>
                          {h}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </>
      )}

      <h2 id="abschnitt-warteliste">Warteliste ({zaehler(wartendeSichtbar.length, wartende.length)})</h2>
      {wartende.length === 0 ? (
        <p className="leer">Niemand wartet.</p>
      ) : (
        <>
          <p className="hinweis">
            Zwei Boxer anhaken, um selbst einen Kampf anzulegen. Wer zuerst angehakt wird, boxt in der roten
            Ecke. Die App zeigt vorher, ob der Kampf den Regeln entspricht.
          </p>
          <ul className="warteliste">
            {wartendeSichtbar.map((b, i) => {
              const gruppe = gruppenName(b, datum);
              const neueGruppe = i === 0 || gruppe !== gruppenName(wartendeSichtbar[i - 1], datum);
              return (
                <Fragment key={b.id}>
                  {neueGruppe && <li className="gruppe">{gruppe}</li>}
                  <li>
                    <label>
                      <input
                        type="checkbox"
                        checked={auswahl.includes(b.id)}
                        onChange={() => schalte(b.id)}
                      />
                      <BoxerZelle b={b} datum={datum} />
                    </label>
                    <span className="grund">
                      {grund(b)}
                      {mitFreigabe.has(b.id) ? ' · mit Freigabe möglich, siehe Vorschläge' : ''}
                    </span>
                    {ausfallKnopf(b)}
                  </li>
                </Fragment>
              );
            })}
          </ul>
          {wartendeSichtbar.length === 0 && <p className="leer">Kein wartender Boxer passt zum Filter.</p>}
        </>
      )}

      {ausgefallene.length > 0 && (
        <>
          <h2 id="abschnitt-ausfaelle">Ausfälle ({zaehler(ausgefalleneSichtbar.length, ausgefallene.length)})</h2>
          <ul className="warteliste">
            {ausgefalleneSichtbar.map((b) => {
              const a = ausfaelle[b.id];
              const gegner = a.gegnerId ? nachId.get(a.gegnerId) : undefined;
              return (
                <li key={b.id}>
                  <BoxerZelle b={b} datum={datum} />
                  <span className="grund">
                    <strong className="fehler">{a.grund}</strong>
                    {a.notiz && ` · ${a.notiz}`}
                    {gegner && ` · Kampf gegen ${gegner.name} entfallen`}
                  </span>
                  <button
                    className="klein"
                    onClick={() => setZustand((z) => hebeAusfallAuf(z, b.id))}
                  >
                    Wieder aufnehmen
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {vorschauAuswahl && (
        <PaarungsDialog
          kampf={vorschauAuswahl}
          datum={datum}
          erwachsenenRundeMin={zeit.erwachsenenRundeMin}
          onAnlegen={() => ergaenze([{ aId: gewaehlt[0].id, bId: gewaehlt[1].id, freigabe: false }])}
          onTauschen={() => setAuswahl(([x, y]) => [y, x])}
          onAbbrechen={() => setAuswahl([])}
        />
      )}
      {ausfallFuer && (
        <AusfallDialog
          boxer={ausfallFuer}
          gegner={gegnerVon(ausfallFuer)}
          onMelden={(g, notiz) => {
            setZustand((z) => meldeAusfall(z, ausfallFuer.id, g, notiz));
            setAuswahl((a) => a.filter((id) => id !== ausfallFuer.id));
            setAusfallFuer(null);
          }}
          onAbbrechen={() => setAusfallFuer(null)}
        />
      )}
    </section>
  );
}
