import { useEffect, useState } from 'react';
import { deviceService } from '../services/deviceService';
import { supabase } from '../lib/supabase';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Activity, TrendingUp, AlertTriangle, Clock,
  CheckCircle, XCircle, Bell, Calendar
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

export function DashboardView() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const devicesChannel = supabase
      .channel('dashboard-devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        loadData();
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('dashboard-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        setRecentEvents((prev) => [payload.new as Event, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => {
      devicesChannel.unsubscribe();
      eventsChannel.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const [devicesData, eventsData] = await Promise.all([
        deviceService.getDevices(),
        deviceService.getAllRecentEvents(50)
      ]);
      setDevices(devicesData);
      setRecentEvents(eventsData.slice(0, 10));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStats = () => {
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const unknown = devices.filter(d => d.status === 'unknown').length;
    return { online, offline, unknown };
  };

  const getAverageLatency = () => {
    const onlineDevices = devices.filter(d => d.status === 'online' && d.response_time);
    if (onlineDevices.length === 0) return 0;
    const sum = onlineDevices.reduce((acc, d) => acc + (d.response_time || 0), 0);
    return Math.round(sum / onlineDevices.length);
  };

  const getHighLatencyDevices = () => {
    return devices
      .filter(d => d.status === 'online' && d.response_time && d.response_time > 100)
      .sort((a, b) => (b.response_time || 0) - (a.response_time || 0));
  };

  const getDevicesByStability = () => {
    return devices.map(device => {
      const deviceEvents = recentEvents.filter(e => e.device_id === device.id);
      const offlineCount = deviceEvents.filter(e => e.status === 'offline').length;
      return { device, offlineCount };
    }).sort((a, b) => b.offlineCount - a.offlineCount);
  };

  const getDailyDowntimeData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayEvents = recentEvents.filter(e =>
        e.timestamp.startsWith(date) && e.status === 'offline'
      );
      return {
        date: new Date(date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        caídas: dayEvents.length
      };
    });
  };

  const getResponseTimeData = () => {
    return recentEvents
      .filter(e => e.status === 'online' && e.response_time)
      .slice(0, 20)
      .reverse()
      .map((e, i) => ({
        punto: i + 1,
        latencia: e.response_time,
        hora: new Date(e.timestamp).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }));
  };

  const statusStats = getStatusStats();
  const avgLatency = getAverageLatency();
  const highLatencyDevices = getHighLatencyDevices();
  const stabilityData = getDevicesByStability();
  const downtimeData = getDailyDowntimeData();
  const responseTimeData = getResponseTimeData();

  const pieData = [
    { name: 'En Línea', value: statusStats.online, color: '#10b981' },
    { name: 'Fuera de Línea', value: statusStats.offline, color: '#ef4444' },
    { name: 'Desconocido', value: statusStats.unknown, color: '#6b7280' }
  ];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Panel de Control</h2>
        <p className="text-gray-600 mt-1">Análisis y métricas del sistema de monitoreo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Dispositivos</p>
              <p className="text-3xl font-bold text-gray-900">{devices.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En Línea</p>
              <p className="text-3xl font-bold text-green-600">{statusStats.online}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fuera de Línea</p>
              <p className="text-3xl font-bold text-red-600">{statusStats.offline}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Latencia Promedio</p>
              <p className="text-3xl font-bold text-gray-900">{avgLatency}ms</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Dispositivos</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Caídas por Día (Última Semana)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={downtimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Bar dataKey="caídas" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiempo de Respuesta (Últimos 20 Eventos)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={responseTimeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="hora" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="latencia"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dispositivos con Alta Latencia</h3>
          </div>
          {highLatencyDevices.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">Todos los dispositivos tienen latencia normal</p>
            </div>
          ) : (
            <div className="space-y-3">
              {highLatencyDevices.slice(0, 5).map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-600">{device.ip_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">{device.response_time}ms</p>
                    <p className="text-xs text-gray-600">Alta latencia</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dispositivos por Estabilidad</h3>
          </div>
          {stabilityData.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No hay datos de estabilidad</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stabilityData.slice(0, 5).map(({ device, offlineCount }) => (
                <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">{device.name}</p>
                    <p className="text-sm text-gray-600">{device.ip_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{offlineCount}</p>
                    <p className="text-xs text-gray-600">caídas recientes</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Eventos Recientes</h3>
        </div>
        {recentEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay eventos recientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => {
              const device = devices.find(d => d.id === event.device_id);
              return (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      event.status === 'online'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {event.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{device?.name || 'Dispositivo desconocido'}</p>
                      <p className="text-sm text-gray-600">{device?.ip_address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{formatDate(event.timestamp)}</p>
                    {event.response_time && (
                      <p className="text-sm font-medium text-gray-900">{event.response_time}ms</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
