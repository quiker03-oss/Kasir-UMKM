import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4';
}

/**
 * Generates and downloads a real PDF from a DOM element using html2canvas & jsPDF.
 * Accurately fits or paginates onto A4 pages (210mm x 297mm).
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions
): Promise<boolean> {
  try {
    const orientation = options.orientation || 'portrait';
    const isPortrait = orientation === 'portrait';

    // A4 dimensions in mm
    const a4WidthMm = isPortrait ? 210 : 297;
    const a4HeightMm = isPortrait ? 297 : 210;
    const marginMm = 8; // 8mm margin
    const contentWidthMm = a4WidthMm - marginMm * 2;

    // Render DOM to high-resolution canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 2x scale for crisp, professional print quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;

    // Calculate height in mm corresponding to contentWidthMm
    const totalImgHeightMm = (imgHeightPx * contentWidthMm) / imgWidthPx;

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const contentHeightPerA4Mm = a4HeightMm - marginMm * 2;

    // If content fits on one page
    if (totalImgHeightMm <= contentHeightPerA4Mm) {
      pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWidthMm, totalImgHeightMm);
    } else {
      // Multi-page slicing
      let remainingHeightMm = totalImgHeightMm;
      let currentPositionMm = 0;

      while (remainingHeightMm > 0) {
        if (currentPositionMm > 0) {
          pdf.addPage('a4', orientation);
        }

        // Draw image offset to simulate paging
        pdf.addImage(
          imgData,
          'JPEG',
          marginMm,
          marginMm - currentPositionMm,
          contentWidthMm,
          totalImgHeightMm
        );

        currentPositionMm += contentHeightPerA4Mm;
        remainingHeightMm -= contentHeightPerA4Mm;
      }
    }

    // Save with the exact filename (e.g. Laporan_Keuangan_01-10-2026.pdf)
    const finalFilename = options.filename.endsWith('.pdf')
      ? options.filename
      : `${options.filename}.pdf`;
    pdf.save(finalFilename);
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Gagal membuat dokumen PDF: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Universal print trigger for clean, isolated printing.
 * Injects isolated iframe with strictly the document HTML so that
 * no sidebar, dashboard navigation, or action buttons appear on the paper.
 */
export function printCleanDocument(htmlContent: string, docTitle: string = 'Cetak Dokumen'): void {
  try {
    const existing = document.getElementById('print-clean-isolation-frame');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-clean-isolation-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8">
            <title>${docTitle}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background: #ffffff;
                color: #0f172a;
                font-size: 11px;
                line-height: 1.4;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
              table {
                border-collapse: collapse;
                width: 100%;
              }
              th, td {
                padding: 6px 8px;
              }
              @media print {
                body {
                  padding: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.remove();
        } catch {}
      }, 45000);
      return;
    }
  } catch (err) {
    console.warn('Iframe print failed, falling back to window.print():', err);
  }

  window.print();
}

/**
 * Format date into DD-MM-YYYY for Indonesia standards and filenames
 */
export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
