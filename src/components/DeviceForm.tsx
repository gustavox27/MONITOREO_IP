import { useState, useEffect } from 'react';
import { deviceService } from '../services/deviceService';
import { X, AlertCircle } from 'lucide-react';
import { getDeviceIcon, getDeviceIconColor, deviceTypeOptions, type DeviceType } from '../utils/deviceIcons';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];

interface DeviceFormProps {
  device?: Device | null;
  userId: string;
  onClose: () => void;
}

export function DeviceForm({ device, userId, onClose }: DeviceFormProps) {
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('generic');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (device) {
      setName(device.name);
      setIpAddress(device.ip_address);
      setDeviceType(device.device_type);
    }
  }, [device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!deviceService.validateIpAddress(ipAddress)) {
      setError('Formato de dirección IP inválido');
      setLoading(false);
      return;
    }

    try {
      const duplicate = await deviceService.checkDuplicateIp(
        ipAddress,
        userId,
        device?.id
      );

      if (duplicate) {
        setError(`Ya tienes un dispositivo con esta IP: "${(duplicate as any).name}". No puedes agregar la misma IP dos veces.`);
        setLoading(false);
        return;
      }

      if (device) {
        await deviceService.updateDevice(device.id, {
          name,
          ip_address: ipAddress,
          device_type: deviceType,
        });
      } else {
        await deviceService.createDevice({
          name,
          ip_address: ipAddress,
          device_type: deviceType,
          user_id: userId,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el dispositivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {device ? 'Editar Dispositivo' : 'Agregar Nuevo Dispositivo'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Dispositivo
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="ej., Servidor 1, Router, etc."
              />
            </div>

            <div>
              <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Dirección IP
              </label>
              <input
                id="ipAddress"
                type="text"
                required
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
                placeholder="192.168.1.1"
              />
              <p className="mt-2 text-xs text-gray-500">
                Ingresa una dirección IPv4 válida (ej., 192.168.1.1)
              </p>
            </div>

            <div>
              <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Dispositivo
              </label>
              <select
                id="deviceType"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {deviceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Vista Previa del Icono</p>
              <div className="flex items-center justify-center">
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${getDeviceIconColor(deviceType)}`}>
                  {getDeviceIcon(deviceType, 'w-10 h-10')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Guardando...' : device ? 'Actualizar Dispositivo' : 'Agregar Dispositivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
