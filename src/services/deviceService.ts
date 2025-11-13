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

  async getDeviceEvents(deviceId: string, limit?: number | null, startDate?: string, endDate?: string) {
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

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Event[];
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
  }
};
