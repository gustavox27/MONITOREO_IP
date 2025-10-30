import { Search, Filter } from 'lucide-react';

interface FilterControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  deviceTypeFilter: string;
  onDeviceTypeChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

const deviceTypes = [
  { value: '', label: 'Todos los Tipos' },
  { value: 'printer_laser', label: 'Impresora Láser' },
  { value: 'printer_label', label: 'Impresora de Etiquetas' },
  { value: 'clock', label: 'Reloj' },
  { value: 'server', label: 'Servidor' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'ups', label: 'UPS' },
  { value: 'modem', label: 'Módem' },
  { value: 'router', label: 'Router' },
  { value: 'generic', label: 'Genérico' },
];

const statusOptions = [
  { value: '', label: 'Todos los Estados' },
  { value: 'online', label: 'En Línea' },
  { value: 'offline', label: 'Fuera de Línea' },
  { value: 'unknown', label: 'Desconocido' },
];

const sortOptions = [
  { value: 'created_at', label: 'Fecha de Registro' },
  { value: 'name', label: 'Nombre' },
  { value: 'status', label: 'Estado' },
  { value: 'response_time', label: 'Latencia' },
];

export function FilterControls({
  searchTerm,
  onSearchChange,
  deviceTypeFilter,
  onDeviceTypeChange,
  statusFilter,
  onStatusChange,
  sortBy,
  onSortChange,
}: FilterControlsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Filtros y Búsqueda</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o IP..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={deviceTypeFilter}
          onChange={(e) => onDeviceTypeChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {deviceTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Ordenar por...</option>
          {sortOptions.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
