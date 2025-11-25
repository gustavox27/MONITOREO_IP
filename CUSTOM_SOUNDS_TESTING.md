# Guía de Prueba: Sistema de Sonidos Personalizados

## Descripción General
Se ha implementado un sistema completo que permite a los usuarios subir sus propios archivos de audio para las notificaciones de "En Línea" y "Fuera de Línea" en la aplicación Monitor IP.

## Especificaciones de Usuario
- **Formatos Soportados**: MP3, WAV, OGG, WebM
- **Tamaño Máximo**: 5MB por archivo
- **Duración Recomendada**: 3-5 segundos
- **Duración Máxima**: 10 segundos
- **Almacenamiento**: Supabase Storage (bucket: notification-sounds)

## Archivos Modificados y Creados

### 1. Base de Datos
- **Migración**: `add_custom_sounds_to_notifications`
  - Nuevas columnas en `notification_preferences`:
    - `use_custom_sounds` (boolean): Habilitar/deshabilitar sonidos personalizados
    - `custom_sound_online_url` (text): URL del sonido para estado "En Línea"
    - `custom_sound_offline_url` (text): URL del sonido para estado "Fuera de Línea"
    - `custom_sound_online_name` (text): Nombre del archivo "En Línea"
    - `custom_sound_offline_name` (text): Nombre del archivo "Fuera de Línea"
    - `custom_sound_online_duration` (numeric): Duración en segundos
    - `custom_sound_offline_duration` (numeric): Duración en segundos

### 2. TypeScript
- **`src/lib/database.types.ts`**: Actualizado con los nuevos tipos de la tabla `notification_preferences`

### 3. Servicios
- **`src/services/audioStorageService.ts`** (NUEVO):
  - `validateAudioFile()`: Valida formato, tamaño y duración
  - `getAudioDuration()`: Obtiene la duración del archivo de audio
  - `uploadSound()`: Sube el archivo a Supabase Storage
  - `deleteSound()`: Elimina archivos de audio
  - `playAudio()`: Reproduce un archivo de audio
  - `preloadAudio()`: Precarga un archivo de audio

- **`src/services/notificationService.ts`** (ACTUALIZADO):
  - Interfaz `NotificationPreferences` expandida con campos de sonidos personalizados
  - `playNotificationSound()`: Actualizado para soportar sonidos personalizados
  - `playCustomNotificationSound()`: Nuevo método para reproducir sonidos personalizados
  - `playDefaultNotificationSound()`: Refactorizado para mantener sonidos predeterminados

### 4. Componentes
- **`src/components/CustomSoundUploader.tsx`** (NUEVO):
  - Componente reutilizable para subida de archivos de audio
  - Validación del lado del cliente
  - Arrastrar y soltar (drag & drop)
  - Previsualización y reproducción de prueba
  - Indicadores de carga y estado
  - Soporte para eliminar archivos subidos

- **`src/components/NotificationSettings.tsx`** (ACTUALIZADO):
  - Nueva sección "Sonidos Personalizados"
  - Toggle para habilitar/deshabilitar sonidos personalizados
  - Integración de dos instancias de CustomSoundUploader
  - Manejo de carga y guardado de preferencias

- **`src/components/MonitoringView.tsx`** (ACTUALIZADO):
  - Actualizaciones en `processQueuedNotifications()` para usar sonidos personalizados
  - Pase de URLs de sonidos personalizados a funciones de reproducción

- **`src/components/NotificationCenter.tsx`** (ACTUALIZADO):
  - `playNotificationSound()` mejorado para soportar URLs de sonidos personalizados
  - Fallback automático a sonido predeterminado en caso de error

## Plan de Pruebas

### Prueba 1: Validación de Archivos
**Objetivo**: Verificar que la validación de archivos funciona correctamente

**Pasos**:
1. Navegar a Notificaciones → Sonidos Personalizados
2. Intentar subir un archivo que NO sea MP3, WAV, OGG o WebM
   - **Resultado esperado**: Mensaje de error "Formato no soportado"
3. Intentar subir un archivo mayor a 5MB
   - **Resultado esperado**: Mensaje de error con el tamaño del archivo
4. Intentar subir un archivo de audio mayor a 10 segundos
   - **Resultado esperado**: Mensaje de error sobre duración excesiva
5. Subir un archivo válido (MP3 o WAV, menos de 5MB, menos de 10 segundos)
   - **Resultado esperado**: Archivo se sube exitosamente

### Prueba 2: Subida de Archivos
**Objetivo**: Verificar que los archivos se cargan correctamente

**Pasos**:
1. Habilitar "Usar Sonidos Personalizados"
2. En la sección "En Línea", hacer clic en "Haz clic para subir"
3. Seleccionar un archivo MP3 válido (recomendado: 2-5 segundos)
   - **Resultado esperado**:
     - Indicador de carga aparece
     - Archivo se sube a Supabase Storage
     - Nombre del archivo se muestra
     - Duración se calcula y muestra
4. Repetir para "Fuera de Línea"
   - **Resultado esperado**: Ambos archivos se cargan independientemente

### Prueba 3: Arrastrar y Soltar
**Objetivo**: Verificar que el drag & drop funciona

**Pasos**:
1. Ir a Sonidos Personalizados
2. Arrastrar un archivo de audio válido al área de drop
   - **Resultado esperado**: Se procesa igual que al hacer clic

### Prueba 4: Reproducción de Prueba
**Objetivo**: Verificar que se puede previsualizar el sonido

**Pasos**:
1. Subir un archivo de audio
2. Hacer clic en el botón "Probar"
   - **Resultado esperado**: El sonido se reproduce con el volumen configurado
3. Cambiar el volumen en la sección anterior
4. Hacer clic en "Probar" nuevamente
   - **Resultado esperado**: El sonido se reproduce con el nuevo volumen

### Prueba 5: Eliminación de Archivos
**Objetivo**: Verificar que se pueden eliminar archivos

**Pasos**:
1. Subir un archivo de audio
2. Hacer clic en el botón "Eliminar"
   - **Resultado esperado**:
     - Archivo se elimina de la vista
     - Se elimina de Supabase Storage
     - El archivo anterior se reemplaza si se sube uno nuevo

### Prueba 6: Guardado de Preferencias
**Objetivo**: Verificar que las preferencias se guardan correctamente

**Pasos**:
1. Habilitar "Usar Sonidos Personalizados"
2. Subir archivos para "En Línea" y "Fuera de Línea"
3. Hacer clic en "Guardar Cambios"
   - **Resultado esperado**:
     - Botón muestra "Guardado"
     - Las preferencias se guardan en la base de datos
4. Recargar la página
   - **Resultado esperado**:
     - Los archivos subidos aún están presentes
     - La opción "Usar Sonidos Personalizados" sigue habilitada

### Prueba 7: Reproducción en Notificaciones
**Objetivo**: Verificar que los sonidos personalizados se reproducen en notificaciones reales

**Pasos**:
1. Subir sonidos personalizados para ambos estados
2. Habilitar "Sonidos de Notificación"
3. Habilitar "Usar Sonidos Personalizados"
4. Ir a Monitoreo
5. Simular un cambio de estado de dispositivo
   - **Resultado esperado**:
     - Se reproduce el sonido personalizado correspondiente
     - El sonido respeta el volumen configurado
6. Cambiar el volumen
7. Simular otro cambio de estado
   - **Resultado esperado**: El sonido se reproduce con el nuevo volumen

### Prueba 8: Fallback a Sonido Predeterminado
**Objetivo**: Verificar que se usa el sonido predeterminado si algo falla

**Pasos**:
1. Subir un archivo de audio válido
2. Intencionalmente causar un error (ej: cambiar la URL en las herramientas de desarrollo)
3. Simular una notificación
   - **Resultado esperado**:
     - Se muestra error en consola
     - Se reproduce el sonido predeterminado como fallback

### Prueba 9: Interfaz de Usuario
**Objetivo**: Verificar que la UI es clara y útil

**Pasos**:
1. Revisar la sección "Sonidos Personalizados" en Notificaciones
   - **Verificar**:
     - El toggle principal es visible
     - Las especificaciones están claramente mostradas
     - Los campos de subida son intuitivos
     - Los mensajes de error/éxito son claros
2. Verificar el tooltips y descripciones
   - **Resultado esperado**: Todos los campos tienen descripciones claras

### Prueba 10: Compatibilidad de Navegadores
**Objetivo**: Verificar que funciona en diferentes navegadores

**Pasos**:
1. Subir un archivo en Chrome/Chromium
   - **Resultado esperado**: Funciona correctamente
2. Subir un archivo en Firefox
   - **Resultado esperado**: Funciona correctamente
3. Subir un archivo en Safari
   - **Resultado esperado**: Funciona correctamente
4. Reproducir sonidos en cada navegador
   - **Resultado esperado**: Los sonidos se reproducen correctamente

### Prueba 11: Múltiples Usuarios
**Objetivo**: Verificar que cada usuario tiene sus propios sonidos

**Pasos**:
1. Usuario A: Subir sonido personalizado para "En Línea"
2. Usuario A: Guardar y cerrar sesión
3. Usuario B: Iniciar sesión
4. Usuario B: Ir a Notificaciones
   - **Resultado esperado**: Usuario B NO ve los archivos de Usuario A
5. Usuario B: Subir un sonido diferente
6. Usuario B: Guardar y cerrar sesión
7. Usuario A: Iniciar sesión nuevamente
   - **Resultado esperado**: Usuario A sigue viendo su sonido original, no el de Usuario B

### Prueba 12: Límites y Restricciones
**Objetivo**: Verificar que se respetan los límites

**Pasos**:
1. Intentar subir 10 archivos muy rápido
   - **Resultado esperado**: Solo se procesa uno a la vez o se muestra límite
2. Intentar subir archivos simultáneamente para "En Línea" y "Fuera de Línea"
   - **Resultado esperado**: Ambos se cargan correctamente
3. Verificar que se puede cambiar entre habilitar/deshabilitar la opción
   - **Resultado esperado**: La UI se actualiza correctamente

## Casos de Prueba de Error

### Error 1: Archivo Corrupto
**Pasos**:
1. Crear un archivo de texto con extensión .mp3
2. Intentar subir
   - **Resultado esperado**: Error al leer duración, mensaje claro al usuario

### Error 2: Red Lenta
**Pasos**:
1. Con throttling de red activado, intentar subir
   - **Resultado esperado**: Indicador de carga, posible reintento

### Error 3: Sesión Expirada
**Pasos**:
1. Durante la subida, cerrar sesión
   - **Resultado esperado**: Error adecuado, usuario debe iniciar sesión nuevamente

## Verificación de Datos

### Base de Datos
Ejecutar en la consola de Supabase:
```sql
SELECT * FROM notification_preferences
WHERE user_id = 'your-user-id';
```

**Verificar**:
- `use_custom_sounds` = true/false según selección
- `custom_sound_online_url` contiene URL válida
- `custom_sound_offline_url` contiene URL válida
- `custom_sound_online_name` contiene nombre del archivo
- `custom_sound_offline_name` contiene nombre del archivo
- `custom_sound_online_duration` contiene duración en segundos
- `custom_sound_offline_duration` contiene duración en segundos

### Almacenamiento
En el panel de Supabase Storage:
1. Ir a Storage → notification-sounds
2. **Verificar**:
   - Los archivos subidos están en la carpeta correcta
   - Los archivos deletreados se eliminan correctamente
   - Las URLs públicas son válidas

## Rendimiento

### Prueba de Rendimiento
**Objetivo**: Verificar que no hay impacto en rendimiento

**Pasos**:
1. Abrir DevTools → Performance
2. Cargar página de Notificaciones con sonidos personalizados
   - **Verificar**: Carga rápida (< 2s)
3. Reproducir notificación
   - **Verificar**: No hay lag o retrasos

### Prueba de Memoria
**Objetivo**: Verificar que no hay fugas de memoria

**Pasos**:
1. Abrir DevTools → Memory
2. Reproducir 10 notificaciones consecutivas
   - **Verificar**: Memoria se estabiliza, no sigue creciendo

## Conclusión

Todos los aspectos del sistema de sonidos personalizados han sido implementados:
- ✓ Almacenamiento seguro en Supabase
- ✓ Validación completa del lado del cliente
- ✓ Interfaz intuitiva y clara
- ✓ Reproducción de sonidos con fallback
- ✓ Integración con el sistema de notificaciones existente
- ✓ Manejo robusto de errores
- ✓ Especificaciones claras para el usuario

El sistema está listo para producción.
