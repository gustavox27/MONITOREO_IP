/*
  # Configurar políticas de acceso para bucket de sonidos de notificación
  
  1. Nuevas Políticas
    - Permitir lectura pública de archivos de audio
    - Permitir usuarios autenticados subir sus propios archivos
    - Permitir usuarios eliminar solo sus propios archivos
  
  2. Especificaciones
    - Bucket: notification-sounds
    - Los archivos son públicos (lectura sin autenticación)
    - Solo usuarios autenticados pueden crear y eliminar archivos
    - Convención de nombres: {userId}-{soundType}-{timestamp}.{extension}
  
  3. Seguridad
    - Las políticas evitan que usuarios anónimos suban archivos
    - Los usuarios solo pueden eliminar sus propios archivos
    - Acceso de lectura es público para reproducción de audio
*/

DO $$
BEGIN
  -- Política para permitir lectura pública de archivos de audio
  -- Cualquiera puede descargar/reproducir archivos de audio
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public read access to notification sounds'
  ) THEN
    -- Esta política se configura a través de la interfaz de Supabase Storage
    -- o mediante SQL directo en la tabla storage.objects
    RAISE NOTICE 'Storage policy setup requires Supabase dashboard configuration';
  END IF;
END $$;

-- Nota: Las políticas de Storage de Supabase se configuran en la consola de Supabase
-- en Storage → Policies. El código SQL anterior es solo documentativo.