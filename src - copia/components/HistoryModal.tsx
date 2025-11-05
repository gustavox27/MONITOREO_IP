import { useEffect, useState } from 'react';
import { deviceService } from '../services/deviceService';
import { X, Activity, AlertCircle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

interface TransitionEvent {
  id: string;
  status: 'online' | 'offline';
  timestamp: string;
  response_time: number | null;
  duration?: string;
  isFirst?: boolean;
}

interface HistoryModalProps {
  device: Device;
  onClose: () => void;
}

export function HistoryModal({ device, onClose }: HistoryModalProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [transitions, setTransitions] = useState<TransitionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [device.id]);

  const loadEvents = async () => {
    try {
      const data = await deviceService.getDeviceEvents(device.id);
      setEvents(data);
      const filteredTransitions = filterTransitions(data);
      setTransitions(filteredTransitions);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransitions = (allEvents: Event[]): TransitionEvent[] => {
    if (allEvents.length === 0) return [];

    const transitions: TransitionEvent[] = [];
    let lastStatus: string | null = null;

    const sortedEvents = [...allEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedEvents.forEach((event, index) => {
      if (index === 0) {
        transitions.push({
          id: event.id,
          status: event.status,
          timestamp: event.timestamp,
          response_time: event.response_time,
          isFirst: true
        });
        lastStatus = event.status;
      } else if (event.status !== lastStatus) {
        const previousEvent = transitions[transitions.length - 1];
        const duration = calculateDuration(previousEvent.timestamp, event.timestamp);

        transitions.push({
          id: event.id,
          status: event.status,
          timestamp: event.timestamp,
          response_time: event.response_time,
          duration
        });
        lastStatus = event.status;
      }
    });

    return transitions.reverse();
  };

  const calculateDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
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

  const getTransitionStats = () => {
    const onlineTransitions = transitions.filter(t => t.status === 'online' && !t.isFirst).length;
    const offlineTransitions = transitions.filter(t => t.status === 'offline').length;
    return { onlineTransitions, offlineTransitions };
  };

  const getAverageResponseTime = () => {
    const onlineTransitions = transitions.filter(t => t.status === 'online' && t.response_time);
    if (onlineTransitions.length === 0) return 'N/A';

    const sum = onlineTransitions.reduce((acc, t) => acc + (t.response_time || 0), 0);
    const avg = Math.round(sum / onlineTransitions.length);
    return `${avg}ms`;
  };

  const stats = getTransitionStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
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
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="text-sm font-medium">Fuera de Línea</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.offlineTransitions}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">En Línea</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.onlineTransitions}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Respuesta Promedio</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{getAverageResponseTime()}</p>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Historial de Eventos</h3>
            <span className="text-sm text-gray-600">
              {transitions.length} evento{transitions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando eventos...</p>
            </div>
          ) : transitions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aún no se han registrado eventos</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transitions.map((transition, index) => (
                <div
                  key={transition.id}
                  className={`rounded-lg border overflow-hidden ${
                    transition.status === 'online'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          transition.status === 'online'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}>
                          {transition.status === 'online' ? (
                            <TrendingUp className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold ${
                              transition.status === 'online' ? 'text-green-900' : 'text-red-900'
                            }`}>
                              {transition.isFirst
                                ? 'DISPOSITIVO REGISTRADO'
                                : transition.status === 'online'
                                ? 'EN LÍNEA'
                                : 'FUERA DE LÍNEA'}
                            </span>
                            {transition.isFirst && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                Primer Evento
                              </span>
                            )}
                            <span className="text-xs text-gray-600">
                              {formatDate(transition.timestamp)}
                            </span>
                          </div>
                          {transition.duration && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-600">
                                Tiempo transcurrido: <span className="font-semibold text-gray-900">{transition.duration}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {transition.response_time && (
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs font-bold text-gray-900">{transition.response_time}ms</p>
                          <span className="text-xs text-gray-500">Latencia</span>
                        </div>
                      )}
                    </div>
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
