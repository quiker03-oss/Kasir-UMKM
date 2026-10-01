/**
 * Universal Printing & Formatting Utility for Kasir UMKM
 * Handles isolated, artifact-free printing for:
 * - Employee ID Cards (Single / Batch Sheet)
 * - Salary Slips (Slip Gaji Karyawan)
 * - Thermal Receipts (Struk Kasir 58mm / 80mm)
 */

export function printHtmlDirect(contentHtml: string, title: string = 'Cetak Dokumen'): void {
  try {
    // Attempt iframe printing to guarantee 100% clean isolation from SPA dom
    const existing = document.getElementById('kasir-print-iframe');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'kasir-print-iframe';
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
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                margin: 0;
                padding: 12px;
                font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                background: #ffffff;
                color: #0f172a;
              }
              @page {
                size: auto;
                margin: 8mm;
              }
              @media print {
                body {
                  padding: 0;
                }
                .page-break {
                  page-break-after: always;
                  break-after: page;
                }
              }
            </style>
          </head>
          <body>
            ${contentHtml}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 200);
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
      }, 60000);
      return;
    }
  } catch (err) {
    console.warn('Iframe print fallback to window.print():', err);
  }

  // Fallback if iframe access fails
  window.print();
}

/**
 * Converts numeric value to Indonesian currency text (Terbilang)
 * Example: 2500000 -> "Dua Juta Lima Ratus Ribu Rupiah"
 */
export function terbilangRupiah(nomor: number): string {
  const angka = Math.floor(Math.abs(nomor));
  if (angka === 0) return 'Nol Rupiah';

  const huruf = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  function konversi(n: number): string {
    if (n < 12) return huruf[n];
    if (n < 20) return konversi(n - 10) + ' Belas';
    if (n < 100) return konversi(Math.floor(n / 10)) + ' Puluh ' + konversi(n % 10);
    if (n < 200) return 'Seratus ' + konversi(n - 100);
    if (n < 1000) return konversi(Math.floor(n / 100)) + ' Ratus ' + konversi(n % 100);
    if (n < 2000) return 'Seribu ' + konversi(n - 1000);
    if (n < 1000000) return konversi(Math.floor(n / 1000)) + ' Ribu ' + konversi(n % 1000);
    if (n < 1000000000) return konversi(Math.floor(n / 1000000)) + ' Juta ' + konversi(n % 1000000);
    if (n < 1000000000000) return konversi(Math.floor(n / 1000000000)) + ' Miliar ' + konversi(n % 1000000000);
    return '';
  }

  return (konversi(angka).replace(/\s+/g, ' ').trim() + ' Rupiah');
}
