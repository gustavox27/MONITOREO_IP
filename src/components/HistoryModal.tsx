import { useEffect, useState } from 'react';
import { deviceService } from '../services/deviceService';
import { supabase } from '../lib/supabase';
import { X, Activity, AlertCircle, Clock, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Filter, RotateCcw } from 'lucide-react';
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

const toLimaTime = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Lima' }));
};

const toUTC = (limaDate: Date): Date => {
  const utcString = limaDate.toLocaleString('en-US', { timeZone: 'UTC' });
  return new Date(utcString);
};

const getDateAtMidnightUTC = (limaDateStr: string): Date => {
  const parts = limaDateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  const limaDate = new Date(year, month, day, 0, 0, 0, 0);
  return toUTC(limaDate);
};

const getDateAtEndOfDayUTC = (limaDateStr: string): Date => {
  const parts = limaDateStr.split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  const limaDate = new Date(year, month, day, 23, 59, 59, 999);
  return toUTC(limaDate);
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimeForInput = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const formatLimaDate = (date: string): string => {
  const limaDate = toLimaTime(date);
  return limaDate.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export function HistoryModal({ device, onClose }: HistoryModalProps) {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterStartTime, setFilterStartTime] = useState('00:00');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('23:59');
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const [currentViewDate, setCurrentViewDate] = useState<string>('');
  const [eventsByDay, setEventsByDay] = useState<Record<string, Event[]>>({});

  useEffect(() => {
    loadAllEvents();

    const eventsChannel = supabase
      .channel(`history-events-${device.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `device_id=eq.${device.id}`,
        },
        (payload) => {
          const newEvent = payload.new as Event;
          setAllEvents((prev) => {
            const updated = [newEvent, ...prev];
            groupEventsByDay(updated);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
    };
  }, [device.id]);

  useEffect(() => {
    if (Object.keys(eventsByDay).length > 0 && !currentViewDate) {
      const dates = Object.keys(eventsByDay).sort().reverse();
      setCurrentViewDate(dates[0]);
    }
  }, [eventsByDay, currentViewDate]);

  const loadAllEvents = async () => {
    try {
      const data = await deviceService.getDeviceEvents(device.id);
      setAllEvents(data);
      groupEventsByDay(data);

      const today = formatDateForInput(toLimaTime(new Date()));
      setFilterStartDate(today);
      setFilterEndDate(today);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupEventsByDay = (events: Event[]) => {
    const grouped: Record<string, Event[]> = {};

    events.forEach(event => {
      const limaDate = toLimaTime(event.timestamp);
      const dateKey = formatDateForInput(limaDate);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    setEventsByDay(grouped);
  };

  const getFilteredEvents = (): Event[] => {
    if (!hasActiveFilters) {
      const todayKey = currentViewDate;
      return eventsByDay[todayKey] || [];
    }

    const startDt = new Date(`${filterStartDate}T${filterStartTime}`);
    const endDt = new Date(`${filterEndDate}T${filterEndTime}`);

    const startUTC = toUTC(startDt).toISOString();
    const endUTC = toUTC(endDt).toISOString();

    return allEvents.filter(event => {
      return event.timestamp >= startUTC && event.timestamp <= endUTC;
    });
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
    const today = formatDateForInput(toLimaTime(new Date()));
    const dates = Object.keys(eventsByDay).sort().reverse();
    setCurrentViewDate(dates[0] || today);
  };

  const filterTransitions = (events: Event[]): TransitionEvent[] => {
    if (events.length === 0) return [];

    const transitions: TransitionEvent[] = [];
    let lastStatus: string | null = null;

    const sortedEvents = [...events].sort(
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

  const getTransitionStats = (events: Event[]) => {
    const trans = filterTransitions(events);
    const onlineTransitions = trans.filter(t => t.status === 'online' && !t.isFirst).length;
    const offlineTransitions = trans.filter(t => t.status === 'offline').length;
    return { onlineTransitions, offlineTransitions, totalTransitions: trans.length };
  };

  const getAverageResponseTime = (events: Event[]) => {
    const onlineEvents = events.filter(e => e.status === 'online' && e.response_time);
    if (onlineEvents.length === 0) return 'N/A';

    const sum = onlineEvents.reduce((acc, e) => acc + (e.response_time || 0), 0);
    const avg = Math.round(sum / onlineEvents.length);
    return `${avg}ms`;
  };

  const currentEvents = getFilteredEvents();
  const stats = getTransitionStats(currentEvents);
  const currentTransitions = filterTransitions(currentEvents);

  const availableDates = Object.keys(eventsByDay).sort().reverse();
  const currentIndex = availableDates.indexOf(currentViewDate);

  const handlePrevDay = () => {
    if (currentIndex < availableDates.length - 1) {
      setCurrentViewDate(availableDates[currentIndex + 1]);
    }
  };

  const handleNextDay = () => {
    if (currentIndex > 0) {
      setCurrentViewDate(availableDates[currentIndex - 1]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{device.name}</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{device.ip_address}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-xs font-medium ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-blue-600 rounded-full"></span>}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-2 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={filterStartTime}
                    onChange={(e) => setFilterStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={filterEndTime}
                    onChange={(e) => setFilterEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={applyFilters}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
              >
                Aplicar Filtros
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 border-b border-gray-200">
          <div className="bg-white p-2 rounded-lg border border-gray-200">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              <span className="text-xs font-medium text-gray-700">Fuera de Línea</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.offlineTransitions}</p>
          </div>

          <div className="bg-white p-2 rounded-lg border border-gray-200">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-medium text-gray-700">En Línea</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.onlineTransitions}</p>
          </div>
        </div>

        {!hasActiveFilters && (
          <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50">
            <button
              onClick={handlePrevDay}
              disabled={currentIndex >= availableDates.length - 1}
              className="p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <p className="text-xs font-semibold text-gray-900">{currentViewDate}</p>
              <p className="text-xs text-gray-600">
                {currentIndex + 1}/{availableDates.length}
              </p>
            </div>

            <button
              onClick={handleNextDay}
              disabled={currentIndex <= 0}
              className="p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto p-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Eventos</h3>
            <span className="text-xs text-gray-600">
              {currentTransitions.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-xs text-gray-600">Cargando...</p>
            </div>
          ) : currentTransitions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-600">Sin eventos</p>
            </div>
          ) : (
            <div className="space-y-1">
              {currentTransitions.map((transition) => (
                <div
                  key={transition.id}
                  className={`rounded-lg border px-3 py-2 flex items-center gap-3 ${
                    transition.status === 'online'
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      transition.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {transition.status === 'online' ? (
                      <TrendingUp className="w-2.5 h-2.5 text-white" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 text-white" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold whitespace-nowrap ${
                      transition.status === 'online'
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}
                  >
                    {transition.isFirst
                      ? 'REGISTRADO'
                      : transition.status === 'online'
                      ? 'EN LÍNEA'
                      : 'FUERA DE LÍNEA'}
                  </span>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {formatLimaDate(transition.timestamp)}
                  </span>
                  {transition.duration && (
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      Duración: <span className="font-semibold">{transition.duration}</span>
                    </span>
                  )}
                  {transition.response_time && (
                    <span className="text-xs text-gray-600 whitespace-nowrap ml-auto flex-shrink-0">
                      {transition.response_time}ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
