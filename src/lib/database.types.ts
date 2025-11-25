export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'administrador' | 'técnico'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'administrador' | 'técnico'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'administrador' | 'técnico'
          created_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          ip_address: string
          name: string
          status: 'online' | 'offline' | 'unknown'
          response_time: number | null
          last_down: string | null
          last_check: string | null
          device_type: 'printer_laser' | 'printer_label' | 'clock' | 'server' | 'laptop' | 'ups' | 'modem' | 'router' | 'generic'
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          name: string
          status?: 'online' | 'offline' | 'unknown'
          response_time?: number | null
          last_down?: string | null
          last_check?: string | null
          device_type?: 'printer_laser' | 'printer_label' | 'clock' | 'server' | 'laptop' | 'ups' | 'modem' | 'router' | 'generic'
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          name?: string
          status?: 'online' | 'offline' | 'unknown'
          response_time?: number | null
          last_down?: string | null
          last_check?: string | null
          device_type?: 'printer_laser' | 'printer_label' | 'clock' | 'server' | 'laptop' | 'ups' | 'modem' | 'router' | 'generic'
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          device_id: string
          status: 'online' | 'offline'
          response_time: number | null
          timestamp: string
        }
        Insert: {
          id?: string
          device_id: string
          status: 'online' | 'offline'
          response_time?: number | null
          timestamp?: string
        }
        Update: {
          id?: string
          device_id?: string
          status?: 'online' | 'offline'
          response_time?: number | null
          timestamp?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          enable_notifications: boolean
          enable_sound: boolean
          group_notifications: boolean
          sound_volume: number
          notification_duration: number
          enable_recurring_notifications: boolean
          recurring_interval: number
          recurring_volume: number
          use_custom_sounds: boolean
          custom_sound_online_url: string | null
          custom_sound_offline_url: string | null
          custom_sound_online_name: string | null
          custom_sound_offline_name: string | null
          custom_sound_online_duration: number | null
          custom_sound_offline_duration: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enable_notifications?: boolean
          enable_sound?: boolean
          group_notifications?: boolean
          sound_volume?: number
          notification_duration?: number
          enable_recurring_notifications?: boolean
          recurring_interval?: number
          recurring_volume?: number
          use_custom_sounds?: boolean
          custom_sound_online_url?: string | null
          custom_sound_offline_url?: string | null
          custom_sound_online_name?: string | null
          custom_sound_offline_name?: string | null
          custom_sound_online_duration?: number | null
          custom_sound_offline_duration?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          enable_notifications?: boolean
          enable_sound?: boolean
          group_notifications?: boolean
          sound_volume?: number
          notification_duration?: number
          enable_recurring_notifications?: boolean
          recurring_interval?: number
          recurring_volume?: number
          use_custom_sounds?: boolean
          custom_sound_online_url?: string | null
          custom_sound_offline_url?: string | null
          custom_sound_online_name?: string | null
          custom_sound_offline_name?: string | null
          custom_sound_online_duration?: number | null
          custom_sound_offline_duration?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
