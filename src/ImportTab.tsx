import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { alsText, type Zelle } from './importieren/felder';
import { liesTabelle, liesText } from './importieren/lesen';
import { pruefeZeile, zaehleInEingabe } from './importieren/pruefen';
import type { ImportZeile, LeseErgebnis } from './importieren/typen';
import type { Zustand } from './speicher';

const BEISPIEL = `Name;Verein;Geburtsdatum;Geschlecht;Gewicht;Kämpfe;Siege;Niederlagen
Max Mustermann;BC Beispiel;12.03.2005;m;72,5;10;7;3
Anna Beispiel;BC Beispiel;01.02.2008;w;55;3;1;2`;

type Feld = 'name' | 'verein' | 'geburtsdatum' | 'geschlecht' | 'gewicht' | 'kaempfe' | 'siege' | 'niederlagen';

function fasse(a: LeseErgebnis, b: LeseErgebnis): LeseErgebnis {
  return { zeilen: [...a.zeilen, ...b.zeilen], ignoriert: [...a.ignoriert, ...b.ignoriert] };
}

export function ImportTab(props: {
  zustand: Zustand;
  setZustand: Dispatch<SetStateAction<Zustand>>;
  onUebernommen: (anzahl: number) => void;
}) {
  const { zustand, setZustand, onUebernommen } = props;
  const [text, setText] = useState('');
  const [standardVerein, setStandardVerein] = useState('');
  const [zeilen, setZeilen] = useState<ImportZeile[] | null>(null);
  const [ignoriert, setIgnoriert] = useState<string[]>([]);
  /** Ausdrückliche Auswahl; ohne Eintrag gilt: übernehmen, wenn fehlerfrei und noch nicht vorhanden */
  const [auswahl, setAuswahl] = useState<Record<string, boolean>>({});
  const [meldung, setMeldung] = useState('');
  const dateiRef = useRef<HTMLInputElement>(null);

  const vereine = useMemo(() => [...new Set(zustand.boxer.map((b) => b.verein))].sort((a, b) => a.localeCompare(b, 'de')), [zustand.boxer]);

  const pruefungen = useMemo(() => {
    if (!zeilen) return [];
    const mehrfach = zaehleInEingabe(zeilen);
    return zeilen.map((z) => pruefeZeile(z, zustand.boxer, mehrfach));
  }, [zeilen, zustand.boxer]);

  const gewaehlt = (i: number): boolean => {
    const p = pruefungen[i];
    if (!p || p.fehler.length > 0) return false;
    return auswahl[zeilen![i].id] ?? !p.vorhanden;
  };
  const anzahlGewaehlt = zeilen ? zeilen.filter((_, i) => gewaehlt(i)).length : 0;
  const anzahlFehler = pruefungen.filter((p) => p.fehler.length > 0).length;
  const anzahlVorhanden = pruefungen.filter((p) => p.vorhanden).length;

  function uebernimm(ergebnis: LeseErgebnis) {
    setZeilen(ergebnis.zeilen);
    setIgnoriert(ergebnis.ignoriert);
    setAuswahl({});
    setMeldung(
      ergebnis.zeilen.length === 0
        ? 'Es wurden keine Boxerdaten erkannt. Prüfen Sie die Eingabe oder fügen Sie den Beispieltext ein, um das Format zu sehen.'
        : '',
    );
  }

  function einlesen() {
    uebernimm(liesText(text, { standardVerein: standardVerein.trim() }));
  }

  async function liesDatei(datei: File) {
    const name = datei.name.toLowerCase();
    setMeldung('');
    try {
      if (name.endsWith('.xlsx')) {
        // Die Excel-Bibliothek wird erst bei Bedarf geladen
        const { default: leseExcel } = await import('read-excel-file/browser');
        const blaetter = await leseExcel(datei);
        const optionen = { standardVerein: standardVerein.trim() };
        const ergebnis = blaetter
          .map((b) => liesTabelle(b.data as Zelle[][], optionen))
          .reduce(fasse, { zeilen: [], ignoriert: [] });
        setText(
          blaetter
            .flatMap((b) => b.data.map((r) => (r as Zelle[]).map(alsText).join('\t')))
            .join('\n'),
        );
        uebernimm(ergebnis);
      } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const inhalt = await datei.text();
        setText(inhalt);
        uebernimm(liesText(inhalt, { standardVerein: standardVerein.trim() }));
      } else if (name.endsWith('.xls')) {
        setMeldung('Das alte Excel-Format (.xls) wird nicht gelesen. Bitte in Excel als .xlsx speichern und erneut wählen.');
      } else if (/\.(png|jpe?g|webp|gif|heic)$/.test(name)) {
        setMeldung('Screenshots können noch nicht gelesen werden. Bitte die Daten als Excel-Datei oder als Text einfügen.');
      } else {
        setMeldung('Dieses Dateiformat wird nicht unterstützt. Möglich sind .xlsx, .csv und .txt.');
      }
    } catch {
      setMeldung('Die Datei konnte nicht gelesen werden. Ist sie beschädigt oder mit Passwort geschützt?');
    }
  }

  function aendere(id: string, feld: Feld, wert: string) {
    setZeilen((alle) => alle && alle.map((z) => (z.id === id ? { ...z, [feld]: wert } : z)));
  }

  function setzeGeschlecht(id: string, wert: string) {
    setZeilen((alle) => alle && alle.map((z) => (z.id === id ? { ...z, geschlecht: wert as ImportZeile['geschlecht'] } : z)));
  }

  function uebernehmeAuswahl() {
    if (!zeilen) return;
    const neu = zeilen.flatMap((_, i) => (gewaehlt(i) && pruefungen[i].boxer ? [pruefungen[i].boxer!] : []));
    if (neu.length === 0) return;
    setZustand((z) => ({ ...z, boxer: [...z.boxer, ...neu] }));
    setZeilen(null);
    setIgnoriert([]);
    setAuswahl({});
    setText('');
    onUebernommen(neu.length);
  }

  return (
    <section>
      <h2>Meldung einlesen</h2>
      <p className="hinweis">
        Excel-Datei (.xlsx), CSV oder Text aus E-Mail und WhatsApp. Jeder Trainer meldet anders, deshalb erkennt die App
        Überschriften wie Name, Verein, Geburtsdatum, Gewicht, Kämpfe, Siege auch in anderer Schreibweise. Nichts wird
        übernommen, bevor Sie es unten geprüft haben.
      </p>
      <div className="formular import-eingabe">
        <label className="formular-feld">
          Text einfügen (eine Zeile je Boxer, oder eine Tabelle aus Excel kopiert)
          <textarea
            id="import-text"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Max Mustermann, BC Beispiel, 12.03.2005, m, 72,5 kg, 10 Kämpfe 7 Siege 3 Niederlagen'}
          />
        </label>
        <div className="aktionen import-aktionen">
          <label className="formular-feld">
            Verein, falls die Zeilen keinen nennen
            <input
              id="import-verein"
              list="import-vereine"
              value={standardVerein}
              onChange={(e) => setStandardVerein(e.target.value)}
            />
            <datalist id="import-vereine">
              {vereine.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </label>
          <button className="primaer" onClick={einlesen} disabled={text.trim() === ''}>
            Text einlesen
          </button>
          <button onClick={() => dateiRef.current?.click()}>Datei wählen</button>
          <button onClick={() => setText(BEISPIEL)}>Beispiel einfügen</button>
          <input
            id="import-datei"
            ref={dateiRef}
            type="file"
            accept=".xlsx,.xls,.csv,.txt,image/*"
            hidden
            onChange={(e) => {
              const datei = e.target.files?.[0];
              if (datei) void liesDatei(datei);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {meldung && (
        <p className="warn" role="status">
          {meldung}
        </p>
      )}

      {zeilen && zeilen.length > 0 && (
        <>
          <h2>Prüfen und übernehmen</h2>
          <p className="zusammenfassung">
            {zeilen.length} {zeilen.length === 1 ? 'Boxer' : 'Boxer'} erkannt
            {anzahlFehler > 0 && <span className="fehler"> · {anzahlFehler} mit Fehlern (nicht übernehmbar, bitte ergänzen)</span>}
            {anzahlVorhanden > 0 && <span className="warn"> · {anzahlVorhanden} schon vorhanden</span>}
            {ignoriert.length > 0 && <span> · {ignoriert.length} Zeilen ohne Boxerdaten ignoriert</span>}
          </p>
          <div className="tabelle-rahmen">
            <table className="importtabelle">
              <thead>
                <tr>
                  <th>Neu</th>
                  <th>Name</th>
                  <th>Verein</th>
                  <th>Geburtsdatum</th>
                  <th>m/w</th>
                  <th>kg</th>
                  <th>Kämpfe</th>
                  <th>Siege</th>
                  <th>Niederl.</th>
                </tr>
              </thead>
              <tbody>
                {zeilen.map((z, i) => {
                  const p = pruefungen[i];
                  return (
                    <Zeile
                      key={z.id}
                      z={z}
                      nummer={i + 1}
                      fehler={p.fehler}
                      warnungen={p.warnungen}
                      gewaehlt={gewaehlt(i)}
                      onWahl={(wert) => setAuswahl((a) => ({ ...a, [z.id]: wert }))}
                      onAendere={aendere}
                      onGeschlecht={setzeGeschlecht}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="aktionen import-aktionen">
            <button className="primaer" onClick={uebernehmeAuswahl} disabled={anzahlGewaehlt === 0}>
              {anzahlGewaehlt} {anzahlGewaehlt === 1 ? 'Boxer' : 'Boxer'} übernehmen
            </button>
            <button
              onClick={() => {
                setZeilen(null);
                setIgnoriert([]);
              }}
            >
              Verwerfen
            </button>
          </div>
        </>
      )}
      {ignoriert.length > 0 && (
        <details className="ignoriert">
          <summary>{ignoriert.length} ignorierte Zeilen ohne Boxerdaten</summary>
          <ul>
            {ignoriert.map((z, i) => (
              <li key={i}>{z}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function Zeile(props: {
  z: ImportZeile;
  nummer: number;
  fehler: string[];
  warnungen: string[];
  gewaehlt: boolean;
  onWahl: (wert: boolean) => void;
  onAendere: (id: string, feld: Feld, wert: string) => void;
  onGeschlecht: (id: string, wert: string) => void;
}) {
  const { z, nummer, fehler, warnungen, gewaehlt, onWahl, onAendere, onGeschlecht } = props;
  const zelle = (feld: Feld, breite?: string, typ = 'text') => (
    <input
      id={`import-${feld}-${z.id}`}
      aria-label={`${feld} der Zeile ${nummer}`}
      type={typ}
      className={breite}
      value={z[feld]}
      onChange={(e) => onAendere(z.id, feld, e.target.value)}
    />
  );
  return (
    <>
      <tr className={fehler.length > 0 ? 'import-fehler' : undefined}>
        <td>
          <input
            type="checkbox"
            aria-label={`Zeile ${nummer} übernehmen`}
            checked={gewaehlt}
            disabled={fehler.length > 0}
            onChange={(e) => onWahl(e.target.checked)}
          />
        </td>
        <td>{zelle('name', 'breit')}</td>
        <td>{zelle('verein', 'breit')}</td>
        <td>{zelle('geburtsdatum', 'datum', 'date')}</td>
        <td>
          <select
            id={`import-geschlecht-${z.id}`}
            aria-label={`Geschlecht der Zeile ${nummer}`}
            value={z.geschlecht}
            onChange={(e) => onGeschlecht(z.id, e.target.value)}
          >
            <option value="">–</option>
            <option value="M">m</option>
            <option value="W">w</option>
          </select>
        </td>
        <td>{zelle('gewicht', 'schmal')}</td>
        <td>{zelle('kaempfe', 'schmal')}</td>
        <td>{zelle('siege', 'schmal')}</td>
        <td>{zelle('niederlagen', 'schmal')}</td>
      </tr>
      <tr className={fehler.length > 0 ? 'import-fehler import-info' : 'import-info'}>
        <td />
        <td colSpan={8} className="pruefung">
          {fehler.length === 0 && warnungen.length === 0 && <span className="ok-text">in Ordnung</span>}
          {fehler.map((f) => (
            <span key={f} className="fehler">
              {f}
            </span>
          ))}
          {warnungen.map((w) => (
            <span key={w} className="warn">
              {w}
            </span>
          ))}
          <span className="quelle">Quelle: {z.quelle}</span>
        </td>
      </tr>
    </>
  );
}
