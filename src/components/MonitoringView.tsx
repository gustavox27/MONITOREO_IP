import { useEffect, useState, useRef } from 'react';
import { deviceService } from '../services/deviceService';
import { supabase } from '../lib/supabase';
import { DeviceForm } from './DeviceForm';
import { HistoryModal } from './HistoryModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DeviceDetailsPanel } from './DeviceDetailsPanel';
import { FilterControls } from './FilterControls';
import { BulkUploadModal } from './BulkUploadModal';
import { Plus, History, Pencil, Trash2, Activity, Clock, AlertCircle, Upload, ChevronDown } from 'lucide-react';
import { getDeviceIcon, getDeviceIconColor } from '../utils/deviceIcons';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];

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
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
        setShowBulkMenu(false);
      }
    };

    if (showBulkMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBulkMenu]);

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
            return [...prev, payload.new as Device];
          });
        } else if (payload.eventType === 'UPDATE') {
          setDevices((prev) =>
            prev.map((device) =>
              device.id === payload.new.id ? (payload.new as Device) : device
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setDevices((prev) => prev.filter((device) => device.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [filterTechnician, isAdmin]);

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
                  Cargar Archivo CSV
                </button>
                <button
                  onClick={() => {
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
                    setShowBulkMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Descargar Plantilla CSV
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
            <table className="w-full">
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
                    className="hover:bg-blue-50 transition cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getDeviceIconColor(device.device_type)}`}>
                        {getDeviceIcon(device.device_type, 'w-4 h-4')}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900">{device.name}</div>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                        {device.ip_address}
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(device.status)}`}>
                        {getStatusIcon(device.status)}
                        {device.status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-700">
                        {device.response_time ? `${device.response_time}ms` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium text-gray-700">
                        {calculateUptime(device)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-600">
                        {formatDate(device.last_down)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleHistory(device, e)}
                          className="p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded transition"
                          title="Ver Historial"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleEdit(device, e)}
                          className="p-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded transition"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(device, e)}
                          className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded transition"
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
