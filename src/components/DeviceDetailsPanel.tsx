import { useEffect, useState } from 'react';
import { X, Activity, Clock, TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { deviceService } from '../services/deviceService';
import { supabase } from '../lib/supabase';
import { getDeviceIcon, getDeviceIconColor, deviceTypeLabels } from '../utils/deviceIcons';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

interface DeviceDetailsPanelProps {
  device: Device;
  onClose: () => void;
}

export function DeviceDetailsPanel({ device, onClose }: DeviceDetailsPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDevice, setCurrentDevice] = useState<Device>(device);

  useEffect(() => {
    loadEvents();

    const eventsChannel = supabase
      .channel(`events-${device.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `device_id=eq.${device.id}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new as Event, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    const deviceChannel = supabase
      .channel(`device-${device.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `id=eq.${device.id}`,
        },
        (payload) => {
          setCurrentDevice(payload.new as Device);
        }
      )
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
      deviceChannel.unsubscribe();
    };
  }, [device.id]);

  const loadEvents = async () => {
    try {
      const data = await deviceService.getDeviceEvents(device.id);
      setEvents(data.slice(0, 10));
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAverageLatency = () => {
    const onlineEvents = events.filter(e => e.status === 'online' && e.response_time);
    if (onlineEvents.length === 0) return 'N/A';

    const sum = onlineEvents.reduce((acc, e) => acc + (e.response_time || 0), 0);
    const avg = Math.round(sum / onlineEvents.length);
    return `${avg}ms`;
  };

  const getTimeSinceLastDown = () => {
    if (!currentDevice.last_down) return 'Sin caídas registradas';

    const lastDownTime = new Date(currentDevice.last_down).getTime();
    const now = Date.now();
    const diffMs = now - lastDownTime;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `Hace ${days} día${days !== 1 ? 's' : ''} y ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
  };

  const chartData = events
    .slice()
    .reverse()
    .filter(e => e.status === 'online' && e.response_time)
    .map(e => ({
      time: formatTime(e.timestamp),
      latencia: e.response_time
    }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${getDeviceIconColor(currentDevice.device_type)}`}>
              {getDeviceIcon(currentDevice.device_type, 'w-7 h-7')}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentDevice.name}</h2>
              <p className="text-sm text-gray-600">
                <code className="bg-gray-100 px-2 py-1 rounded">{currentDevice.ip_address}</code>
                {' • '}
                <span>{deviceTypeLabels[currentDevice.device_type]}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Activity className="w-5 h-5" />
                <span className="text-sm font-semibold">Estado Actual</span>
              </div>
              <p className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(currentDevice.status)}`}>
                {currentDevice.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-semibold">Latencia Actual</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currentDevice.response_time ? `${currentDevice.response_time}ms` : 'N/A'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-semibold">Latencia Promedio</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{getAverageLatency()}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center gap-2 text-orange-700 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-semibold">Última Caída</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{getTimeSinceLastDown()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolución del Tiempo de Respuesta</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="time"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Latencia (ms)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="latencia"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>No hay datos suficientes para mostrar el gráfico</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Eventos (Últimos 10)</h3>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Cargando eventos...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No se han registrado eventos aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-500 w-8">#{events.length - index}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                        {event.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                      </span>
                      <span className="text-sm text-gray-700">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      {event.response_time ? `${event.response_time}ms` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
