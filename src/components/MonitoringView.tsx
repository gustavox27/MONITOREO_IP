import { useEffect, useState, useRef } from 'react';
import { deviceService } from '../services/deviceService';
import { notificationService } from '../services/notificationService';
import { RecurringNotificationManager } from '../services/recurringNotificationManager';
import { supabase } from '../lib/supabase';
import { DeviceForm } from './DeviceForm';
import { HistoryModal } from './HistoryModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DeviceDetailsPanel } from './DeviceDetailsPanel';
import { FilterControls } from './FilterControls';
import { BulkUploadModal } from './BulkUploadModal';
import { NotificationCenter, playNotificationSound } from './NotificationCenter';
import { isValidCustomSoundUrl } from '../utils/audioValidation';
import * as XLSX from 'xlsx';
import { Plus, History, Pencil, Trash2, Activity, Clock, AlertCircle, Upload, ChevronDown, FileText } from 'lucide-react';
import { getDeviceIcon, getDeviceIconColor } from '../utils/deviceIcons';
import { exportToPDF, exportToExcel, exportToImage, exportToHTML } from '../utils/exportHelpers';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];

interface Notification {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
  status: 'online' | 'offline';
  timestamp: number;
  displayDuration: number;
}

interface MonitoringViewProps {
  userId: string;
  isAdmin: boolean;
}

export function MonitoringView({ userId, isAdmin }: MonitoringViewProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [historyDevice, setHistoryDevice] = useState<Device | null>(null);
  const [detailsDevice, setDetailsDevice] = useState<Device | null>(null);
  const [filterTechnician, setFilterTechnician] = useState<string>('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState({
    enable_notifications: true,
    enable_sound: true,
    group_notifications: true,
    sound_volume: 0.4,
    notification_duration: 10000,
    enable_recurring_notifications: false,
    recurring_interval: 30,
    recurring_volume: 0.25,
    use_custom_sounds: false,
    custom_sound_online_url: null,
    custom_sound_offline_url: null,
  });
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const reportMenuRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const deviceStatusRef = useRef<Map<string, string>>(new Map());
  const statusChangeQueueRef = useRef<Array<{ device: Device; status: 'online' | 'offline' }>>([]);
  const groupingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPageVisibleRef = useRef(true);
  const recurringNotificationManagerRef = useRef<RecurringNotificationManager | null>(null);

  useEffect(() => {
    loadNotificationPreferences();
  }, [userId]);

  useEffect(() => {
    updateRecurringNotifications();
  }, [devices]);

  useEffect(() => {
    if (recurringNotificationManagerRef.current) {
      recurringNotificationManagerRef.current.setPreferences(
        notificationPreferences.enable_recurring_notifications,
        notificationPreferences.enable_sound,
        notificationPreferences.sound_volume,
        notificationPreferences.recurring_volume,
        notificationPreferences.recurring_interval
      );

      updateRecurringNotifications();
    }
  }, [notificationPreferences]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
        setShowBulkMenu(false);
      }
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target as Node)) {
        setShowReportMenu(false);
      }
    };

    if (showBulkMenu || showReportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBulkMenu, showReportMenu]);

  useEffect(() => {
    loadDevices();
    if (isAdmin) {
      loadTechnicians();
    }

    const channel = supabase
      .channel('monitoring-devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDevices((prev) => {
            const exists = prev.some(d => d.id === payload.new.id);
            if (exists) return prev;
            const newDevice = payload.new as Device;
            deviceStatusRef.current.set(newDevice.id, newDevice.status);
            return [...prev, newDevice];
          });
        } else if (payload.eventType === 'UPDATE') {
          setDevices((prev) =>
            prev.map((device) => {
              const updatedDevice = payload.new as Device;
              if (device.id === updatedDevice.id) {
                const previousStatus = deviceStatusRef.current.get(device.id);
                if (
                  previousStatus &&
                  previousStatus !== updatedDevice.status &&
                  (updatedDevice.status === 'online' || updatedDevice.status === 'offline')
                ) {
                  queueStatusChange(updatedDevice, updatedDevice.status);
                }
                deviceStatusRef.current.set(device.id, updatedDevice.status);
                return updatedDevice;
              }
              return device;
            })
          );
        } else if (payload.eventType === 'DELETE') {
          setDevices((prev) => prev.filter((device) => device.id !== payload.old.id));
        }
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('monitoring-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          const newEvent = payload.new as any;

          setDevices((prev) =>
            prev.map((device) => {
              if (device.id === newEvent.device_id) {
                const updatedDevice = {
                  ...device,
                  status: newEvent.status,
                  response_time: newEvent.response_time,
                  last_down: newEvent.status === 'offline' ? new Date().toISOString() : device.last_down,
                  last_check: new Date().toISOString(),
                };

                const previousStatus = deviceStatusRef.current.get(device.id);
                if (previousStatus && previousStatus !== newEvent.status) {
                  queueStatusChange(updatedDevice, newEvent.status);
                }
                deviceStatusRef.current.set(device.id, newEvent.status);

                return updatedDevice;
              }
              return device;
            })
          );
        }
      )
      .subscribe();

    const timerInterval = setInterval(() => {
      setDevices((prev) => [...prev]);
    }, 1000);

    return () => {
      channel.unsubscribe();
      eventsChannel.unsubscribe();
      clearInterval(timerInterval);
      if (recurringNotificationManagerRef.current) {
        recurringNotificationManagerRef.current.destroy();
        recurringNotificationManagerRef.current = null;
      }
    };
  }, [filterTechnician, isAdmin]);

  const loadNotificationPreferences = async () => {
    try {
      const preferences = await notificationService.getUserPreferences(userId);
      if (preferences) {
        const onlineUrlValid = isValidCustomSoundUrl(preferences.custom_sound_online_url);
        const offlineUrlValid = isValidCustomSoundUrl(preferences.custom_sound_offline_url);

        console.log('[MonitoringView] Loaded preferences:', {
          use_custom_sounds: preferences.use_custom_sounds,
          online_url_valid: onlineUrlValid,
          offline_url_valid: offlineUrlValid,
          online_url: preferences.custom_sound_online_url || 'none',
          offline_url: preferences.custom_sound_offline_url || 'none'
        });

        setNotificationPreferences({
          enable_notifications: preferences.enable_notifications ?? true,
          enable_sound: preferences.enable_sound ?? true,
          group_notifications: preferences.group_notifications ?? true,
          sound_volume: preferences.sound_volume ?? 0.4,
          notification_duration: preferences.notification_duration ?? 10000,
          enable_recurring_notifications: preferences.enable_recurring_notifications ?? false,
          recurring_interval: preferences.recurring_interval ?? 30,
          recurring_volume: preferences.recurring_volume ?? 0.25,
          use_custom_sounds: (preferences.use_custom_sounds ?? false) && (onlineUrlValid || offlineUrlValid),
          custom_sound_online_url: onlineUrlValid ? preferences.custom_sound_online_url : null,
          custom_sound_offline_url: offlineUrlValid ? preferences.custom_sound_offline_url : null,
        });

        if (!recurringNotificationManagerRef.current) {
          recurringNotificationManagerRef.current = new RecurringNotificationManager();
        }

        recurringNotificationManagerRef.current.setPreferences(
          preferences.enable_recurring_notifications,
          preferences.enable_sound,
          preferences.sound_volume,
          preferences.recurring_volume,
          preferences.recurring_interval
        );
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const updateRecurringNotifications = () => {
    if (!recurringNotificationManagerRef.current) return;

    const offlineDeviceIds = devices
      .filter((d) => d.status === 'offline')
      .map((d) => d.id);

    recurringNotificationManagerRef.current.updateOfflineDevices(
      offlineDeviceIds,
      devices
    );
  };

  const processQueuedNotifications = async () => {
    if (statusChangeQueueRef.current.length === 0) return;

    const queue = statusChangeQueueRef.current;
    statusChangeQueueRef.current = [];

    if (!notificationPreferences.enable_notifications) {
      return;
    }

    const shouldPlaySound = notificationPreferences.enable_sound;
    const shouldGroup =
      notificationPreferences.group_notifications && queue.length > 1;

    if (shouldGroup) {
      const offlineCount = queue.filter((q) => q.status === 'offline').length;
      const onlineCount = queue.length - offlineCount;

      if (isPageVisibleRef.current) {
        queue.forEach((item) => {
          addNotification(item.device, item.status);
        });
        if (shouldPlaySound) {
          queue.forEach((item, index) => {
            setTimeout(() => {
              const customUrl = item.status === 'online'
                ? notificationPreferences.custom_sound_online_url
                : notificationPreferences.custom_sound_offline_url;
              const hasValidUrl = isValidCustomSoundUrl(customUrl);
              const isCustom = notificationPreferences.use_custom_sounds && hasValidUrl;
              console.log(`[MonitoringView] Queued sound for ${item.status}: isCustom=${isCustom}, hasValidUrl=${hasValidUrl}, url=${customUrl || 'default'}`);
              playNotificationSound(
                item.status,
                notificationPreferences.sound_volume,
                hasValidUrl ? customUrl : undefined,
                isCustom
              );
            }, index * 200);
          });
        }
      } else {
        if (offlineCount > 0) {
          const summaryNotification = queue.find(
            (q) => q.status === 'offline'
          );
          if (summaryNotification) {
            await notificationService.showNativeNotification(
              summaryNotification.device,
              'offline',
              offlineCount
            );
            if (shouldPlaySound) {
              const customUrl = notificationPreferences.custom_sound_offline_url;
              const hasValidUrl = isValidCustomSoundUrl(customUrl);
              const isCustom = notificationPreferences.use_custom_sounds && hasValidUrl;
              console.log(`[MonitoringView] Offline notification sound: isCustom=${isCustom}, hasValidUrl=${hasValidUrl}, url=${customUrl || 'default'}`);
              notificationService.playNotificationSound(
                'offline',
                notificationPreferences.sound_volume,
                hasValidUrl ? customUrl : undefined,
                isCustom
              );
            }
          }
        }
        if (onlineCount > 0) {
          const summaryNotification = queue.find(
            (q) => q.status === 'online'
          );
          if (summaryNotification) {
            await notificationService.showNativeNotification(
              summaryNotification.device,
              'online',
              onlineCount
            );
            if (shouldPlaySound) {
              const customUrl = notificationPreferences.custom_sound_online_url;
              const hasValidUrl = isValidCustomSoundUrl(customUrl);
              const isCustom = notificationPreferences.use_custom_sounds && hasValidUrl;
              console.log(`[MonitoringView] Online notification sound: isCustom=${isCustom}, hasValidUrl=${hasValidUrl}, url=${customUrl || 'default'}`);
              notificationService.playNotificationSound(
                'online',
                notificationPreferences.sound_volume,
                hasValidUrl ? customUrl : undefined,
                isCustom
              );
            }
          }
        }
      }
    } else {
      for (const item of queue) {
        if (isPageVisibleRef.current) {
          addNotification(item.device, item.status);
        } else {
          await notificationService.showNativeNotification(
            item.device,
            item.status
          );
        }

        if (shouldPlaySound) {
          const customUrl = item.status === 'online'
            ? notificationPreferences.custom_sound_online_url
            : notificationPreferences.custom_sound_offline_url;
          const hasValidUrl = isValidCustomSoundUrl(customUrl);
          const isCustom = notificationPreferences.use_custom_sounds && hasValidUrl;
          console.log(`[MonitoringView] Single notification sound for ${item.status}: isCustom=${isCustom}, hasValidUrl=${hasValidUrl}, url=${customUrl || 'default'}`);
          const playFunction = isPageVisibleRef.current
            ? playNotificationSound
            : notificationService.playNotificationSound;
          playFunction(
            item.status,
            notificationPreferences.sound_volume,
            hasValidUrl ? customUrl : undefined,
            isCustom
          );
        }
      }
    }
  };

  const addNotification = (device: Device, status: 'online' | 'offline') => {
    const notificationId = `${device.id}-${Date.now()}`;
    const newNotification: Notification = {
      id: notificationId,
      deviceId: device.id,
      deviceName: device.name,
      deviceIp: device.ip_address,
      status,
      timestamp: Date.now(),
      displayDuration: notificationPreferences.notification_duration,
    };

    setNotifications((prev) => [newNotification, ...prev]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const queueStatusChange = (device: Device, status: 'online' | 'offline') => {
    statusChangeQueueRef.current.push({ device, status });

    if (groupingTimerRef.current) {
      clearTimeout(groupingTimerRef.current);
    }

    groupingTimerRef.current = setTimeout(() => {
      processQueuedNotifications();
    }, 500);
  };

  const loadDevices = async () => {
    try {
      const data = await deviceService.getDevices(filterTechnician || undefined);
      setDevices(data);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const data = await deviceService.getTechnicians();
      setTechnicians(data);
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  };

  const handleDeleteClick = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDevice(device);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDevice) return;

    try {
      await deviceService.deleteDevice(deleteDevice.id);
      setDeleteDevice(null);
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Error al eliminar el dispositivo');
    }
  };

  const handleEdit = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleHistory = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryDevice(device);
  };

  const handleRowClick = (device: Device) => {
    setDetailsDevice(device);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingDevice(null);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredDevices);
    setShowReportMenu(false);
  };

  const handleExportExcel = () => {
    exportToExcel(filteredDevices);
    setShowReportMenu(false);
  };

  const handleExportImage = async () => {
    if (tableRef.current) {
      await exportToImage(tableRef.current);
    }
    setShowReportMenu(false);
  };

  const handleExportHTML = () => {
    exportToHTML(filteredDevices);
    setShowReportMenu(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Activity className="w-4 h-4" />;
      case 'offline':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca';
    return new Date(date).toLocaleString('es-ES');
  };

  const calculateUptime = (device: Device) => {
    if (device.status !== 'online' || !device.last_down) {
      return 'N/A';
    }

    const lastDownTime = new Date(device.last_down).getTime();
    const now = Date.now();
    const diffMs = now - lastDownTime;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'Menos de 1m';
    }
  };

  const calculateTimeSinceLastChange = (device: Device): string => {
    const now = Date.now();
    let referenceTime: number | null = null;

    if (device.status === 'offline') {
      if (!device.last_down) {
        return 'Sin Conexión Inicial';
      }
      referenceTime = new Date(device.last_down).getTime();
    } else {
      if (!device.last_down) {
        return 'Sin Caídas';
      }
      referenceTime = new Date(device.last_down).getTime();
    }

    if (!referenceTime) return 'N/A';

    const diffMs = now - referenceTime;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getFilteredAndSortedDevices = () => {
    let filtered = devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           device.ip_address.includes(searchTerm);
      const matchesType = !deviceTypeFilter || device.device_type === deviceTypeFilter;
      const matchesStatus = !statusFilter || device.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });

    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'status':
            return a.status.localeCompare(b.status);
          case 'response_time':
            const aTime = a.response_time || 9999999;
            const bTime = b.response_time || 9999999;
            return aTime - bTime;
          case 'created_at':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
    }

    return filtered;
  };

  const filteredDevices = getFilteredAndSortedDevices();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando dispositivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <NotificationCenter notifications={notifications} onDismiss={dismissNotification} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitor de Dispositivos</h2>
          <p className="text-gray-600 mt-1">
            {filteredDevices.length} de {devices.length} dispositivo{devices.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <select
              value={filterTechnician}
              onChange={(e) => setFilterTechnician(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los Técnicos</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Agregar Dispositivo
          </button>

          <div className="relative" ref={bulkMenuRef}>
            <button
              onClick={() => setShowBulkMenu(!showBulkMenu)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              <Upload className="w-5 h-5" />
              <span>Carga Masiva</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showBulkMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    setShowBulkUpload(true);
                    setShowBulkMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Cargar Archivo Excel
                </button>
                <button
                  onClick={() => {
                    const ws = XLSX.utils.aoa_to_sheet([
                      ['nombre', 'direccion_ip', 'tipo_dispositivo'],
                      ['Servidor Principal', '192.168.1.10', 'servidor'],
                      ['Impresora Oficina', '192.168.1.20', 'impresora_laser'],
                      ['Router Principal', '192.168.1.1', 'enrutador'],
                      ['Reloj Oficina', '192.168.1.30', 'reloj'],
                      ['Laptop Gerencia', '192.168.1.40', 'laptop'],
                      ['UPS Sala Servidores', '192.168.1.50', 'ups'],
                    ]);

                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Dispositivos');
                    XLSX.writeFile(wb, 'plantilla_dispositivos.xlsx');
                    setShowBulkMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Descargar Plantilla Excel
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={reportMenuRef}>
            <button
              onClick={() => setShowReportMenu(!showReportMenu)}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition font-medium"
            >
              <FileText className="w-5 h-5" />
              <span>Reporte</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showReportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Excel
                </button>
                <button
                  onClick={handleExportImage}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Imagen
                </button>
                <button
                  onClick={handleExportHTML}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Página HTML
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <FilterControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        deviceTypeFilter={deviceTypeFilter}
        onDeviceTypeChange={setDeviceTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {devices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no hay dispositivos</h3>
          <p className="text-gray-600 mb-6">Comienza agregando tu primer dispositivo para monitorear</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Agregar Tu Primer Dispositivo
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Dispositivo
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    IP
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Respuesta
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Actividad
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Última Caída
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Último Cambio
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDevices.map((device) => (
                  <tr
                    key={device.id}
                    onClick={() => handleRowClick(device)}
                    className={`transition cursor-pointer ${
                      device.status === 'offline'
                        ? 'bg-red-400 hover:bg-red-500'
                        : 'hover:bg-blue-50'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        device.status === 'offline' ? 'bg-white bg-opacity-20' : getDeviceIconColor(device.device_type)
                      }`}>
                        {getDeviceIcon(device.device_type, device.status === 'offline' ? 'w-4 h-4 text-white' : 'w-4 h-4')}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className={`text-sm font-medium ${
                        device.status === 'offline' ? 'text-white' : 'text-gray-900'
                      }`}>{device.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <code className={`text-xs px-1.5 py-0.5 rounded ${
                        device.status === 'offline' ? 'text-white bg-red-600' : 'text-gray-700 bg-gray-100'
                      }`}>
                        {device.ip_address}
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        device.status === 'offline' ? 'bg-white text-red-900 border-white' : getStatusColor(device.status)
                      }`}>
                        {getStatusIcon(device.status)}
                        {device.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${
                        device.status === 'offline' ? 'text-white' : 'text-gray-700'
                      }`}>
                        {device.response_time ? `${device.response_time}ms` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium ${
                        device.status === 'offline' ? 'text-white' : 'text-gray-700'
                      }`}>
                        {calculateUptime(device)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${
                        device.status === 'offline' ? 'text-white' : 'text-gray-600'
                      }`}>
                        {formatDate(device.last_down)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium ${
                        device.status === 'offline' ? 'text-white' : 'text-gray-700'
                      }`}>
                        {calculateTimeSinceLastChange(device)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleHistory(device, e)}
                          className={`p-1.5 rounded transition ${
                            device.status === 'offline'
                              ? 'text-white hover:bg-red-500'
                              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          title="Ver Historial"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleEdit(device, e)}
                          className={`p-1.5 rounded transition ${
                            device.status === 'offline'
                              ? 'text-white hover:bg-red-500'
                              : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(device, e)}
                          className={`p-1.5 rounded transition ${
                            device.status === 'offline'
                              ? 'text-white hover:bg-red-500'
                              : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                          }`}
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <DeviceForm
          device={editingDevice}
          userId={userId}
          onClose={handleFormClose}
        />
      )}

      {historyDevice && (
        <HistoryModal
          device={historyDevice}
          onClose={() => setHistoryDevice(null)}
        />
      )}

      {deleteDevice && (
        <DeleteConfirmModal
          deviceName={deleteDevice.name}
          deviceIp={deleteDevice.ip_address}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteDevice(null)}
        />
      )}

      {detailsDevice && (
        <DeviceDetailsPanel
          device={detailsDevice}
          onClose={() => setDetailsDevice(null)}
        />
      )}

      {showBulkUpload && (
        <BulkUploadModal
          userId={userId}
          onClose={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
}
