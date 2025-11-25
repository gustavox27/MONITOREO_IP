import type { DeviceType } from './deviceIcons';

export type { DeviceType };

export interface IconColor {
  bg: string;
  text: string;
  textRGB: [number, number, number];
}

export const deviceIconColors: Record<DeviceType, IconColor> = {
  printer_laser: {
    bg: '#f3e8ff',
    text: '#9333ea',
    textRGB: [147, 51, 234],
  },
  printer_label: {
    bg: '#f3e8ff',
    text: '#9333ea',
    textRGB: [147, 51, 234],
  },
  clock: {
    bg: '#dbeafe',
    text: '#2563eb',
    textRGB: [37, 99, 235],
  },
  server: {
    bg: '#dcfce7',
    text: '#16a34a',
    textRGB: [22, 163, 74],
  },
  laptop: {
    bg: '#e0e7ff',
    text: '#4f46e5',
    textRGB: [79, 70, 229],
  },
  ups: {
    bg: '#fef3c7',
    text: '#d97706',
    textRGB: [217, 119, 6],
  },
  modem: {
    bg: '#cffafe',
    text: '#0891b2',
    textRGB: [8, 145, 178],
  },
  router: {
    bg: '#fed7aa',
    text: '#ea580c',
    textRGB: [234, 88, 12],
  },
  generic: {
    bg: '#f3f4f6',
    text: '#4b5563',
    textRGB: [75, 85, 99],
  },
};

export function generateDeviceIconSVG(type: DeviceType, size: number = 24): string {
  const icons: Record<DeviceType, string> = {
    printer_laser: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>`,
    printer_label: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>`,
    clock: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`,
    server: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="2" width="20" height="8"></rect>
      <rect x="2" y="14" width="20" height="8"></rect>
      <line x1="6" y1="6" x2="6" y2="6"></line>
      <line x1="6" y1="18" x2="6" y2="18"></line>
    </svg>`,
    laptop: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path>
      <polyline points="22 17 2 17"></polyline>
    </svg>`,
    ups: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v6m-4 2v6m8-6v6M4 22h16a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1z"></path>
    </svg>`,
    modem: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.94 0"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </svg>`,
    router: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1z"></path>
      <circle cx="12" cy="12" r="7"></circle>
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 19a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1z"></path>
      <path d="M5 12a1 1 0 0 0-1-1H3a1 1 0 0 0 0 2h1a1 1 0 0 0 1-1z"></path>
      <path d="M19 12a1 1 0 0 0 1-1h1a1 1 0 0 0 0 2h-1a1 1 0 0 0-1-1z"></path>
    </svg>`,
    generic: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="2" y1="20" x2="22" y2="20"></line>
    </svg>`,
  };

  return icons[type] || icons.generic;
}

export function generateDeviceIconSVGWithColor(type: DeviceType, size: number = 24, fillBackground: boolean = true): string {
  const color = deviceIconColors[type];
  const svg = generateDeviceIconSVG(type, size);

  if (fillBackground) {
    const svgWithBg = svg.replace(
      '<svg',
      `<svg style="background-color: ${color.bg}; border-radius: 6px; padding: 4px; display: inline-block;"`
    );
    return svgWithBg.replace('stroke="currentColor"', `stroke="${color.text}"`);
  }

  return svg.replace('stroke="currentColor"', `stroke="${color.text}"`);
}

export function generateInlineSVGForHTML(type: DeviceType): string {
  const color = deviceIconColors[type];
  const svg = generateDeviceIconSVG(type, 20);

  return svg
    .replace('stroke="currentColor"', `stroke="${color.text}" stroke-linecap="round" stroke-linejoin="round"`)
    .replace('<svg', `<svg style="display: inline-block; vertical-align: middle; margin-right: 8px;"`);
}

export function getPDFIconColor(type: DeviceType): [number, number, number] {
  return deviceIconColors[type].textRGB;
}

export function getPDFBackgroundColor(type: DeviceType): [number, number, number] {
  const color = deviceIconColors[type];
  const rgbBg = hexToRGB(color.bg);
  return rgbBg;
}

function hexToRGB(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}
