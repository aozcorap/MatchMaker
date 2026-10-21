import { istAktiv, KEIN_FILTER, type Filter, type FilterOptionen } from './filter';
import { altersklasseText } from './regeln/info';

/** Auswahl nach Verein, Geschlecht, Altersklasse und Gewichtsklasse; `ergebnis` zeigt, was gerade sichtbar ist. */
export function FilterLeiste(props: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  optionen: FilterOptionen;
  ergebnis?: string;
}) {
  const { filter, setFilter, optionen, ergebnis } = props;
  const aktiv = istAktiv(filter);
  return (
    <div className={aktiv ? 'filterleiste aktiv' : 'filterleiste'} role="group" aria-label="Filter">
      <label>
        Verein
        <select id="filter-verein" value={filter.verein} onChange={(e) => setFilter({ ...filter, verein: e.target.value })}>
          <option value="">Alle</option>
          {optionen.vereine.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Geschlecht
        <select
          id="filter-geschlecht"
          value={filter.geschlecht}
          onChange={(e) => setFilter({ ...filter, geschlecht: e.target.value as Filter['geschlecht'] })}
        >
          <option value="">Alle</option>
          <option value="M">Männer</option>
          <option value="W">Frauen</option>
        </select>
      </label>
      <label>
        Altersklasse
        <select
          id="filter-alter"
          value={filter.altersklasse}
          onChange={(e) => setFilter({ ...filter, altersklasse: e.target.value as Filter['altersklasse'] })}
        >
          <option value="">Alle</option>
          {optionen.altersklassen.map((k) => (
            <option key={k} value={k}>
              {k === 'keine' ? 'keine Altersklasse' : altersklasseText(k)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Gewichtsklasse
        <select
          id="filter-gewicht"
          value={filter.gewichtsklasse}
          onChange={(e) => setFilter({ ...filter, gewichtsklasse: e.target.value })}
        >
          <option value="">Alle</option>
          {optionen.gewichtsklassen.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      {aktiv && (
        <button className="klein" onClick={() => setFilter(KEIN_FILTER)}>
          Filter zurücksetzen
        </button>
      )}
      {ergebnis && <span className="filter-ergebnis">{ergebnis}</span>}
    </div>
  );
}
