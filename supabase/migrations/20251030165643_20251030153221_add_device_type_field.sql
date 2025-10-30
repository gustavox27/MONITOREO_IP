/*
  # Agregar campo device_type a la tabla devices

  ## Cambios
  
  1. Agregar columna `device_type` a la tabla `devices`
     - Tipo: text
     - Descripción: Tipo de dispositivo para mostrar imagen representativa
     - Valores permitidos: 'printer_laser', 'printer_label', 'clock', 'server', 'laptop', 'ups', 'modem', 'router', 'generic'
     - Valor por defecto: 'generic'
  
  ## Notas
  - El campo permite categorizar dispositivos con imágenes representativas
  - 'generic' se usa cuando no se especifica un tipo
*/

-- Agregar columna device_type a devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE devices ADD COLUMN device_type text NOT NULL DEFAULT 'generic' 
    CHECK (device_type IN ('printer_laser', 'printer_label', 'clock', 'server', 'laptop', 'ups', 'modem', 'router', 'generic'));
  END IF;
END $$;