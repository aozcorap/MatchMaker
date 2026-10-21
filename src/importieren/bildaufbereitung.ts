/**
 * Bildaufbereitung für die Texterkennung: entfernt Tabellenlinien aus einem Screenshot.
 * Linien liegen direkt neben den Ziffern und werden sonst als "|" oder "_" gelesen, lassen Ziffern verschmelzen
 * ("5" wird "55") oder verschlucken ganze Zellen. Die Schrift selbst und farbige Flächen bleiben unverändert.
 */

export interface Raster {
  /** RGBA, wie bei ImageData */
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Ab diesem Helligkeitsunterschied (0 bis 255) zählt eine Stelle als Kante. */
const KANTE = 22;

/**
 * `maximum`: Helligkeit ist der größte der drei Farbwerte. Dunkler Text auf kräftig roten oder blauen Flächen
 * (typisch für Meldetabellen) hebt sich so deutlich ab; bei der üblichen Gewichtung ist ein reines Rot fast so dunkel wie Schwarz.
 */
function graustufen(r: Raster, maximum = false): Uint8Array {
  const grau = new Uint8Array(r.width * r.height);
  for (let i = 0; i < grau.length; i++) {
    const o = i * 4;
    grau[i] = maximum
      ? Math.max(r.data[o], r.data[o + 1], r.data[o + 2])
      : Math.round(0.299 * r.data[o] + 0.587 * r.data[o + 1] + 0.114 * r.data[o + 2]);
  }
  return grau;
}

/**
 * Markiert Stellen, die zu einer langen, geraden Kante gehören. `entlang` ist die Richtung der Linie.
 * Buchstaben haben nur kurze Kanten, Tabellenlinien reichen über mindestens `mindestLaenge` Pixel.
 */
function langeKanten(grau: Uint8Array, breite: number, hoehe: number, waagerecht: boolean, mindestLaenge: number): Uint8Array {
  const markiert = new Uint8Array(breite * hoehe);
  const aussen = waagerecht ? hoehe : breite; // Anzahl der Linien-Positionen quer zur Linie
  const innen = waagerecht ? breite : hoehe; // Länge entlang der Linie
  const wert = (quer: number, laengs: number) => (waagerecht ? grau[quer * breite + laengs] : grau[laengs * breite + quer]);
  const index = (quer: number, laengs: number) => (waagerecht ? quer * breite + laengs : laengs * breite + quer);

  for (let quer = 2; quer < aussen - 2; quer++) {
    let start = -1;
    for (let laengs = 0; laengs <= innen; laengs++) {
      const kante = laengs < innen && Math.abs(wert(quer + 2, laengs) - wert(quer - 2, laengs)) > KANTE;
      if (kante && start < 0) start = laengs;
      if (!kante && start >= 0) {
        if (laengs - start >= mindestLaenge) for (let l = start; l < laengs; l++) markiert[index(quer, l)] = 1;
        start = -1;
      }
    }
  }
  return markiert;
}

/** Übermalt markierte Stellen mit dem nächsten unmarkierten Wert quer zur Linie. */
function uebermale(grau: Uint8Array, markiert: Uint8Array, breite: number, hoehe: number, waagerecht: boolean) {
  const aussen = waagerecht ? hoehe : breite;
  const innen = waagerecht ? breite : hoehe;
  const index = (quer: number, laengs: number) => (waagerecht ? quer * breite + laengs : laengs * breite + quer);
  for (let laengs = 0; laengs < innen; laengs++) {
    let quer = 0;
    while (quer < aussen) {
      if (!markiert[index(quer, laengs)]) {
        quer += 1;
        continue;
      }
      const von = quer;
      while (quer < aussen && markiert[index(quer, laengs)]) quer += 1;
      const bis = quer - 1;
      const davor = von > 0 ? grau[index(von - 1, laengs)] : null;
      const danach = bis < aussen - 1 ? grau[index(bis + 1, laengs)] : null;
      for (let q = von; q <= bis; q++) {
        const naehe = q - von < bis - q ? davor ?? danach : danach ?? davor;
        if (naehe !== null) grau[index(q, laengs)] = naehe;
      }
    }
  }
}

/**
 * `faktor` ist die bereits angewendete Vergrößerung des Bildes. Ergebnis: Graustufenbild ohne Tabellenlinien.
 */
export function entferneTabellenlinien(r: Raster, faktor: number, maximum = false): Raster {
  const { width: breite, height: hoehe } = r;
  const grau = graustufen(r, maximum);
  const mindestLaenge = Math.max(24, Math.round(24 * faktor));
  // Zuerst beide Richtungen erkennen, dann übermalen, damit sich Kreuzungen nicht gegenseitig stören
  const waagerecht = langeKanten(grau, breite, hoehe, true, mindestLaenge);
  const senkrecht = langeKanten(grau, breite, hoehe, false, mindestLaenge);
  uebermale(grau, waagerecht, breite, hoehe, true);
  uebermale(grau, senkrecht, breite, hoehe, false);

  const aus = new Uint8ClampedArray(breite * hoehe * 4);
  for (let i = 0; i < grau.length; i++) {
    aus[i * 4] = grau[i];
    aus[i * 4 + 1] = grau[i];
    aus[i * 4 + 2] = grau[i];
    aus[i * 4 + 3] = 255;
  }
  return { data: aus, width: breite, height: hoehe };
}

/**
 * Vergrößert ein Bild linear. Eigener Code statt der Skalierung des Browsers, damit das Ergebnis überall
 * dasselbe ist (Browser skalieren unterschiedlich) und sich im Labor nachprüfen lässt.
 */
export function vergroessern(r: Raster, faktor: number): Raster {
  if (faktor === 1) return r;
  const breite = Math.round(r.width * faktor);
  const hoehe = Math.round(r.height * faktor);
  const data = new Uint8ClampedArray(breite * hoehe * 4);
  for (let y = 0; y < hoehe; y++) {
    const sy = Math.min(r.height - 1, y / faktor);
    const y0 = Math.floor(sy);
    const y1 = Math.min(r.height - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < breite; x++) {
      const sx = Math.min(r.width - 1, x / faktor);
      const x0 = Math.floor(sx);
      const x1 = Math.min(r.width - 1, x0 + 1);
      const fx = sx - x0;
      for (let k = 0; k < 4; k++) {
        const a = r.data[(y0 * r.width + x0) * 4 + k] * (1 - fx) + r.data[(y0 * r.width + x1) * 4 + k] * fx;
        const b = r.data[(y1 * r.width + x0) * 4 + k] * (1 - fx) + r.data[(y1 * r.width + x1) * 4 + k] * fx;
        data[(y * breite + x) * 4 + k] = a * (1 - fy) + b * fy;
      }
    }
  }
  return { data, width: breite, height: hoehe };
}
