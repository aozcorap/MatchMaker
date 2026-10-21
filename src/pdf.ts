import { baueKampfkartePdf, type PdfKarte } from './pdfdoc';

/** Lädt die Bausteine für das PDF (ca. 1 MB Schriften) schon vorab, damit der Download danach schnell geht. */
export function ladeVorab(): void {
  void import('pdfmake/build/pdfmake');
  void import('pdfmake/build/vfs_fonts');
}

/** Erstellt die PDF-Datei im Browser und lädt sie herunter. */
export async function ladeKampfkartePdf(karte: PdfKarte, dateiname: string): Promise<void> {
  const [{ default: pdfMake }, vfs] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem((vfs as { default?: Record<string, string> }).default ?? (vfs as unknown as Record<string, string>));
  const blob = await pdfMake.createPdf(baueKampfkartePdf(karte)).getBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
