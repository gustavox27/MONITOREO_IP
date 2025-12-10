import { useEffect, useState, useRef } from 'react';
import { deviceService } from '../services/deviceService';
import { supabase } from '../lib/supabase';
import { X, Activity, AlertCircle, Clock, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Filter, RotateCcw, Calendar } from 'lucide-react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import es from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import type { Database } from '../lib/database.types';

registerLocale('es', es);

type Device = Database['public']['Tables']['devices']['Row'];
type Event = Database['public']['Tables']['events']['Row'];

interface TransitionEvent {
  id: string;
  status: 'online' | 'offline';
  timestamp: string;
  response_time: number | null;
  duration?: string;
  isDeviceRegistration: boolean;
}

type Tab = 'general' | 'ping';

interface HistoryModalProps {
  device: Device;
  onClose: () => void;
}

const LIMA_TIMEZONE_OFFSET = 5 * 60 * 60 * 1000;

const toLimaTime = (utcDate: Date | string): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Lima' }));
};

const getDateAtMidnightUTC = (limaDateStr: string): Date => {
  if (!limaDateStr || typeof limaDateStr !== 'string') {
    throw new Error('Invalid date string for getDateAtMidnightUTC');
  }

  const parts = limaDateStr.split('-');
  if (parts.length !== 3) {
    throw new Error('Date string must be in format YYYY-MM-DD');
  }

  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid date components');
  }

  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const midnightLimaInUTC = new Date(utcDate.getTime() + LIMA_TIMEZONE_OFFSET);
  return midnightLimaInUTC;
};

const getDateAtEndOfDayUTC = (limaDateStr: string): Date => {
  if (!limaDateStr || typeof limaDateStr !== 'string') {
    throw new Error('Invalid date string for getDateAtEndOfDayUTC');
  }

  const parts = limaDateStr.split('-');
  if (parts.length !== 3) {
    throw new Error('Date string must be in format YYYY-MM-DD');
  }

  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid date components');
  }

  const utcDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  const endOfDayLimaInUTC = new Date(utcDate.getTime() + LIMA_TIMEZONE_OFFSET);
  return endOfDayLimaInUTC;
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

const formatDateSpanish = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export function HistoryModal({ device, onClose }: HistoryModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [filterStartDateTime, setFilterStartDateTime] = useState<Date | null>(null);
  const [filterEndDateTime, setFilterEndDateTime] = useState<Date | null>(null);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const [currentViewDate, setCurrentViewDate] = useState<string>('');
  const [eventsByDay, setEventsByDay] = useState<Record<string, Event[]>>({});

  const [pingEvents, setPingEvents] = useState<Event[]>([]);
  const [pingLoadingMore, setPingLoadingMore] = useState(false);
  const [pingCurrentDay, setPingCurrentDay] = useState<string>('');
  const [pingEventsByDay, setPingEventsByDay] = useState<Record<string, Event[]>>({});
  const [pingStats, setPingStats] = useState({
    totalEvents: 0,
    onlineEvents: 0,
    offlineEvents: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
  });
  const [pingCurrentOffset, setPingCurrentOffset] = useState(0);
  const [pingTotalEventsForDay, setPingTotalEventsForDay] = useState(0);
  const [pingShowAllRecordsMessage, setPingShowAllRecordsMessage] = useState(false);
  const [showPingDatePicker, setShowPingDatePicker] = useState(false);
  const [pingUTCRange, setPingUTCRange] = useState<{ start: string; end: string } | null>(null);

  const pingContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllEvents();
    if (activeTab === 'ping') {
      loadPingEvents();
    }

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

          if (activeTab === 'ping') {
            setPingEvents((prev) => {
              const updated = [...prev, newEvent];
              updatePingStats(updated);
              groupPingEventsByDay(updated);

              const eventDate = toLimaTime(newEvent.timestamp);
              const eventDateKey = formatDateForInput(eventDate);
              setPingCurrentDay(eventDateKey);

              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      eventsChannel.unsubscribe();
    };
  }, [device.id, activeTab]);

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

      const today = toLimaTime(new Date());
      setFilterStartDateTime(today);
      setFilterEndDateTime(today);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPingEventsForDay = async (dateStr: string, offset: number = 0) => {
    try {
      if (!dateStr || typeof dateStr !== 'string') {
        throw new Error('Invalid date string provided');
      }

      if (offset < 0) {
        throw new Error('Offset cannot be negative');
      }

      setPingLoadingMore(true);

      let startUTC: Date;
      let endUTC: Date;

      try {
        startUTC = getDateAtMidnightUTC(dateStr);
        endUTC = getDateAtEndOfDayUTC(dateStr);
      } catch (dateError) {
        console.error('Date conversion error:', dateError);
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }

      if (startUTC >= endUTC) {
        throw new Error('Start date must be before end date');
      }

      const startISO = startUTC.toISOString();
      const endISO = endUTC.toISOString();

      setPingUTCRange({
        start: startISO,
        end: endISO
      });

      console.debug(`Loading ping events for ${dateStr}. UTC range: ${startISO} to ${endISO}`);

      const data = await deviceService.getDeviceEvents(
        device.id,
        100,
        startISO,
        endISO,
        offset
      );

      const totalCount = await deviceService.countDeviceEvents(
        device.id,
        startISO,
        endISO
      );

      if (!Array.isArray(data)) {
        throw new Error('Invalid data received from server');
      }

      setPingEvents(data);
      setPingCurrentOffset(offset);
      setPingTotalEventsForDay(totalCount);
      setPingCurrentDay(dateStr);
      setPingShowAllRecordsMessage(offset + 100 >= totalCount && data.length > 0 && data.length < 100);

      const dayEvents: Record<string, Event[]> = {};
      dayEvents[dateStr] = data;
      setPingEventsByDay(dayEvents);

      updatePingStats(data);
    } catch (error) {
      console.error('Error loading ping events for day:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al cargar registros: ${errorMsg}`);
    } finally {
      setPingLoadingMore(false);
    }
  };

  const loadPingEvents = async () => {
    try {
      setPingLoadingMore(true);
      const today = formatDateForInput(toLimaTime(new Date()));
      await loadPingEventsForDay(today, 0);
    } catch (error) {
      console.error('Error loading ping events:', error);
    } finally {
      setPingLoadingMore(false);
    }
  };

  const handlePingPrevPage = async () => {
    const newOffset = Math.max(0, pingCurrentOffset - 100);
    await loadPingEventsForDay(pingCurrentDay, newOffset);
  };

  const handlePingNextPage = async () => {
    if (pingCurrentOffset + 100 < pingTotalEventsForDay) {
      const newOffset = pingCurrentOffset + 100;
      await loadPingEventsForDay(pingCurrentDay, newOffset);
    }
  };

  const handlePingDateChange = async (date: Date | null) => {
    if (date) {
      const dateStr = formatDateForInput(toLimaTime(date));
      setShowPingDatePicker(false);
      await loadPingEventsForDay(dateStr, 0);
    }
  };

  const groupPingEventsByDay = (events: Event[]) => {
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
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    setPingEventsByDay(grouped);
  };

  const updatePingStats = (events: Event[]) => {
    if (events.length === 0) {
      setPingStats({
        totalEvents: 0,
        onlineEvents: 0,
        offlineEvents: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
      });
      return;
    }

    const onlineCount = events.filter(e => e.status === 'online').length;
    const offlineCount = events.filter(e => e.status === 'offline').length;
    const responseTimesOnline = events
      .filter(e => e.status === 'online' && e.response_time)
      .map(e => e.response_time || 0);

    const avgResponseTime = responseTimesOnline.length > 0
      ? Math.round(responseTimesOnline.reduce((a, b) => a + b, 0) / responseTimesOnline.length)
      : 0;

    const minResponseTime = responseTimesOnline.length > 0
      ? Math.min(...responseTimesOnline)
      : 0;

    const maxResponseTime = responseTimesOnline.length > 0
      ? Math.max(...responseTimesOnline)
      : 0;

    setPingStats({
      totalEvents: events.length,
      onlineEvents: onlineCount,
      offlineEvents: offlineCount,
      avgResponseTime,
      minResponseTime: minResponseTime === Infinity ? 0 : minResponseTime,
      maxResponseTime,
    });
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

    if (!filterStartDateTime || !filterEndDateTime) {
      return [];
    }

    const startUTC = toUTC(filterStartDateTime).toISOString();
    const endUTC = toUTC(filterEndDateTime).toISOString();

    return allEvents.filter(event => {
      return event.timestamp >= startUTC && event.timestamp <= endUTC;
    });
  };

  const applyFilters = () => {
    if (!filterStartDateTime || !filterEndDateTime) {
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
          isDeviceRegistration: event.is_device_registration
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
          duration,
          isDeviceRegistration: event.is_device_registration
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
    const onlineTransitions = trans.filter(t => t.status === 'online' && !t.isDeviceRegistration).length;
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
            {activeTab === 'general' && (
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
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            General
          </button>
          <button
            onClick={() => {
              setActiveTab('ping');
              if (pingEvents.length === 0) {
                loadPingEvents();
              }
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === 'ping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Modo Ping
          </button>
        </div>

        {activeTab === 'ping' && (
          <>
            <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50 gap-2 relative">
              <button
                onClick={async () => {
                  const currentDate = new Date(pingCurrentDay);
                  const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
                  const dateStr = formatDateForInput(toLimaTime(prevDate));
                  await loadPingEventsForDay(dateStr, 0);
                }}
                className="p-1 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center flex-1 min-w-[150px]">
                <p className="text-xs font-semibold text-gray-900">{formatDateSpanish(pingCurrentDay)}</p>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowPingDatePicker(!showPingDatePicker)}
                  className="p-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition border border-gray-300"
                  title="Seleccionar fecha"
                >
                  <Calendar className="w-4 h-4" />
                </button>

                {showPingDatePicker && (
                  <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
                    <ReactDatePicker
                      selected={new Date(pingCurrentDay)}
                      onChange={handlePingDateChange}
                      dateFormat="dd/MM/yyyy"
                      locale="es"
                      maxDate={new Date()}
                      inline
                    />
                  </div>
                )}
              </div>

              <button
                onClick={async () => {
                  const currentDate = new Date(pingCurrentDay);
                  const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
                  const today = new Date();
                  if (nextDate.toDateString() !== today.toDateString()) {
                    const dateStr = formatDateForInput(toLimaTime(nextDate));
                    await loadPingEventsForDay(dateStr, 0);
                  }
                }}
                disabled={new Date(pingCurrentDay).toDateString() === new Date().toDateString()}
                className="p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50 gap-2">
              <button
                onClick={handlePingPrevPage}
                disabled={pingCurrentOffset === 0}
                className="p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                title="100 registros anteriores"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center flex-1">
                <p className="text-xs text-gray-600">
                  {pingEvents.length === 0 ? 'Sin registros' : `Registros ${pingCurrentOffset + 1}-${Math.min(pingCurrentOffset + 100, pingTotalEventsForDay)} de ${pingTotalEventsForDay}`}
                </p>
              </div>

              <button
                onClick={handlePingNextPage}
                disabled={pingCurrentOffset + 100 >= pingTotalEventsForDay}
                className="p-1 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
                title="100 registros siguientes"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {pingShowAllRecordsMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mx-2 mt-2">
                <p className="text-xs text-blue-800 font-medium">
                  Son todos los registros del día {formatDateSpanish(pingCurrentDay)}. Usa las flechas de fecha para navegar a otro día.
                </p>
              </div>
            )}

            
          </>
        )}

        {activeTab === 'general' && (
          <>
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
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Fecha y Hora Inicio</label>
                      <ReactDatePicker
                        selected={filterStartDateTime}
                        onChange={(date) => setFilterStartDateTime(date)}
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="dd/MM/yyyy HH:mm"
                        locale="es"
                        maxDate={new Date()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">Fecha y Hora Fin</label>
                      <ReactDatePicker
                        selected={filterEndDateTime}
                        onChange={(date) => setFilterEndDateTime(date)}
                        showTimeSelect
                        timeIntervals={15}
                        dateFormat="dd/MM/yyyy HH:mm"
                        locale="es"
                        maxDate={new Date()}
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
          </>
        )}

        <div className="flex-1 overflow-auto p-2 flex flex-col">
          {activeTab === 'general' ? (
            <>
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
                        {transition.isDeviceRegistration
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
            </>
          ) : (
            <div className="flex flex-col h-full">
              <div className="grid grid-cols-5 gap-2 mb-3 pb-3 border-b border-gray-200">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600">Total</p>
                  <p className="text-lg font-bold text-blue-600">{pingStats.totalEvents}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600">En línea</p>
                  <p className="text-lg font-bold text-green-600">{pingStats.onlineEvents}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-xs text-gray-600">Fuera línea</p>
                  <p className="text-lg font-bold text-red-600">{pingStats.offlineEvents}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <p className="text-xs text-gray-600">Promedio</p>
                  <p className="text-lg font-bold text-amber-600">{pingStats.avgResponseTime}ms</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-600">Mín/Máx</p>
                  <p className="text-lg font-bold text-purple-600">{pingStats.minResponseTime}/{pingStats.maxResponseTime}ms</p>
                </div>
              </div>

              {pingLoadingMore ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-xs text-gray-600">Cargando eventos...</p>
                </div>
              ) : pingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Sin eventos</p>
                </div>
              ) : (
                <>
                  <div ref={pingContainerRef} className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
                    {pingEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`px-3 py-2 rounded border flex items-center gap-2 ${
                          event.status === 'online'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                      >
                        <span className="font-semibold flex-shrink-0 w-16">
                          {event.status === 'online' ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-600 flex-shrink-0 whitespace-nowrap">
                          {formatLimaDate(event.timestamp)}
                        </span>
                        <span className="flex-grow">
                          {event.status === 'online' ? 'Respuesta' : 'Sin respuesta'}
                          {event.response_time && event.status === 'online' && (
                            <span className="ml-2">time={event.response_time}ms</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
