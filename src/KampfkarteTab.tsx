import { Fragment, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { erzeugePaarungen } from './regeln/generator';
import { altersklasseText, boxerInfo, gewichtsklasseText } from './regeln/info';
import { baueKampf, vergleicheKampf, vergleicheWartende } from './regeln/kampfkarte';
import { altersdifferenzMonate } from './regeln/paarung';
import { rundenzeitFuer } from './regeln/klassen';
import type { Boxer } from './regeln/typen';
import type { GeplanterKampf, Zustand } from './speicher';
import { bestaetige } from './umgebung';

function minutenText(m: number): string {
  return String(m).replace('.', ',');
}

function gruppenName(b: Boxer, datum: string): string {
  const geschlecht = b.geschlecht === 'M' ? 'Männer' : 'Frauen';
  const ak = boxerInfo(b, datum).altersklasse;
  return `${geschlecht} · ${ak ? altersklasseText(ak) : 'keine Altersklasse'}`;
}

function BoxerZelle({ b, datum, ecke }: { b: Boxer; datum: string; ecke?: 'rot' | 'blau' }) {
  const info = boxerInfo(b, datum);
  return (
    <div className={ecke ? `boxer ecke ${ecke}` : 'boxer'}>
      {ecke && <span className="eckenlabel">{ecke === 'rot' ? 'Rote Ecke' : 'Blaue Ecke'}</span>}
      <strong>{b.name}</strong>
      <span>{b.verein}</span>
      <span>
        geb. {b.geburtsdatum.split('-').reverse().join('.')} · {b.gewicht} kg · {b.kaempfe} K / {b.siege} S ·{' '}
        {altersklasseText(info.altersklasse)} ·{' '}
        {gewichtsklasseText(info.gewichtsklasse)} · {info.leistungsklasse ?? '–'}
      </span>
    </div>
  );
}

export function KampfkarteTab(props: {
  zustand: Zustand;
  setZustand: Dispatch<SetStateAction<Zustand>>;
}) {
  const { zustand, setZustand } = props;
  const { datum, boxer, kampfkarte } = zustand;
  const [auswahl, setAuswahl] = useState<string[]>([]);

  const nachId = useMemo(() => new Map(boxer.map((b) => [b.id, b])), [boxer]);

  const kaempfe = useMemo(
    () =>
      kampfkarte
        .map((geplant) => ({
          geplant,
          kampf: baueKampf(nachId.get(geplant.aId)!, nachId.get(geplant.bId)!, datum),
        }))
        .sort((x, y) => vergleicheKampf(x.kampf, y.kampf)),
    [kampfkarte, nachId, datum],
  );

  const belegt = useMemo(() => new Set(kampfkarte.flatMap((k) => [k.aId, k.bId])), [kampfkarte]);
  const wartende = useMemo(
    () => boxer.filter((b) => !belegt.has(b.id)).sort((x, y) => vergleicheWartende(x, y, datum)),
    [boxer, belegt, datum],
  );
  const vorschlaege = useMemo(() => erzeugePaarungen(wartende, datum), [wartende, datum]);

  const gewaehlt = auswahl.filter((id) => !belegt.has(id)).map((id) => nachId.get(id)!).filter(Boolean);
  const vorschauAuswahl = gewaehlt.length === 2 ? baueKampf(gewaehlt[0], gewaehlt[1], datum) : null;

  function ergaenze(neu: GeplanterKampf[]) {
    setZustand((z) => ({ ...z, kampfkarte: [...z.kampfkarte, ...neu] }));
    setAuswahl([]);
  }

  function erzeugeAlle() {
    if (kampfkarte.length > 0 && !bestaetige('Die bisherige Kampfkarte wird ersetzt. Fortfahren?')) {
      return;
    }
    const ergebnis = erzeugePaarungen(boxer, datum);
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

  function grund(b: Boxer): string {
    const info = boxerInfo(b, datum);
    if (!info.altersklasse) return 'Keine Altersklasse (unter 10 Jahre)';
    if (!info.gewichtsklasse) return 'Keine Gewichtsklasse (zu leicht)';
    const hatVorschlag = vorschlaege.paarungen.some((p) => p.a.id === b.id || p.b.id === b.id);
    return hatVorschlag ? 'Noch nicht eingeplant' : 'Kein freier passender Gegner';
  }

  const offeneFreigaben = kaempfe.filter(
    (k) => k.kampf.pruefung.status === 'freigabe' && !k.geplant.freigabe,
  ).length;
  const verstoesse = kaempfe.filter((k) => k.kampf.pruefung.status === 'verboten').length;

  return (
    <section>
      <div className="aktionen">
        <button className="primaer" onClick={erzeugeAlle} disabled={boxer.length < 2}>
          Paarungen erzeugen
        </button>
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

      <h2>Kampfkarte (Entwurf)</h2>
      {kaempfe.length > 0 && (
        <p className="zusammenfassung">
          {kaempfe.length} {kaempfe.length === 1 ? 'Kampf' : 'Kämpfe'} · {wartende.length} wartend
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
            const rz = kampf.altersklasse ? rundenzeitFuer(kampf.altersklasse) : null;
            return (
              <li key={`${geplant.aId}-${geplant.bId}`} className={`kampf ${status}`}>
                <div className="kampfkopf">
                  <span className="nr">Kampf {i + 1}</span>
                  <span>{altersklasseText(kampf.altersklasse)}</span>
                  <span>Leistungsklasse {kampf.leistungsklasse}</span>
                  <span>{rz ? `${rz.runden} × ${minutenText(rz.minuten)} min` : '–'}</span>
                  <span>Altersdifferenz {altersdifferenzMonate(kampf.a.geburtsdatum, kampf.b.geburtsdatum)} Monate</span>
                  <span className="kampfknoepfe">
                    <button onClick={() => tauscheEcken(geplant)}>Ecken tauschen</button>
                    <button onClick={() => entferne(geplant)}>Entfernen</button>
                  </span>
                </div>
                <div className="gegner">
                  <BoxerZelle b={kampf.rot} datum={datum} ecke="rot" />
                  <span className="gegen">gegen</span>
                  <BoxerZelle b={kampf.blau} datum={datum} ecke="blau" />
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
                    Freigabe liegt vor (beide Trainer, Veranstalter, oberster Ringrichter)
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
            );
          })}
        </ol>
      )}

      <h2>Warteliste ({wartende.length})</h2>
      {wartende.length === 0 ? (
        <p className="leer">Niemand wartet.</p>
      ) : (
        <>
          <p className="hinweis">
            Zwei Boxer anhaken, um selbst einen Kampf anzulegen. Wer zuerst angehakt wird, boxt in der roten
            Ecke. Die App zeigt vorher, ob der Kampf den Regeln entspricht.
          </p>
          <ul className="warteliste">
            {wartende.map((b, i) => {
              const frei = vorschlaege.warteliste.find((w) => w.boxer.id === b.id)?.freigabeMoeglich;
              const gruppe = gruppenName(b, datum);
              const neueGruppe = i === 0 || gruppe !== gruppenName(wartende[i - 1], datum);
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
                    {frei ? ' · mit Freigabe wäre ein Gegner möglich' : ''}
                  </span>
                </li>
                </Fragment>
              );
            })}
          </ul>
          {vorschauAuswahl && (
            <div className={`vorschau ${vorschauAuswahl.pruefung.status}`}>
              <strong>
                {vorschauAuswahl.rot.name} (rot) gegen {vorschauAuswahl.blau.name} (blau):{' '}
                {vorschauAuswahl.pruefung.status === 'ok'
                  ? 'entspricht den Regeln'
                  : vorschauAuswahl.pruefung.status === 'freigabe'
                    ? 'nur mit Freigabe'
                    : 'verstößt gegen die Regeln'}
              </strong>
              <ul>
                {[...vorschauAuswahl.pruefung.gruende, ...vorschauAuswahl.pruefung.hinweise].map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <button
                className="primaer"
                onClick={() =>
                  ergaenze([{ aId: gewaehlt[0].id, bId: gewaehlt[1].id, freigabe: false }])
                }
              >
                Kampf anlegen
              </button>
            </div>
          )}
        </>
      )}

      {(vorschlaege.paarungen.length > 0 || vorschlaege.freigabeVorschlaege.length > 0) && (
        <>
          <h2>Vorschläge für Wartende</h2>
          <ul className="vorschlaege">
            {vorschlaege.paarungen.map((p) => (
              <li key={`${p.a.id}-${p.b.id}`}>
                <span>
                  {p.a.name} (rot) gegen {p.b.name} (blau) <em>(entspricht den Regeln)</em>
                </span>
                <button onClick={() => ergaenze([{ aId: p.a.id, bId: p.b.id, freigabe: false }])}>
                  Übernehmen
                </button>
              </li>
            ))}
            {vorschlaege.freigabeVorschlaege.map((p) => (
              <li key={`${p.a.id}-${p.b.id}`}>
                <span>
                  {p.a.name} (rot) gegen {p.b.name} (blau) <em>(nur mit Freigabe)</em>
                </span>
                <button onClick={() => ergaenze([{ aId: p.a.id, bId: p.b.id, freigabe: false }])}>
                  Übernehmen
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
