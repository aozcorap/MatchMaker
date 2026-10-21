import { Fragment, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { hebeAusfallAuf, meldeAusfall } from './ausfall';
import { AusfallDialog } from './AusfallDialog';
import { BoxerZelle } from './BoxerZelle';
import { PaarungsDialog } from './PaarungsDialog';
import { erzeugePaarungen } from './regeln/generator';
import { altersklasseText, boxerInfo } from './regeln/info';
import { baueKampf, leichterZuerst, vergleicheKampf, vergleicheWartende } from './regeln/kampfkarte';
import { rundenzeitFuer } from './regeln/klassen';
import { altersdifferenzMonate, paarungsGuete } from './regeln/paarung';
import type { Boxer } from './regeln/typen';
import { kampfdauer, plane, uhrzeit } from './regeln/zeitplan';
import type { GeplanterKampf, Zustand } from './speicher';
import { bestaetige } from './umgebung';

function minutenText(m: number): string {
  return String(m).replace('.', ',');
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
}) {
  const { zustand, setZustand } = props;
  const { datum, beginn, boxer, kampfkarte, ausfaelle, regeln } = zustand;
  const [auswahl, setAuswahl] = useState<string[]>([]);
  const [ausfallFuer, setAusfallFuer] = useState<Boxer | null>(null);

  const nachId = useMemo(() => new Map(boxer.map((b) => [b.id, b])), [boxer]);

  const kaempfe = useMemo(
    () =>
      kampfkarte
        .map((geplant) => ({
          geplant,
          kampf: baueKampf(nachId.get(geplant.aId)!, nachId.get(geplant.bId)!, datum, regeln),
        }))
        .sort((x, y) => vergleicheKampf(x.kampf, y.kampf)),
    [kampfkarte, nachId, datum, regeln],
  );

  // Voraussichtliche Zeiten; ohne Altersklasse (nur bei manuell angelegten Regelverstößen) gilt 3 × 3 Minuten
  const zeiten = useMemo(
    () =>
      plane(
        beginn,
        kaempfe.map((k) =>
          kampfdauer(rundenzeitFuer(k.kampf.altersklasse ?? 'Erwachsene')),
        ),
      ),
    [kaempfe, beginn],
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

  const gewaehlt = auswahl.filter((id) => !belegt.has(id)).map((id) => nachId.get(id)!).filter(Boolean);
  const vorschauAuswahl =
    gewaehlt.length === 2 ? baueKampf(gewaehlt[0], gewaehlt[1], datum, regeln) : null;

  function ergaenze(neu: GeplanterKampf[]) {
    setZustand((z) => ({ ...z, kampfkarte: [...z.kampfkarte, ...neu] }));
    setAuswahl([]);
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
      </div>

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
            const rz = kampf.altersklasse ? rundenzeitFuer(kampf.altersklasse) : null;
            const zeit = zeiten[i];
            return (
              <Fragment key={`${geplant.aId}-${geplant.bId}`}>
                {zeit.pauseVorher && (
                  <li className="grosse-pause">
                    Pause 30 Minuten, {uhrzeit(zeit.pauseVorher.von)} bis {uhrzeit(zeit.pauseVorher.bis)} Uhr
                  </li>
                )}
                <li className={`kampf ${status}`}>
                  <div className="kampfkopf">
                    <span className="nr">Kampf {i + 1}</span>
                    <span className="uhrzeit">ca. {uhrzeit(zeit.start)} Uhr</span>
                    <span>{altersklasseText(kampf.altersklasse)}</span>
                    <span>Leistungsklasse {kampf.leistungsklasse}</span>
                    <span>{rz ? `${rz.runden} × ${minutenText(rz.minuten)} min` : '–'}</span>
                    <span>
                      Altersdifferenz {altersdifferenzMonate(kampf.a.geburtsdatum, kampf.b.geburtsdatum)} Monate
                    </span>
                    <span className="kampfknoepfe">
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
              </Fragment>
            );
          })}
        </ol>
      )}

      {(moeglich.ok.length > 0 || moeglich.freigabe.length > 0) && (
        <>
          <h2>Vorschläge für Wartende</h2>
          {[
            { titel: 'Entsprechen den Regeln', status: 'ok', liste: moeglich.ok },
            { titel: 'Nur mit Freigabe', status: 'freigabe', liste: moeglich.freigabe },
          ]
            .filter((g) => g.liste.length > 0)
            .map((g) => (
              <div key={g.status}>
                <h3 className="vorschlag-titel">
                  {g.titel} ({g.liste.length})
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
                      {mitFreigabe.has(b.id) ? ' · mit Freigabe möglich, siehe Vorschläge' : ''}
                    </span>
                    {ausfallKnopf(b)}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </>
      )}

      {ausgefallene.length > 0 && (
        <>
          <h2>Ausfälle ({ausgefallene.length})</h2>
          <ul className="warteliste">
            {ausgefallene.map((b) => {
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
