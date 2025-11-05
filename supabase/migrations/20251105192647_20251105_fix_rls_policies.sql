/*
  # Corregir Políticas RLS - Eliminar Recursión Infinita
  
  ## Problema
  Las políticas RLS estaban causando recursión infinita porque la política
  "Admins can read all profiles" consultaba la misma tabla profiles.
  
  ## Solución
  - Eliminar todas las políticas existentes
  - Recrear políticas simplificadas sin recursión
  - Usar auth.uid() directamente para validaciones
*/

-- Eliminar políticas existentes de profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

-- Eliminar políticas existentes de devices
DROP POLICY IF EXISTS "Technicians can view own devices" ON devices;
DROP POLICY IF EXISTS "Technicians can insert own devices" ON devices;
DROP POLICY IF EXISTS "Technicians can update own devices" ON devices;
DROP POLICY IF EXISTS "Technicians can delete own devices" ON devices;

-- Eliminar políticas existentes de events
DROP POLICY IF EXISTS "Users can view events for their devices" ON events;
DROP POLICY IF EXISTS "System can insert events" ON events;

-- Nuevas políticas para profiles (SIN RECURSIÓN)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Nuevas políticas para devices
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Nuevas políticas para events
CREATE POLICY "Users can view events for their devices"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = events.device_id
      AND devices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = events.device_id
      AND devices.user_id = auth.uid()
    )
  );

-- Crear políticas adicionales para administradores usando jwt claims
-- Los admins pueden ver todos los perfiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'administrador'
    OR auth.uid() = id
  );

-- Los admins pueden ver todos los dispositivos
CREATE POLICY "Admins can view all devices"
  ON devices FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'administrador'
    OR user_id = auth.uid()
  );

-- Los admins pueden actualizar todos los dispositivos
CREATE POLICY "Admins can update all devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'administrador'
    OR user_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'administrador'
    OR user_id = auth.uid()
  );

-- Los admins pueden eliminar todos los dispositivos
CREATE POLICY "Admins can delete all devices"
  ON devices FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'administrador'
    OR user_id = auth.uid()
  );

-- Los admins pueden ver todos los eventos
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'administrador'
    OR EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = events.device_id
      AND devices.user_id = auth.uid()
    )
  );