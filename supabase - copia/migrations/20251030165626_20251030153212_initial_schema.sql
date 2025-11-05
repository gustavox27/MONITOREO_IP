/*
  # Sistema de Monitoreo de IP - Esquema de Base de Datos

  ## Descripción General
  Esta migración crea la estructura completa de la base de datos para un sistema de monitoreo de IP
  con control de acceso basado en roles, seguimiento de dispositivos e historial de eventos.

  ## Nuevas Tablas

  ### 1. profiles
  - `id` (uuid, primary key) - Vinculado a auth.users
  - `email` (text) - Correo electrónico del usuario
  - `full_name` (text) - Nombre completo del usuario
  - `role` (text) - 'admin' o 'technician'
  - `created_at` (timestamptz) - Timestamp de creación de cuenta

  ### 2. devices
  - `id` (uuid, primary key) - Identificador único del dispositivo
  - `ip_address` (text, unique) - Dirección IP a monitorear
  - `name` (text) - Nombre amigable del dispositivo
  - `status` (text) - Estado actual: 'online', 'offline', 'unknown'
  - `response_time` (integer) - Último tiempo de respuesta en milisegundos
  - `last_down` (timestamptz) - Timestamp del último evento offline
  - `last_check` (timestamptz) - Timestamp de la última verificación del agente
  - `user_id` (uuid) - Propietario/técnico de este dispositivo
  - `created_at` (timestamptz) - Timestamp de creación del dispositivo
  - `updated_at` (timestamptz) - Timestamp de última actualización

  ### 3. events
  - `id` (uuid, primary key) - Identificador único del evento
  - `device_id` (uuid) - Foreign key a la tabla devices
  - `status` (text) - Estado en el momento del evento: 'online' o 'offline'
  - `response_time` (integer) - Tiempo de respuesta en ms (null para offline)
  - `timestamp` (timestamptz) - Cuándo ocurrió el evento

  ## Seguridad

  ### Row Level Security (RLS)
  Todas las tablas tienen RLS habilitado con políticas restrictivas:

  #### Tabla profiles:
  - Los usuarios pueden leer su propio perfil
  - Los admins pueden leer todos los perfiles
  - Los usuarios pueden actualizar su propio perfil (excepto rol)

  #### Tabla devices:
  - Los técnicos pueden ver/gestionar solo sus dispositivos
  - Los admins pueden ver/gestionar todos los dispositivos
  - Cualquier usuario autenticado puede crear dispositivos

  #### Tabla events:
  - Los usuarios pueden ver eventos de los dispositivos que poseen
  - Los admins pueden ver todos los eventos
  - El sistema puede insertar eventos (para reportes del agente)
*/

-- Crear tabla profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'technician')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Crear tabla devices
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text UNIQUE NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
  response_time integer,
  last_down timestamptz,
  last_check timestamptz DEFAULT now(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Crear tabla events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline')),
  response_time integer,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_check ON devices(last_check);
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

-- Políticas RLS para tabla profiles

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
      AND profiles.role = 'admin'
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

-- Políticas RLS para tabla devices

CREATE POLICY "Technicians can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
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
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
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
      AND profiles.role = 'admin'
    )
  );

-- Políticas RLS para tabla events

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

-- Función para actualizar automáticamente updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en tabla devices
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para crear perfil en registro
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'technician')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Habilitar Realtime para la tabla devices
ALTER PUBLICATION supabase_realtime ADD TABLE devices;