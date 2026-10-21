import { baueKampfkartePdf, type PdfKarte } from './pdfdoc';

/** Erstellt die PDF-Datei im Browser und gibt einen Link darauf zurück. Die Schriften (ca. 1 MB) werden erst dabei geladen. */
export async function erstelleKampfkartePdf(karte: PdfKarte): Promise<string> {
  const [{ default: pdfMake }, vfs] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  pdfMake.addVirtualFileSystem((vfs as { default?: Record<string, string> }).default ?? (vfs as unknown as Record<string, string>));
  const blob = await pdfMake.createPdf(baueKampfkartePdf(karte)).getBlob();
  return URL.createObjectURL(blob);
}
