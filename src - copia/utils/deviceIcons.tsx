import { Printer, Clock, Server, Laptop, Battery, Wifi, Router, HardDrive } from 'lucide-react';

export type DeviceType = 'printer_laser' | 'printer_label' | 'clock' | 'server' | 'laptop' | 'ups' | 'modem' | 'router' | 'generic';

export const deviceTypeLabels: Record<DeviceType, string> = {
  printer_laser: 'Impresora Láser',
  printer_label: 'Impresora Etiquetadora',
  clock: 'Reloj',
  server: 'Servidor',
  laptop: 'Laptop',
  ups: 'UPS',
  modem: 'Módem',
  router: 'Router',
  generic: 'Dispositivo Genérico'
};

export const deviceTypeOptions: { value: DeviceType; label: string }[] = [
  { value: 'printer_laser', label: 'Impresora Láser' },
  { value: 'printer_label', label: 'Impresora Etiquetadora' },
  { value: 'clock', label: 'Reloj' },
  { value: 'server', label: 'Servidor' },
  { value: 'laptop', label: 'Laptop' },
  { value: 'ups', label: 'UPS' },
  { value: 'modem', label: 'Módem' },
  { value: 'router', label: 'Router' },
  { value: 'generic', label: 'Dispositivo Genérico' }
];

export function getDeviceIcon(type: DeviceType, className: string = 'w-6 h-6') {
  const iconProps = { className };

  switch (type) {
    case 'printer_laser':
    case 'printer_label':
      return <Printer {...iconProps} />;
    case 'clock':
      return <Clock {...iconProps} />;
    case 'server':
      return <Server {...iconProps} />;
    case 'laptop':
      return <Laptop {...iconProps} />;
    case 'ups':
      return <Battery {...iconProps} />;
    case 'modem':
      return <Wifi {...iconProps} />;
    case 'router':
      return <Router {...iconProps} />;
    case 'generic':
    default:
      return <HardDrive {...iconProps} />;
  }
}

export function getDeviceIconColor(type: DeviceType): string {
  switch (type) {
    case 'printer_laser':
    case 'printer_label':
      return 'bg-purple-100 text-purple-600';
    case 'clock':
      return 'bg-blue-100 text-blue-600';
    case 'server':
      return 'bg-green-100 text-green-600';
    case 'laptop':
      return 'bg-indigo-100 text-indigo-600';
    case 'ups':
      return 'bg-yellow-100 text-yellow-600';
    case 'modem':
      return 'bg-cyan-100 text-cyan-600';
    case 'router':
      return 'bg-orange-100 text-orange-600';
    case 'generic':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}
