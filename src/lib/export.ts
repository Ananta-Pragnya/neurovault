/**
 * Export utilities for CSV and PDF.
 * CSV uses native browser APIs (no deps).
 * PDF uses print-to-pdf via a hidden iframe (no deps needed).
 */

export function exportCSV(data: Record<string, any>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPrintPDF(title: string, elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  const html = `
    <!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      body { font-family: 'Inter', sans-serif; background: #fff; color: #111; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
      th { background: #f5f5f5; font-weight: 600; }
      h2 { font-size: 16px; margin-bottom: 12px; }
      .print-header { font-size: 11px; color: #666; margin-bottom: 8px; }
    </style>
    </head><body>
    <p class="print-header">FinMotion AI — ${title} — ${new Date().toLocaleString()}</p>
    ${el.innerHTML}
    </body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();
  setTimeout(() => {
    iframe.contentWindow!.print();
    document.body.removeChild(iframe);
  }, 500);
}
