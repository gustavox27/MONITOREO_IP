/*
  # Agregar soporte de sonidos personalizados a notificaciones

  1. Nuevas Columnas
    - `use_custom_sounds` (boolean) - Habilitar sonidos personalizados
    - `custom_sound_online_url` (text) - URL del sonido para estado "En Línea"
    - `custom_sound_offline_url` (text) - URL del sonido para estado "Fuera de Línea"

  2. Campos Adicionales de Metadatos
    - `custom_sound_online_name` (text) - Nombre del archivo "En Línea"
    - `custom_sound_offline_name` (text) - Nombre del archivo "Fuera de Línea"
    - `custom_sound_online_duration` (numeric) - Duración en segundos
    - `custom_sound_offline_duration` (numeric) - Duración en segundos

  3. Seguridad
    - RLS ya habilitado en la tabla notification_preferences
    - Las políticas existentes controlan el acceso (solo el usuario puede ver/editar sus preferencias)

  4. Especificaciones de Usuario
    - Formatos soportados: MP3, WAV, OGG, WebM
    - Tamaño máximo: 5MB por archivo
    - Duración recomendada: 3-5 segundos (máximo 10 segundos)
    - Los archivos se almacenan en bucket de Supabase Storage "notification-sounds"
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'use_custom_sounds'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN use_custom_sounds boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'custom_sound_online_url'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN custom_sound_online_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'custom_sound_offline_url'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN custom_sound_offline_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'custom_sound_online_name'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN custom_sound_online_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'custom_sound_offline_name'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN custom_sound_offline_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'custom_sound_online_duration'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN custom_sound_online_duration numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences' AND column_name = 'custom_sound_offline_duration'
  ) THEN
    ALTER TABLE notification_preferences ADD COLUMN custom_sound_offline_duration numeric;
  END IF;
END $$;
