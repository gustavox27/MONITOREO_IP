import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Device = Database['public']['Tables']['devices']['Row'];
type DeviceInsert = Database['public']['Tables']['devices']['Insert'];
type DeviceUpdate = Database['public']['Tables']['devices']['Update'];
type Event = Database['public']['Tables']['events']['Row'];

export const deviceService = {
  async getDevices(userId?: string) {
    let query = supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Device[];
  },

  async getDevice(id: string) {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Device | null;
  },

  async createDevice(device: DeviceInsert) {
    const { data, error } = await (supabase
      .from('devices') as any)
      .insert(device)
      .select()
      .single();

    if (error) throw error;
    return data as Device;
  },

  async updateDevice(id: string, updates: DeviceUpdate) {
    const { data, error } = await (supabase
      .from('devices') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Device;
  },

  async deleteDevice(id: string) {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async deleteAllUserDevices(userId: string) {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  async updateDeviceStatus(
    deviceId: string,
    status: 'online' | 'offline',
    responseTime: number | null
  ) {
    const updates: DeviceUpdate = {
      status,
      response_time: responseTime,
    };

    if (status === 'offline') {
      updates.last_down = new Date().toISOString();
    }

    const { error: deviceError } = await (supabase
      .from('devices') as any)
      .update(updates)
      .eq('id', deviceId);

    if (deviceError) throw deviceError;

    const { error: eventError } = await (supabase
      .from('events') as any)
      .insert({
        device_id: deviceId,
        status,
        response_time: responseTime,
      });

    if (eventError) throw eventError;
  },

  async getDeviceEvents(deviceId: string, limit?: number | null, startDate?: string, endDate?: string, offset?: number) {
    let query = supabase
      .from('events')
      .select('*')
      .eq('device_id', deviceId);

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    query = query.order('timestamp', { ascending: false });

    if (offset) {
      query = query.range(offset, offset + (limit || 100) - 1);
    } else if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Event[];
  },

  async countDeviceEvents(deviceId: string, startDate?: string, endDate?: string): Promise<number> {
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('device_id', deviceId);

    if (startDate) {
      query = query.gte('timestamp', startDate);
    }

    if (endDate) {
      query = query.lte('timestamp', endDate);
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  },

  async getFirstOfflineEventTimestamp(deviceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('events')
      .select('timestamp')
      .eq('device_id', deviceId)
      .eq('status', 'offline')
      .order('timestamp', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.timestamp || null;
  },

  async getFirstEventTimestamp(deviceId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('events')
      .select('timestamp')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.timestamp || null;
  },

  async getTechnicians() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'técnico')
      .order('full_name');

    if (error) throw error;
    return data;
  },

  async checkDuplicateIp(ipAddress: string, userId: string, excludeDeviceId?: string) {
    let query = supabase
      .from('devices')
      .select('id, name')
      .eq('ip_address', ipAddress)
      .eq('user_id', userId);

    if (excludeDeviceId) {
      query = query.neq('id', excludeDeviceId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  },

  async getAllRecentEvents(limit = 50) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as Event[];
  },

  validateIpAddress(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (!ipv4Regex.test(ip)) {
      return false;
    }

    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  },

  async getDeviceTransitions(deviceId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    const events = data as Event[];
    const transitions: Event[] = [];
    let lastStatus: string | null = null;

    events.forEach((event, index) => {
      if (index === 0) {
        transitions.push(event);
        lastStatus = event.status;
      } else if (event.status !== lastStatus) {
        transitions.push(event);
        lastStatus = event.status;
      }
    });

    return transitions.reverse();
  },

  async getFirstOfflineTransition(deviceId: string): Promise<Event | null> {
    const transitions = await this.getDeviceTransitions(deviceId);
    const firstOffline = transitions.find(t => t.status === 'offline');
    return firstOffline || null;
  },

  async getLastOnlineBeforeOrAfterFirstOffline(deviceId: string): Promise<Event | null> {
    const transitions = await this.getDeviceTransitions(deviceId);

    if (transitions.length === 0) return null;

    const firstEventInHistory = transitions[transitions.length - 1];
    const firstOfflineInHistory = transitions.find((t, index) =>
      t.status === 'offline'
    );

    if (!firstOfflineInHistory) {
      if (firstEventInHistory.status === 'online') {
        return firstEventInHistory;
      }
      return null;
    }

    const firstOfflineIndex = transitions.findIndex(t => t.status === 'offline');
    const mostRecentOnlineBeforeFirstOffline = transitions.find((t, index) =>
      t.status === 'online' && index > firstOfflineIndex
    );

    if (mostRecentOnlineBeforeFirstOffline) {
      return mostRecentOnlineBeforeFirstOffline;
    }

    if (firstEventInHistory.status === 'online') {
      return firstEventInHistory;
    }

    return null;
  },

  async getConnectionStatusInfo(deviceId: string): Promise<{
    hasEverBeenOffline: boolean;
    firstOfflineDate: string | null;
    lastConnectedDate: string | null;
    isCurrentlyOffline: boolean;
  }> {
    const transitions = await this.getDeviceTransitions(deviceId);

    if (transitions.length === 0) {
      return {
        hasEverBeenOffline: false,
        firstOfflineDate: null,
        lastConnectedDate: null,
        isCurrentlyOffline: false,
      };
    }

    const firstEventInHistory = transitions[transitions.length - 1];
    const currentStatus = transitions[0];
    const isCurrentlyOffline = currentStatus.status === 'offline';

    let hasEverBeenOffline = false;
    let firstOfflineDate: string | null = null;
    let lastConnectedDate: string | null = null;

    const firstOfflineIndex = transitions.findIndex(t => t.status === 'offline');
    hasEverBeenOffline = firstOfflineIndex !== -1;

    if (hasEverBeenOffline) {
      const firstOfflineEvent = transitions[firstOfflineIndex];
      firstOfflineDate = firstOfflineEvent.timestamp;

      const mostRecentOfflineIndex = transitions.findIndex(t => t.status === 'offline');

      if (isCurrentlyOffline) {
        lastConnectedDate = null;
      } else {
        const firstOnlineAfterMostRecentOffline = transitions.find((t, index) =>
          t.status === 'online' && index < mostRecentOfflineIndex
        );
        if (firstOnlineAfterMostRecentOffline) {
          lastConnectedDate = firstOnlineAfterMostRecentOffline.timestamp;
        }
      }
    } else {
      if (firstEventInHistory.status === 'online') {
        lastConnectedDate = firstEventInHistory.timestamp;
      }
    }

    return {
      hasEverBeenOffline,
      firstOfflineDate,
      lastConnectedDate,
      isCurrentlyOffline,
    };
  }
};
