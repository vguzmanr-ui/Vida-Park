import { UnitCardItem, AppConfig, UnitStatus } from '../types';
import { generateQrSvg } from './qrcode';

export function printQRSheet(
  items: UnitCardItem[],
  config: AppConfig,
  statuses: Record<string, UnitStatus>,
  scopeTitle: string,
  onToast: (msg: string) => void
) {
  const aptItems = items.filter(it => it.kind === 'apt');
  if (aptItems.length === 0) {
    onToast('No hay apartamentos en esta vista para imprimir');
    return;
  }

  const cardsHtml = aptItems
    .map(it => {
      const parts = it.key.split('#');
      const towerId = parts[0];
      const floorId = parts[1];
      const idx = parseInt(parts[2], 10);
      const tower = config.towers.find(t => t.id === towerId);
      const floor = tower?.floors.find(f => f.id === floorId);
      const u = statuses[it.key];
      const number = u?.numberOverride || (floor ? floor.start + idx : idx + 1);
      const floorLabel = floor ? floor.label : '';
      const qrText = `VIDA PARK\nTorre ${towerId} - Apto ${number}\nID: ${it.key}`;
      const svg = generateQrSvg(qrText, 4, 0);

      return `
      <div class="qrcard">
        <div class="qrsvg">${svg}</div>
        <div class="qrnum">Apto ${number}</div>
        <div class="qrsub">Torre ${towerId} · ${floorLabel}</div>
      </div>`;
    })
    .join('');

  const win = window.open('', '_blank');
  if (!win) {
    onToast('El navegador bloqueó la ventana de impresión');
    return;
  }

  const pageHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>QR — ${scopeTitle}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: 'Inter', -apple-system, Arial, sans-serif; margin: 0; padding: 24px; background: #fff; color: #1E3A34; }
    .no-print { margin-bottom: 20px; }
    .no-print button { font-family: inherit; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 6px; border: 1px solid #3C6FB0; background: #3C6FB0; color: #fff; cursor: pointer; }
    .no-print button:hover { background: #22406E; }
    h1 { font-size: 20px; text-transform: uppercase; margin: 0 0 4px; }
    p.sub { font-size: 13px; color: #6C8079; margin: 0 0 20px; }
    .sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
    .qrcard { border: 1px solid #CBD9CC; border-radius: 8px; padding: 12px; text-align: center; page-break-inside: avoid; background: #fff; }
    .qrsvg svg { width: 110px; height: 110px; margin: 0 auto; display: block; }
    .qrnum { font-weight: 700; font-size: 16px; margin-top: 8px; color: #1E3A34; }
    .qrsub { font-size: 11px; color: #6C8079; text-transform: uppercase; letter-spacing: .03em; margin-top: 2px; }
    @media print { .no-print { display: none; } }
  </style></head><body>
  <div class="no-print"><button onclick="window.print()">🖨️ Imprimir Hoja de QR</button></div>
  <h1>Vida Park — Códigos QR</h1>
  <p class="sub">${scopeTitle} · ${aptItems.length} apartamento${aptItems.length === 1 ? '' : 's'}</p>
  <div class="sheet">${cardsHtml}</div>
  </body></html>`;

  win.document.open();
  win.document.write(pageHtml);
  win.document.close();
}
