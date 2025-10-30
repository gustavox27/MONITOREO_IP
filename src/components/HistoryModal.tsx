import { useEffect, useState } from 'react';
import { deviceService } from '../services/deviceService';
import { X, Activity, AlertCircle, Clock } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

interface HistoryModalProps {
  device: Device;
  onClose: () => void;
}

export function HistoryModal({ device, onClose }: HistoryModalProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [device.id]);

  const loadEvents = async () => {
    try {
      const data = await deviceService.getDeviceEvents(device.id);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'online'
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusIcon = (status: string) => {
    return status === 'online' ? (
      <Activity className="w-4 h-4" />
    ) : (
      <AlertCircle className="w-4 h-4" />
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-ES');
  };

  const calculateUptime = () => {
    if (events.length === 0) return 'N/A';

    const onlineCount = events.filter(e => e.status === 'online').length;
    const percentage = ((onlineCount / events.length) * 100).toFixed(1);
    return `${percentage}%`;
  };

  const getAverageResponseTime = () => {
    const onlineEvents = events.filter(e => e.status === 'online' && e.response_time);
    if (onlineEvents.length === 0) return 'N/A';

    const sum = onlineEvents.reduce((acc, e) => acc + (e.response_time || 0), 0);
    const avg = Math.round(sum / onlineEvents.length);
    return `${avg}ms`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{device.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              <code className="bg-gray-100 px-2 py-1 rounded">{device.ip_address}</code>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Tiempo Activo</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{calculateUptime()}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Respuesta Promedio</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{getAverageResponseTime()}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <span className="text-sm font-medium">Total de Eventos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{events.length}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Eventos</h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando eventos...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aún no se han registrado eventos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                      {getStatusIcon(event.status)}
                      {event.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                    </span>
                    <span className="text-sm text-gray-700">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {event.response_time ? `${event.response_time}ms` : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
