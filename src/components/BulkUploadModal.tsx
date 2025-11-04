import { useState, useRef } from 'react';
import { X, Upload, Download, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import type { DeviceType } from '../utils/deviceIcons';

interface BulkUploadModalProps {
  userId: string;
  onClose: () => void;
}

interface DeviceRow {
  name: string;
  ip_address: string;
  device_type: DeviceType;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export function BulkUploadModal({ userId, onClose }: BulkUploadModalProps) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = 'nombre,direccion_ip,tipo_dispositivo\n' +
      'Servidor Principal,192.168.1.10,server\n' +
      'Impresora Oficina,192.168.1.20,printer_laser\n' +
      'Router Principal,192.168.1.1,router\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_dispositivos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): DeviceRow[] => {
    const lines = text.trim().split('\n');
    const devices: DeviceRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) continue;

      const [name, ip_address, device_type] = parts;

      devices.push({
        name,
        ip_address,
        device_type: device_type as DeviceType,
        status: 'pending'
      });
    }

    return devices;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsedDevices = parseCSV(text);
      setDevices(parsedDevices);
    };
    reader.readAsText(file);
  };

  const validateDevice = (device: DeviceRow): { valid: boolean; error?: string } => {
    if (!device.name || device.name.length < 2) {
      return { valid: false, error: 'Nombre inválido' };
    }

    if (!deviceService.validateIpAddress(device.ip_address)) {
      return { valid: false, error: 'IP inválida' };
    }

    const validTypes: DeviceType[] = ['printer_laser', 'printer_label', 'clock', 'server', 'laptop', 'ups', 'modem', 'router', 'generic'];
    if (!validTypes.includes(device.device_type)) {
      return { valid: false, error: 'Tipo de dispositivo inválido' };
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
          name: device.name,
          ip_address: device.ip_address,
          device_type: device.device_type,
          user_id: userId,
        });

        setDevices(prev => prev.map((d, idx) =>
          idx === i ? { ...d, status: 'success' } : d
        ));
      } catch (error: any) {
        setDevices(prev => prev.map((d, idx) =>
          idx === i ? { ...d, status: 'error', error: error.message || 'Error al crear dispositivo' } : d
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
            <p className="text-sm text-gray-600 mt-1">Carga múltiples dispositivos desde un archivo CSV</p>
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
                <h3 className="font-semibold text-blue-900 mb-2">Instrucciones</h3>
                <ol className="list-decimal ml-5 space-y-1 text-sm text-blue-800">
                  <li>Descarga la plantilla CSV</li>
                  <li>Completa la información de tus dispositivos</li>
                  <li>Carga el archivo completado</li>
                  <li>Revisa la vista previa y confirma la carga</li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Tipos de dispositivo válidos:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div><code className="bg-white px-2 py-1 rounded">server</code> - Servidor</div>
                  <div><code className="bg-white px-2 py-1 rounded">printer_laser</code> - Impresora Láser</div>
                  <div><code className="bg-white px-2 py-1 rounded">printer_label</code> - Impresora Etiquetas</div>
                  <div><code className="bg-white px-2 py-1 rounded">clock</code> - Reloj</div>
                  <div><code className="bg-white px-2 py-1 rounded">laptop</code> - Laptop</div>
                  <div><code className="bg-white px-2 py-1 rounded">ups</code> - UPS</div>
                  <div><code className="bg-white px-2 py-1 rounded">modem</code> - Módem</div>
                  <div><code className="bg-white px-2 py-1 rounded">router</code> - Router</div>
                  <div><code className="bg-white px-2 py-1 rounded">generic</code> - Genérico</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadTemplate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  <Download className="w-5 h-5" />
                  Descargar Plantilla CSV
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  <Upload className="w-5 h-5" />
                  Cargar Archivo CSV
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
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
                        <p className="font-medium text-gray-900">{device.name}</p>
                        <p className="text-sm text-gray-600">
                          <code className="bg-white px-1.5 py-0.5 rounded">{device.ip_address}</code>
                          {' • '}
                          <span>{device.device_type}</span>
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
