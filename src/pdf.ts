import { baueKampfkartePdf, type PdfKarte } from './pdfdoc';

/** Erstellt die PDF-Datei im Browser und lädt sie herunter. Die Schriften (ca. 1 MB) werden erst dabei geladen. */
export async function ladeKampfkartePdf(karte: PdfKarte, dateiname: string): Promise<void> {
  const [{ default: pdfMake }, vfs] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem((vfs as { default?: Record<string, string> }).default ?? (vfs as unknown as Record<string, string>));
  pdfMake.createPdf(baueKampfkartePdf(karte)).download(dateiname);
}
