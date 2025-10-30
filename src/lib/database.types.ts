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
          role: 'admin' | 'technician'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'technician'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'technician'
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
    }
  }
}
