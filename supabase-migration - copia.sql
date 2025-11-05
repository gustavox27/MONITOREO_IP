/*
  # IP Monitoring System Database Schema

  ## Overview
  This migration creates the complete database structure for a multi-user IP monitoring system
  with role-based access control, device tracking, and event history.

  ## New Tables

  ### 1. profiles
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - Either 'administrador' or 'técnico'
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. devices
  - `id` (uuid, primary key) - Unique device identifier
  - `ip_address` (text, unique) - IP address to monitor
  - `name` (text) - Friendly name for the device
  - `status` (text) - Current status: 'online', 'offline', 'unknown'
  - `response_time` (integer) - Last response time in milliseconds
  - `last_down` (timestamptz) - Timestamp of last offline event
  - `user_id` (uuid) - Owner/technician of this device
  - `created_at` (timestamptz) - Device creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. events
  - `id` (uuid, primary key) - Unique event identifier
  - `device_id` (uuid) - Foreign key to devices table
  - `status` (text) - Status at time of event: 'online' or 'offline'
  - `response_time` (integer) - Response time in milliseconds (null for offline)
  - `timestamp` (timestamptz) - When the event occurred

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with the following policies:

  #### profiles table:
  - Users can read their own profile
  - Admins can read all profiles
  - Users can update their own profile (except role)

  #### devices table:
  - Technicians can view/manage only their own devices
  - Admins can view/manage all devices
  - Any authenticated user can create devices

  #### events table:
  - Users can view events for devices they own
  - Admins can view all events
  - System can insert events (for agent reporting)

  ## Instructions
  Execute this SQL in your Supabase SQL Editor:
  https://supabase.com/dashboard/project/wangyihjmrxdaajrbmuk/sql
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'técnico' CHECK (role IN ('administrador', 'técnico')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
  response_time integer,
  last_down timestamptz,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline')),
  response_time integer,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

-- RLS Policies for profiles table

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for devices table

CREATE POLICY "Technicians can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

CREATE POLICY "Technicians can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Technicians can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

CREATE POLICY "Technicians can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrador'
    )
  );

-- RLS Policies for events table

CREATE POLICY "Users can view events for their devices"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = events.device_id
      AND (
        devices.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "System can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = events.device_id
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on devices table
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'técnico')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
