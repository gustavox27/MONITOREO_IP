import type { Database } from '../lib/database.types';
import { supabase } from '../lib/supabase';

type Device = Database['public']['Tables']['devices']['Row'];

export interface NotificationPreferences {
  enable_notifications: boolean;
  enable_sound: boolean;
  group_notifications: boolean;
  sound_volume: number;
  notification_duration: number;
}

export const notificationService = {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return 'denied';
  },

  canShowNotifications(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  async showNativeNotification(
    device: Device,
    status: 'online' | 'offline',
    groupedCount?: number
  ): Promise<void> {
    if (!this.canShowNotifications() || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const tag = `device-status-${device.id}`;
      const statusText = status === 'online' ? 'EN LÍNEA' : 'FUERA DE LÍNEA';
      const statusEmoji = status === 'online' ? '✓' : '✗';

      let title = device.name;
      const notificationBody = `${statusEmoji} ${statusText}`;

      let displayBody = notificationBody;
      if (groupedCount && groupedCount > 1) {
        title = `${groupedCount} dispositivos con cambios`;
        displayBody = status === 'online'
          ? 'Se ha restaurado la conexión'
          : 'Se ha perdido la conexión';
      }

      const notificationOptions = {
        icon: '/notification-icon.svg',
        badge: '/notification-badge.svg',
        tag,
        requireInteraction: false,
        silent: false,
        data: {
          deviceId: device.id,
          deviceName: device.name,
          deviceIp: device.ip_address,
          status,
          timestamp: new Date().toISOString(),
        },
      };

      await registration.showNotification(title, {
        ...notificationOptions,
        body: displayBody,
      } as NotificationOptions);

      setTimeout(() => {
        registration.getNotifications({ tag }).then((notifications) => {
          notifications.forEach((notification) => {
            notification.close();
          });
        });
      }, 10000);
    } catch (error) {
      console.error('Error showing native notification:', error);
    }
  },

  playNotificationSound(status: 'online' | 'offline', volume: number = 0.4): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (status === 'offline') {
        const notes = [400, 400, 400];
        const durations = [0.2, 0.2, 0.3];
        const delays = [0, 250, 500];

        notes.forEach((freq, index) => {
          const startTime = audioContext.currentTime + delays[index] / 1000;
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.frequency.value = freq;
          osc.type = 'sine';

          gain.gain.setValueAtTime(volume, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + durations[index]);

          osc.start(startTime);
          osc.stop(startTime + durations[index]);
        });
      } else {
        const notes = [800, 800];
        const durations = [0.2, 0.2];
        const delays = [0, 150];

        notes.forEach((freq, index) => {
          const startTime = audioContext.currentTime + delays[index] / 1000;
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.frequency.value = freq;
          osc.type = 'sine';

          gain.gain.setValueAtTime(volume, startTime);
          gain.gain.exponentialRampToValueAtTime(0.01, startTime + durations[index]);

          osc.start(startTime);
          osc.stop(startTime + durations[index]);
        });
      }
    } catch (error) {
      console.log('Audio playback not supported:', error);
    }
  },

  async getUserPreferences(
    userId: string
  ): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPreferences | null;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return null;
    }
  },

  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences | null> {
    try {
      const existing = await this.getUserPreferences(userId);

      if (existing) {
        const { data, error } = await (supabase
          .from('notification_preferences') as any)
          .update(preferences)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data as NotificationPreferences;
      } else {
        const { data, error } = await (supabase
          .from('notification_preferences') as any)
          .insert({
            user_id: userId,
            ...preferences,
          })
          .select()
          .single();

        if (error) throw error;
        return data as NotificationPreferences;
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return null;
    }
  },

  isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
  },

  isBrowserSupported(): boolean {
    return 'Notification' in window && this.isServiceWorkerSupported();
  },

  getNotificationPermission(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  },
};
