import { useState, useRef } from 'react';
import { X, Upload, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import * as XLSX from 'xlsx';
import type { DeviceType } from '../utils/deviceIcons';

interface BulkUploadModalProps {
  userId: string;
  onClose: () => void;
}

interface DeviceRow {
  nombre: string;
  direccion_ip: string;
  tipo_dispositivo: DeviceType;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export function BulkUploadModal({ userId, onClose }: BulkUploadModalProps) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nombre', 'direccion_ip', 'tipo_dispositivo'],
      ['Servidor Principal', '192.168.1.10', 'servidor'],
      ['Impresora Oficina', '192.168.1.20', 'impresora_laser'],
      ['Router Principal', '192.168.1.1', 'enrutador'],
      ['Laptop Gerencia', '192.168.1.50', 'laptop'],
      ['UPS Sala Servidores', '192.168.1.30', 'ups'],
      ['Reloj Oficina', '192.168.1.60', 'reloj'],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispositivos');

    const colWidths = [
      { wch: 25 },
      { wch: 18 },
      { wch: 20 },
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'plantilla_dispositivos.xlsx');
  };

  const parseExcel = (arrayBuffer: ArrayBuffer): DeviceRow[] => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const devices: DeviceRow[] = [];

    const typeMap: Record<string, DeviceType> = {
      'servidor': 'server',
      'server': 'server',
      'impresora_laser': 'printer_laser',
      'printer_laser': 'printer_laser',
      'impresora_etiquetas': 'printer_label',
      'printer_label': 'printer_label',
      'reloj': 'clock',
      'clock': 'clock',
      'laptop': 'laptop',
      'ups': 'ups',
      'modem': 'modem',
      'enrutador': 'router',
      'router': 'router',
      'generico': 'generic',
      'generic': 'generic'
    };

    data.forEach((row: any) => {
      const nombre = row['nombre']?.toString().trim();
      const direccion_ip = row['direccion_ip']?.toString().trim();
      const tipo_dispositivo = row['tipo_dispositivo']?.toString().toLowerCase().trim();

      if (nombre && direccion_ip && tipo_dispositivo) {
        const mappedType = typeMap[tipo_dispositivo];
        if (mappedType) {
          devices.push({
            nombre,
            direccion_ip,
            tipo_dispositivo: mappedType,
            status: 'pending'
          });
        }
      }
    });

    return devices;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const parsedDevices = parseExcel(arrayBuffer);
      setDevices(parsedDevices);
    };
    reader.readAsArrayBuffer(file);
  };

  const validateDevice = (device: DeviceRow): { valid: boolean; error?: string } => {
    if (!device.nombre || device.nombre.length < 2) {
      return { valid: false, error: 'Nombre inválido' };
    }

    if (!deviceService.validateIpAddress(device.direccion_ip)) {
      return { valid: false, error: 'IP inválida' };
    }

    const validTypes: DeviceType[] = ['printer_laser', 'printer_label', 'clock', 'server', 'laptop', 'ups', 'modem', 'router', 'generic'];
    if (!validTypes.includes(device.tipo_dispositivo)) {
      return { valid: false, error: 'Tipo inválido' };
    }

    return { valid: true };
  };

  const handleUpload = async () => {
    setUploading(true);

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      const validation = validateDevice(device);

      if (!validation.valid) {
        setDevices(prev => prev.map((d, idx) =>
          idx === i ? { ...d, status: 'error', error: validation.error } : d
        ));
        continue;
      }

      try {
        await deviceService.createDevice({
          name: device.nombre,
          ip_address: device.direccion_ip,
          device_type: device.tipo_dispositivo,
          user_id: userId,
        });

        setDevices(prev => prev.map((d, idx) =>
          idx === i ? { ...d, status: 'success' } : d
        ));
      } catch (error: any) {
        setDevices(prev => prev.map((d, idx) =>
          idx === i ? { ...d, status: 'error', error: error.message || 'Error al crear' } : d
        ));
      }
    }

    setUploading(false);
    setUploadComplete(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const successCount = devices.filter(d => d.status === 'success').length;
  const errorCount = devices.filter(d => d.status === 'error').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Carga Masiva de Dispositivos</h2>
            <p className="text-sm text-gray-600 mt-1">Carga múltiples dispositivos desde un archivo Excel</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {devices.length === 0 ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Cómo usar:</h3>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-blue-800">
                  <li>Descarga la plantilla Excel</li>
                  <li>Completa cada fila con:
                    <ul className="list-disc ml-5 mt-1">
                      <li><strong>nombre</strong> - Nombre del dispositivo</li>
                      <li><strong>direccion_ip</strong> - Dirección IP (ej: 192.168.1.10)</li>
                      <li><strong>tipo_dispositivo</strong> - Tipo del dispositivo</li>
                    </ul>
                  </li>
                  <li>Carga el archivo completado</li>
                  <li>Revisa la vista previa y confirma la carga</li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Tipos de dispositivo válidos (en español):</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div><code className="bg-white px-2 py-1 rounded">servidor</code> - Servidor</div>
                  <div><code className="bg-white px-2 py-1 rounded">impresora_laser</code> - Impresora Láser</div>
                  <div><code className="bg-white px-2 py-1 rounded">impresora_etiquetas</code> - Impresora Etiquetas</div>
                  <div><code className="bg-white px-2 py-1 rounded">reloj</code> - Reloj</div>
                  <div><code className="bg-white px-2 py-1 rounded">laptop</code> - Laptop</div>
                  <div><code className="bg-white px-2 py-1 rounded">ups</code> - UPS</div>
                  <div><code className="bg-white px-2 py-1 rounded">modem</code> - Módem</div>
                  <div><code className="bg-white px-2 py-1 rounded">enrutador</code> - Router</div>
                  <div><code className="bg-white px-2 py-1 rounded">generico</code> - Genérico</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadTemplate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  <Download className="w-5 h-5" />
                  Descargar Plantilla Excel
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  <Upload className="w-5 h-5" />
                  Cargar Archivo Excel
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Resumen de Carga</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-bold text-gray-900">{devices.length}</span>
                  </div>
                  {uploadComplete && (
                    <>
                      <div>
                        <span className="text-gray-600">Exitosos:</span>
                        <span className="ml-2 font-bold text-green-600">{successCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Errores:</span>
                        <span className="ml-2 font-bold text-red-600">{errorCount}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {devices.map((device, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(device.status)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(device.status)}
                      <div>
                        <p className="font-medium text-gray-900">{device.nombre}</p>
                        <p className="text-sm text-gray-600">
                          <code className="bg-white px-1.5 py-0.5 rounded">{device.direccion_ip}</code>
                          {' • '}
                          <span>{device.tipo_dispositivo}</span>
                        </p>
                      </div>
                    </div>
                    {device.error && (
                      <span className="text-sm text-red-600">{device.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          {devices.length === 0 ? (
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
          ) : uploadComplete ? (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDevices([]);
                  setUploadComplete(false);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cargar Otro Archivo
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setDevices([])}
                disabled={uploading}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Iniciar Carga
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
