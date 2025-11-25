import jsPDF, { type jsPDFOptions } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import type { Database } from '../lib/database.types';
import { generateInlineSVGForHTML, deviceIconColors, type DeviceType } from './iconHelpers';

type Device = Database['public']['Tables']['devices']['Row'];

interface CellHookData {
  row: { index: number };
  cell: {
    styles: {
      fillColor?: number[];
      textColor?: number[];
      cellPadding?: number;
    };
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  section: 'head' | 'body' | 'foot';
}


export const getCurrentDate = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDeviceDataForExport = (devices: Device[]) => {
  return devices.map(device => ({
    tipo: device.device_type,
    dispositivo: device.name,
    ip: device.ip_address,
    estado: device.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA',
    respuesta: device.response_time ? `${device.response_time}ms` : 'N/A',
    actividad: calculateUptime(device),
    ultima_caida: formatDate(device.last_down),
    ultimo_cambio: formatDateWithTime(device.last_down),
  }));
};

const calculateUptime = (device: Device): string => {
  if (device.status !== 'online' || !device.last_down) {
    return 'N/A';
  }

  const lastDownTime = new Date(device.last_down).getTime();
  const now = Date.now();
  const diffMs = now - lastDownTime;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'Menos de 1m';
  }
};

const formatDate = (date: string | null): string => {
  if (!date) return 'Nunca';
  return new Date(date).toLocaleString('es-ES');
};

const formatDateWithTime = (date: string | null): string => {
  if (!date) return 'N/A';
  const now = Date.now();
  const referenceTime = new Date(date).getTime();
  const diffMs = now - referenceTime;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

function getDeviceTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    printer_laser: 'Impresora Láser',
    printer_label: 'Impresora Etiquetadora',
    clock: 'Reloj',
    server: 'Servidor',
    laptop: 'Laptop',
    ups: 'UPS',
    modem: 'Módem',
    router: 'Router',
    generic: 'Dispositivo Genérico',
  };
  return typeMap[type] || type;
}

export const exportToPDF = (devices: Device[]) => {
  try {
    if (!devices || devices.length === 0) {
      alert('No hay dispositivos para exportar');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    } as jsPDFOptions);

    const currentDate = getCurrentDate();
    const title = `Reporte Dispositivos: Planta Huachipa ${currentDate}`;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(title, 15, 15);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 15, 22);

    const tableData = devices.map(device => [
      device.name,
      device.ip_address,
      device.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA',
      device.response_time ? `${device.response_time}ms` : 'N/A',
      calculateUptime(device),
      formatDate(device.last_down),
      formatDateWithTime(device.last_down),
    ]);

    const autoTableOptions: any = {
      head: [['Dispositivo', 'IP', 'Estado', 'Respuesta', 'Actividad', 'Última Caída', 'Último Cambio']],
      body: tableData,
      startY: 28,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [75, 85, 99],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'left' },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
      },
      didDrawCell: (data: CellHookData) => {
        if (data.section === 'body' && data.row.index < devices.length) {
          const rowData = devices[data.row.index];
          if (rowData && rowData.status === 'offline') {
            data.cell.styles.fillColor = [255, 200, 200];
            data.cell.styles.textColor = [139, 0, 0];
          } else {
            data.cell.styles.fillColor = data.row.index % 2 === 0 ? [255, 255, 255] : [245, 245, 245];
            data.cell.styles.textColor = [0, 0, 0];
          }
        }
      },
      margin: { top: 10 },
    };

    (doc as any).autoTable(autoTableOptions);
    doc.save(`Reporte_Dispositivos_${currentDate}.pdf`);
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    alert('Error al generar el PDF. Por favor, intenta de nuevo.');
  }
};

export const exportToExcel = (devices: Device[]) => {
  const currentDate = getCurrentDate();

  const data = devices.map(device => ({
    'Tipo': device.device_type,
    'Dispositivo': device.name,
    'IP': device.ip_address,
    'Estado': device.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA',
    'Respuesta': device.response_time ? `${device.response_time}ms` : 'N/A',
    'Actividad': calculateUptime(device),
    'Última Caída': formatDate(device.last_down),
    'Último Cambio': formatDateWithTime(device.last_down),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

  ws['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.writeFile(wb, `Reporte_Dispositivos_${currentDate}.xlsx`);
};

export const exportToImage = async (tableElement: HTMLElement) => {
  try {
    const canvas = await html2canvas(tableElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `Reporte_Dispositivos_${getCurrentDate()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error al exportar imagen:', error);
    alert('Error al exportar la imagen');
  }
};

export const exportToHTML = (devices: Device[]) => {
  try {
    const currentDate = getCurrentDate();
    const title = `Reporte Dispositivos: Planta Huachipa ${currentDate}`;

    const deviceIconsData = devices.map(device => {
      const deviceType = device.device_type as DeviceType;
      const color = deviceIconColors[deviceType] || deviceIconColors.generic;
      return {
        type: device.device_type,
        typeName: getDeviceTypeName(device.device_type),
        svg: generateInlineSVGForHTML(deviceType),
        bgColor: color.bg,
        textColor: color.text,
      };
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f9fafb;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #111827;
      margin-bottom: 20px;
      font-size: 24px;
      font-weight: 700;
      text-align: center;
    }
    .report-info {
      color: #666;
      text-align: center;
      font-size: 13px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    thead {
      background-color: #4b5563;
      color: white;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      border: 1px solid #4b5563;
    }
    td {
      padding: 12px;
      border: 1px solid #e5e7eb;
      font-size: 13px;
      vertical-align: middle;
    }
    .device-type-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .device-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .device-icon svg {
      width: 24px;
      height: 24px;
      display: block;
    }
    code {
      background-color: #f3f4f6;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
      font-size: 12px;
    }
    tbody tr {
      border-bottom: 1px solid #e5e7eb;
      transition: background-color 0.2s;
    }
    tbody tr:nth-child(even) {
      background-color: #fafbfc;
    }
    tbody tr:hover {
      background-color: #f0f1f2;
    }
    tbody tr.offline {
      background-color: #fee2e2;
    }
    tbody tr.offline:hover {
      background-color: #fecaca;
    }
    tbody tr.offline td {
      color: #991b1b;
      border-color: #fca5a5;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid;
    }
    .status-online {
      background-color: #dcfce7;
      color: #166534;
      border-color: #bbf7d0;
    }
    .status-offline {
      background-color: #fee2e2;
      color: #991b1b;
      border-color: #fecaca;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 0;
        margin: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="report-info">Generado el ${new Date().toLocaleString('es-ES')}</div>
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Dispositivo</th>
          <th>IP</th>
          <th>Estado</th>
          <th>Respuesta</th>
          <th>Actividad</th>
          <th>Última Caída</th>
          <th>Último Cambio</th>
        </tr>
      </thead>
      <tbody>
        ${devices.map((device, index) => {
          const iconData = deviceIconsData[index];
          return `
            <tr class="${device.status === 'offline' ? 'offline' : ''}">
              <td>
                <div class="device-type-cell">
                  <div class="device-icon" style="background-color: ${iconData.bgColor}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    ${iconData.svg}
                  </div>
                </div>
              </td>
              <td>${device.name}</td>
              <td><code>${device.ip_address}</code></td>
              <td>
                ${device.status === 'offline'
                  ? '<span class="status-badge status-offline">FUERA DE LÍNEA</span>'
                  : '<span class="status-badge status-online">EN LÍNEA</span>'}
              </td>
              <td>${device.response_time ? `${device.response_time}ms` : 'N/A'}</td>
              <td>${calculateUptime(device)}</td>
              <td>${formatDate(device.last_down)}</td>
              <td>${formatDateWithTime(device.last_down)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
    <div class="footer">
      <p>Reporte generado automáticamente por el Sistema de Monitoreo de Dispositivos</p>
    </div>
  </div>
</body>
</html>`;

    const link = document.createElement('a');
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Dispositivos_${currentDate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error al exportar HTML:', error);
    alert('Error al generar el reporte HTML. Por favor, intenta de nuevo.');
  }
};
