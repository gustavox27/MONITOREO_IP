import { useEffect, useState } from 'react';
import { deviceService } from '../services/deviceService';
import { supabase } from '../lib/supabase';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from 'recharts';
import {
  Activity, AlertTriangle,
  CheckCircle, XCircle, Bell, Calendar, Filter, RotateCcw, TrendingUp, TrendingDown
} from 'lucide-react';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

export function DashboardView() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

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
        deviceService.getAllRecentEvents(200)
      ]);
      setDevices(devicesData);
      setRecentEvents(eventsData);

      const today = new Date().toISOString().split('T')[0];
      setFilterStartDate(today);
      setFilterEndDate(today);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransitions = (events: Event[]): Event[] => {
    if (events.length === 0) return [];

    const transitions: Event[] = [];
    let lastStatus: string | null = null;

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedEvents.forEach((event) => {
      if (event.status !== lastStatus) {
        transitions.push(event);
        lastStatus = event.status;
      }
    });

    return transitions.reverse();
  };

  const getFilteredEvents = (): Event[] => {
    let filtered: Event[];

    if (!hasActiveFilters) {
      filtered = recentEvents.slice(0, 100);
    } else {
      const startDate = new Date(filterStartDate);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);

      filtered = recentEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    return filterTransitions(filtered);
  };

  const applyFilters = () => {
    if (!filterStartDate || !filterEndDate) {
      alert('Por favor, selecciona fechas de inicio y fin');
      return;
    }
    setHasActiveFilters(true);
  };

  const clearFilters = () => {
    setHasActiveFilters(false);
    const today = new Date().toISOString().split('T')[0];
    setFilterStartDate(today);
    setFilterEndDate(today);
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


  const statusStats = getStatusStats();
  const highLatencyDevices = getHighLatencyDevices();

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

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Dispositivos</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
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
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Transiciones de Estado - Todos los Dispositivos</h3>
          </div>
          <button
            onClick={() => setHasActiveFilters(!hasActiveFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-xs font-medium ${
              hasActiveFilters
                ? 'bg-blue-100 text-blue-700'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-blue-600 rounded-full"></span>}
          </button>
        </div>

        {hasActiveFilters && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Desde</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hasta</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={applyFilters}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition whitespace-nowrap"
              >
                Aplicar
              </button>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {getFilteredEvents().length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay eventos en este rango</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {getFilteredEvents().map((event) => {
              const device = devices.find(d => d.id === event.device_id);
              return (
                <div key={event.id} className={`flex items-center gap-2 p-2 rounded border text-xs ${
                  event.status === 'online'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      event.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {event.status === 'online' ? (
                      <TrendingUp className="w-2 h-2 text-white" />
                    ) : (
                      <TrendingDown className="w-2 h-2 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${
                      event.status === 'online'
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}>
                      {device?.name || 'Dispositivo desconocido'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      event.status === 'online'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {event.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                    </span>
                    <p className="text-gray-600 whitespace-nowrap text-xs">
                      {formatDate(event.timestamp)}
                    </p>
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
