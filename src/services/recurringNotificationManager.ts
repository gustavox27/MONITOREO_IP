import { notificationService } from './notificationService';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];

interface RecurringNotificationState {
  offlineDevices: Map<string, { device: Device; offlineTime: number }>;
  intervalTimer: NodeJS.Timeout | null;
  pendingIntervalChange: number | null;
}

export class RecurringNotificationManager {
  private state: RecurringNotificationState = {
    offlineDevices: new Map(),
    intervalTimer: null,
    pendingIntervalChange: null,
  };

  private currentInterval: number = 30;
  private preferences: {
    enabled: boolean;
    soundEnabled: boolean;
    soundVolume: number;
    recurringVolume: number;
  } = {
    enabled: false,
    soundEnabled: true,
    soundVolume: 0.4,
    recurringVolume: 0.25,
  };

  constructor() {}

  setPreferences(
    enabled: boolean,
    soundEnabled: boolean,
    soundVolume: number,
    recurringVolume: number,
    interval: number
  ): void {
    this.preferences = {
      enabled,
      soundEnabled,
      soundVolume,
      recurringVolume,
    };

    if (interval !== this.currentInterval && this.state.intervalTimer !== null) {
      this.state.pendingIntervalChange = interval;
    } else {
      this.currentInterval = interval;
    }
  }

  addOfflineDevice(device: Device): void {
    if (!this.preferences.enabled) return;

    const now = Date.now();
    this.state.offlineDevices.set(device.id, {
      device,
      offlineTime: now,
    });

    if (this.state.intervalTimer === null && this.state.offlineDevices.size > 0) {
      this.startRecurringNotifications();
    }
  }

  removeOfflineDevice(deviceId: string): void {
    this.state.offlineDevices.delete(deviceId);

    if (this.state.offlineDevices.size === 0) {
      this.stopRecurringNotifications();
    }
  }

  updateOfflineDevices(offlineDeviceIds: string[], allDevices: Device[]): void {
    const deviceMap = new Map(allDevices.map((d) => [d.id, d]));

    for (const id of this.state.offlineDevices.keys()) {
      if (!offlineDeviceIds.includes(id)) {
        this.removeOfflineDevice(id);
      }
    }

    for (const id of offlineDeviceIds) {
      if (!this.state.offlineDevices.has(id)) {
        const device = deviceMap.get(id);
        if (device) {
          this.addOfflineDevice(device);
        }
      }
    }
  }

  private startRecurringNotifications(): void {
    if (this.state.intervalTimer !== null) return;

    this.sendNotification();

    this.state.intervalTimer = setInterval(() => {
      if (this.state.pendingIntervalChange !== null) {
        clearInterval(this.state.intervalTimer!);
        this.state.intervalTimer = null;
        this.currentInterval = this.state.pendingIntervalChange;
        this.state.pendingIntervalChange = null;

        if (this.state.offlineDevices.size > 0) {
          this.startRecurringNotifications();
        }
        return;
      }

      this.sendNotification();
    }, this.currentInterval * 1000);
  }

  private stopRecurringNotifications(): void {
    if (this.state.intervalTimer !== null) {
      clearInterval(this.state.intervalTimer);
      this.state.intervalTimer = null;
    }
    this.state.pendingIntervalChange = null;
  }

  private sendNotification(): void {
    if (this.state.offlineDevices.size === 0) return;

    const sortedDevices = Array.from(this.state.offlineDevices.values()).sort(
      (a, b) => a.offlineTime - b.offlineTime
    );

    const deviceNames = sortedDevices.map((item) => item.device.name);

    notificationService.showRecurringNotification(
      deviceNames,
      deviceNames.length
    );

    if (this.preferences.soundEnabled) {
      notificationService.playRecurringNotificationSound(
        this.preferences.recurringVolume
      );
    }
  }

  isEnabled(): boolean {
    return this.preferences.enabled;
  }

  getOfflineDeviceCount(): number {
    return this.state.offlineDevices.size;
  }

  destroy(): void {
    this.stopRecurringNotifications();
    this.state.offlineDevices.clear();
  }
}
