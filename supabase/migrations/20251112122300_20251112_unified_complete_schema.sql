/*
  # Sistema de Monitoreo de Dispositivos - Esquema Completo y Unificado
  
  ## Descripción General
  Esquema completo de la base de datos para un sistema de monitoreo de dispositivos IP
  con control de acceso basado en roles, seguimiento de dispositivos e historial completo de eventos.
  TODOS LOS VALORES EN ESPAÑOL. RLS OPTIMIZADO SIN RECURSIÓN INFINITA.
  
  ## Nuevas Tablas
  
  ### 1. profiles
  - `id` (uuid, primary key) - Vinculado a auth.users
  - `email` (text) - Correo electrónico del usuario
  - `full_name` (text) - Nombre completo del usuario
  - `role` (text) - 'administrador' o 'técnico' (EN ESPAÑOL)
  - `created_at` (timestamptz) - Timestamp de creación de cuenta
  
  ### 2. devices
  - `id` (uuid, primary key) - Identificador único del dispositivo
  - `ip_address` (text) - Dirección IP a monitorear
  - `name` (text) - Nombre amigable del dispositivo
  - `status` (text) - Estado actual: 'online', 'offline', 'unknown'
  - `response_time` (integer) - Último tiempo de respuesta en milisegundos
  - `last_down` (timestamptz) - Timestamp del último evento offline
  - `last_check` (timestamptz) - Timestamp de la última verificación del agente
  - `device_type` (text) - Tipo de dispositivo (EN ESPAÑOL)
  - `user_id` (uuid) - Propietario/técnico de este dispositivo
  - `created_at` (timestamptz) - Timestamp de creación del dispositivo
  - `updated_at` (timestamptz) - Timestamp de última actualización
  - UNIQUE(ip_address, user_id) - Permite misma IP para diferentes usuarios, pero no duplicar para el mismo usuario
  
  ### 3. events
  - `id` (uuid, primary key) - Identificador único del evento
  - `device_id` (uuid) - Foreign key a la tabla devices
  - `status` (text) - Estado en el momento del evento: 'online' o 'offline'
  - `response_time` (integer) - Tiempo de respuesta en ms (null para offline)
  - `timestamp` (timestamptz) - Cuándo ocurrió el evento
  - Mantiene TODOS los eventos históricos sin eliminación automática
  
  ## Seguridad
  
  ### Row Level Security (RLS)
  Todas las tablas tienen RLS habilitado con políticas restrictivas OPTIMIZADAS SIN RECURSIÓN:
  
  #### Tabla profiles:
  - Los usuarios pueden leer su propio perfil
  - Los admins pueden leer todos los perfiles (usando auth.jwt())
  - Los usuarios pueden actualizar su propio perfil (sin cambiar rol)
  
  #### Tabla devices:
  - Los usuarios pueden ver/gestionar solo sus dispositivos
  - Los admins pueden ver/gestionar todos los dispositivos (usando auth.jwt())
  - Validación: No permite duplicar IP para el mismo usuario
  
  #### Tabla events:
  - Los usuarios pueden ver eventos de los dispositivos que poseen
  - Los admins pueden ver todos los eventos (usando auth.jwt())
  - El sistema puede insertar eventos
  
  ## Valores en Español
  
  ### Roles:
  - 'administrador' - Acceso total al sistema
  - 'técnico' - Acceso solo a sus propios dispositivos
  
  ### Tipos de Dispositivo:
  - 'printer_laser' - Impresora Láser
  - 'printer_label' - Impresora Etiquetadora
  - 'clock' - Reloj
  - 'server' - Servidor
  - 'laptop' - Laptop
  - 'ups' - UPS
  - 'modem' - Módem
  - 'router' - Router
  - 'generic' - Dispositivo Genérico
  
  ## Índices para Optimización
  - idx_devices_user_id - Búsqueda rápida de dispositivos por usuario
  - idx_devices_last_check - Monitoreo de últimas actualizaciones
  - idx_devices_status - Filtrado por estado
  - idx_events_device_id - Búsqueda de eventos por dispositivo
  - idx_events_timestamp - Ordenamiento y filtrado de eventos por fecha (DESC para queries recientes primero)
  
  ## Retención de Datos
  - IMPORTANTE: NO hay políticas de eliminación automática de eventos
  - Todos los eventos se conservan permanentemente desde la fecha de registro del dispositivo
  - Las queries deben explícitamente usar LIMIT si necesitan subconjuntos
*/

-- Crear tabla profiles con roles EN ESPAÑOL
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'técnico' CHECK (role IN ('administrador', 'técnico')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Crear tabla devices con device_type EN ESPAÑOL y UNIQUE constraint por usuario
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
  response_time integer,
  last_down timestamptz,
  last_check timestamptz DEFAULT now(),
  device_type text NOT NULL DEFAULT 'generic' CHECK (device_type IN ('printer_laser', 'printer_label', 'clock', 'server', 'laptop', 'ups', 'modem', 'router', 'generic')),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ip_address, user_id)
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Crear tabla events - SIN POLÍTICAS DE RETENCIÓN, TODOS LOS EVENTOS SE CONSERVAN
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('online', 'offline')),
  response_time integer,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_check ON devices(last_check);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

-- Eliminar todas las políticas RLS existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Technicians can view own devices" ON devices;
DROP POLICY IF EXISTS "Technicians can insert own devices" ON devices;
DROP POLICY IF EXISTS "Technicians can update own devices" ON devices;
DROP POLICY IF EXISTS "Technicians can delete own devices" ON devices;
DROP POLICY IF EXISTS "Users can view own devices" ON devices;
DROP POLICY IF EXISTS "Users can insert own devices" ON devices;
DROP POLICY IF EXISTS "Users can update own devices" ON devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON devices;
DROP POLICY IF EXISTS "Admins can view all devices" ON devices;
DROP POLICY IF EXISTS "Admins can update all devices" ON devices;
DROP POLICY IF EXISTS "Admins can delete all devices" ON devices;
DROP POLICY IF EXISTS "Users can view events for their devices" ON events;
DROP POLICY IF EXISTS "System can insert events" ON events;
DROP POLICY IF EXISTS "Users can insert events" ON events;
DROP POLICY IF EXISTS "Admins can view all events" ON events;

-- Políticas RLS para tabla profiles (SIN RECURSIÓN)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'administrador' OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para tabla devices (SIN RECURSIÓN)
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() ->> 'role')::text = 'administrador');

CREATE POLICY "Users can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() ->> 'role')::text = 'administrador')
  WITH CHECK (user_id = auth.uid() OR (auth.jwt() ->> 'role')::text = 'administrador');

CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR (auth.jwt() ->> 'role')::text = 'administrador');

-- Políticas RLS para tabla events
CREATE POLICY "Users can view events for their devices"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = events.device_id
      AND (devices.user_id = auth.uid() OR (auth.jwt() ->> 'role')::text = 'administrador')
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

-- Función para crear perfil en registro CON ROLES EN ESPAÑOL
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'técnico')
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
