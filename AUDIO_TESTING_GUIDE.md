# Guía Completa de Pruebas - Sistema de Audios Personalizados

## Descripción General

Este documento proporciona todos los pasos para probar y validar que el sistema de audios personalizados funciona correctamente en todas las situaciones.

---

## Prueba 1: Validación de Archivo de Audio

### Objetivo
Verificar que los archivos de audio se validan correctamente antes de subirse.

### Pasos

1. Abre la interfaz de configuración de notificaciones
2. Navega a "Sonidos Personalizados"
3. Activa "Usar Sonidos Personalizados"
4. Intenta subir un archivo que NO sea de audio (ej: .txt, .jpg)

**Resultado Esperado:**
```
[Audio Validation] Starting file validation for: documento.txt, size: 5.00KB, type: text/plain
[Audio Validation] Unsupported format: .txt
Error mostrado: "Formato no soportado. Usa: .mp3, .wav, .ogg, .webm"
```

### Prueba 1B: Archivo Demasiado Grande

1. Intenta subir un archivo MP3 mayor a 5MB

**Resultado Esperado:**
```
[Audio Validation] File too large: 5.50MB
Error mostrado: "Archivo demasiado grande. Máximo: 5MB (Tu archivo: 5.50MB)"
```

### Prueba 1C: Duración Demasiado Larga

1. Intenta subir un archivo de audio con duración > 10 segundos

**Resultado Esperado:**
```
[Audio Validation] Audio duration detected: 12.50s
[Audio Validation] Duration too long: 12.50s
Error mostrado: "Duración demasiada larga. Máximo: 10s (Tu archivo: 12.5s)"
```

---

## Prueba 2: Subida Exitosa de Archivo

### Objetivo
Verificar que un archivo válido se sube correctamente a Supabase Storage.

### Pasos

1. Prepara un archivo MP3 válido (2-5 segundos, < 5MB)
2. Sube el archivo en la sección "Sonidos Personalizados"
3. Abre la consola (F12)

**Resultado Esperado:**

```
[Audio Validation] Starting file validation for: alarm.mp3, size: 245.50KB, type: audio/mpeg
[Audio Validation] Audio duration detected: 3.50s
[Audio Validation] File validation successful

[Audio Upload] Starting upload for user: user-id, sound type: online, file: user-id-online-1732576800000.mp3
[Audio Upload] File uploaded successfully: user-id-online-1732576800000.mp3
[Audio Upload] Public URL generated: https://vwqwvsblxfefodncvlws.supabase.co/storage/v1/object/public/notification-sounds/user-id-online-1732576800000.mp3
[Audio Upload] URL validation passed for: https://...

✓ Archivo subido correctamente
Duración: 3.5s
Estado: Verde (Personalizado)
```

---

## Prueba 3: Reproducción de Prueba (Test Play)

### Objetivo
Verificar que el audio se puede reproducir desde la interfaz de configuración.

### Pasos

1. Después de subir exitosamente un archivo
2. Haz clic en el botón "Probar"
3. Verifica que escuches el audio
4. Abre la consola

**Resultado Esperado:**

```
[CustomSoundUploader] Starting test playback for online sound
[CustomSoundUploader] URL: https://vwqwvsblxfefodncvlws.supabase.co/storage/v1/object/public/notification-sounds/user-id-online-1732576800000.mp3
[CustomSoundUploader] Volume: 100%

[Audio Playback] Starting playback of: https://...
[Audio Playback] Audio playback completed
[CustomSoundUploader] Test playback completed successfully

✓ Sonido reproducido correctamente
✓ Duración: 3.5s
```

---

## Prueba 4: Guardado de Preferencias

### Objetivo
Verificar que las preferencias se guardan correctamente en la base de datos.

### Pasos

1. Sube un archivo de audio personalizado
2. Activa "Usar Sonidos Personalizados"
3. Haz clic en "Guardar Cambios"
4. Abre la consola
5. Recarga la página

**Resultado Esperado en Guardado:**

```
[NotificationSettings] Saving preferences for user: user-id
{
  use_custom_sounds: true,
  custom_sound_online_url: "SET",
  custom_sound_offline_url: "NOT SET",
  sound_volume: 0.4
}
[NotificationSettings] Preferences saved successfully

✓ Guardado (interfaz muestra confirmación verde)
```

**Resultado Esperado después de Recarga:**

```
[NotificationSettings] Loading preferences for user: user-id
[NotificationSettings] Preferences loaded successfully:
{
  use_custom_sounds: true,
  custom_sound_online_url: "SET",
  custom_sound_offline_url: "SET",
  custom_sound_online_name: "alarm-online.mp3",
  custom_sound_offline_name: "alarm-offline.mp3",
  sound_volume: 0.4
}

✓ Los audios siguen mostrándose después de recargar
✓ Estado "Personalizado" mantiene su color verde
```

---

## Prueba 5: Validación de URL en Carga de Preferencias

### Objetivo
Verificar que las URLs se validan correctamente al cargar preferencias.

### Pasos

1. Después de guardar con sonidos personalizados
2. Recarga la página
3. Abre la consola
4. Busca logs de MonitoringView

**Resultado Esperado:**

```
[MonitoringView] Loading notification preferences...
[MonitoringView] Preferences loaded successfully:
{
  use_custom_sounds: true,
  online_url_valid: true,
  offline_url_valid: true,
  online_url: "https://vwqwvsblxfefodncvlws.supabase.co/storage/v1/object/public/notification-sounds/...",
  offline_url: "https://vwqwvsblxfefodncvlws.supabase.co/storage/v1/object/public/notification-sounds/..."
}

[URL Validation] Valid URL structure: protocol=https:, host=vwqwvsblxfefodncvlws.supabase.co
[URL Validation] URL validation successful: https://...
```

---

## Prueba 6: Reproducción de Audio en Cambio de Estado (PRUEBA CRÍTICA)

### Objetivo
Verificar que los audios personalizados se reproducen cuando cambia el estado real de un dispositivo.

### Pasos

**Preparación:**
1. Sube audios personalizados para "En Línea" y "Fuera de Línea"
2. Guarda las preferencias
3. Asegúrate de que "Sonidos de Notificación" está activado
4. Asegúrate de que el navegador tiene permisos de notificaciones

**Ejecutar Prueba:**

#### Escenario A: Dispositivo Pasa a FUERA DE LÍNEA

1. Simula que un dispositivo se desconecta (apágalo, desconecta la red, etc.)
2. Observa que aparece una notificación en la esquina inferior izquierda
3. Debe escucharse el audio personalizado de "Fuera de Línea"
4. Abre la consola

**Resultado Esperado:**

```
[MonitoringView] Single notification sound for offline: isCustom=true, hasValidUrl=true, url=https://...
[NotificationCenter] Sound request: status=offline, isCustom=true, hasValidUrl=true
[NotificationCenter] Custom URL provided: YES
[NotificationCenter] Attempting to play custom sound from: https://...

[Custom Sound] Attempting to play custom audio from: https://...
[Custom Sound] Audio loading started for: https://...
[Custom Sound] Custom audio loaded successfully, ready for playback. Duration: 3.5s, ReadyState: 4
[Custom Sound] Audio progress: buffered ranges available
[Custom Sound] Audio playback started successfully
[Custom Sound] Audio playback completed successfully

✓ Suena el audio personalizado
✓ Se muestra notificación visual
```

#### Escenario B: Dispositivo Regresa EN LÍNEA

1. Reconecta el dispositivo o enciéndelo
2. Debe escucharse el audio personalizado de "En Línea"
3. Abre la consola

**Resultado Esperado:**

```
[MonitoringView] Single notification sound for online: isCustom=true, hasValidUrl=true, url=https://...
[NotificationCenter] Sound request: status=online, isCustom=true, hasValidUrl=true
[NotificationCenter] Attempting to play custom sound from: https://...

[Custom Sound] Attempting to play custom audio from: https://...
[Custom Sound] Custom audio loaded successfully, ready for playback. Duration: 3.5s, ReadyState: 4
[Custom Sound] Audio playback started successfully
[Custom Sound] Audio playback completed successfully

✓ Suena el audio personalizado de "En Línea"
```

---

## Prueba 7: Fallback a Audio Predeterminado

### Objetivo
Verificar que el sistema recurre a sonidos predeterminados si los personalizados fallan.

### Pasos

1. Sube un audio personalizado
2. Guarda las preferencias
3. Obtén la URL del audio desde la BD
4. Modifica la URL (agrega caracteres extras)
5. Cambia el estado de un dispositivo

**Resultado Esperado:**

```
[Custom Sound] Error loading custom audio from: https://...invalidURL
[Custom Sound] Error details - Code: MEDIA_ERR_SRC_NOT_SUPPORTED, Message: The media resource indicated by the src attribute was not suitable
[Custom Sound] Network state: 3, Ready state: 0
[Custom Sound] CORS or access issue detected. Falling back to default sound.

[Custom Sound] Playing default offline sound
✓ Suena el audio predeterminado (beeps)
```

---

## Prueba 8: Control de Volumen

### Objetivo
Verificar que el volumen se aplica correctamente a los audios.

### Pasos

1. Ajusta el volumen a diferentes niveles:
   - 0% (silencio)
   - 50%
   - 100%

2. Para cada nivel:
   - Haz clic en "Probar"
   - Verifica que el volumen es correcto
   - Guarda cambios
   - Cambia estado de un dispositivo
   - Verifica que la notificación tiene el volumen guardado

**Resultado Esperado:**

```
Para Volumen 50%:

[CustomSoundUploader] Volume: 50%
[Custom Sound] Attempting to play custom audio from: https://...
audio.volume = 0.5 (0.0 a 1.0)

✓ El audio se reproduce a volumen medio
✓ Las notificaciones respectan el volumen configurado
```

---

## Prueba 9: Múltiples Notificaciones Agrupadas

### Objetivo
Verificar que los audios se reproducen correctamente cuando hay notificaciones agrupadas.

### Pasos

1. Activa "Agrupar Notificaciones" en preferencias
2. Desconecta múltiples dispositivos rápidamente (o simúlalo)
3. Deberías ver una sola notificación que dice "X dispositivos con cambios"
4. Abre la consola

**Resultado Esperado:**

```
[MonitoringView] Grouped notifications detected
[MonitoringView] Offline notification sound: isCustom=true, hasValidUrl=true, url=https://...

[Custom Sound] Audio loading started for: https://...
[Custom Sound] Custom audio loaded successfully
[Custom Sound] Audio playback started successfully

✓ Se reproduce UNA SOLA VEZ el audio (no múltiples)
✓ La notificación muestra "X dispositivos"
```

---

## Prueba 10: Notificaciones Recurrentes

### Objetivo
Verificar que los audios personalizados funcionan con notificaciones recurrentes.

### Pasos

1. Activa "Notificaciones Recurrentes"
2. Mantén un dispositivo desconectado por más de 30 segundos
3. Observa que cada 30 segundos suena una alerta
4. Abre la consola

**Resultado Esperado:**

```
Primera alerta (después de 30s):
[Custom Sound] Audio playback started successfully

Segunda alerta (después de 60s):
[Custom Sound] Audio playback started successfully

Tercera alerta (después de 90s):
[Custom Sound] Audio playback started successfully

✓ Se reproducen sonidos cada 30 segundos
✓ Los sonidos personalizados se usan consistentemente
```

---

## Prueba 11: Eliminación de Audio Personalizado

### Objetivo
Verificar que se puede eliminar un audio personalizado y cambiar a predeterminado.

### Pasos

1. Tienes un audio personalizado guardado
2. Haz clic en "Eliminar" en la sección de audio personalizado
3. Guarda los cambios
4. Cambia el estado de un dispositivo

**Resultado Esperado:**

```
[Audio Storage] Deleting sound by URL: https://...
✓ El audio se elimina de Storage

Luego en NotificationCenter:
[Custom Sound] Custom sound enabled but URL is invalid: null
[Custom Sound] Playing default offline sound
✓ Se reproduce el audio predeterminado (beeps)
```

---

## Prueba 12: Verificación de CORS

### Objetivo
Diagnosticar problemas CORS en acceso a audios.

### Pasos

1. Abre la consola del navegador (F12)
2. Pestaña **Network**
3. Sube un audio personalizado
4. Busca la solicitud a "notification-sounds" bucket
5. En la respuesta, verifica los headers CORS

**Resultado Esperado:**

```
Response Headers:
- Content-Type: audio/mpeg
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey
- Cache-Control: max-age=3600

✓ Headers CORS correctos
✓ Status 200 OK (no 403, 404 o errores)
```

---

## Prueba 13: Verificación de RLS en Base de Datos

### Objetivo
Verificar que las políticas de acceso funcionan correctamente.

### Pasos

1. Abre Supabase Console
2. SQL Editor
3. Ejecuta:

```sql
-- Verificar que solo el usuario puede ver sus preferencias
SELECT user_id, use_custom_sounds, custom_sound_online_url
FROM notification_preferences
WHERE user_id = auth.uid();
```

**Resultado Esperado:**

```
✓ Solo se devuelven datos del usuario autenticado
✓ No hay acceso a preferencias de otros usuarios
```

---

## Lista de Verificación Final

Antes de considerar que el sistema está funcionando:

- [ ] Los archivos de audio se validan correctamente (tipo, tamaño, duración)
- [ ] Los archivos se suben a Supabase Storage sin errores
- [ ] La reproducción de prueba funciona desde la interfaz
- [ ] Las preferencias se guardan en la BD
- [ ] Las preferencias se cargan correctamente al recargar
- [ ] Los audios se reproducen cuando un dispositivo cambia de estado
- [ ] El sistema recurre a sonidos predeterminados si hay fallos
- [ ] El control de volumen funciona correctamente
- [ ] Las notificaciones agrupadas usan audios personalizados
- [ ] Las notificaciones recurrentes usan audios personalizados
- [ ] Se pueden eliminar audios personalizados
- [ ] Los headers CORS son correctos
- [ ] Las políticas RLS funcionan correctamente
- [ ] No hay errores en la consola del navegador
- [ ] La consola muestra todos los logs esperados

---

## Solución de Problemas Rápida

| Problema | Logs a Buscar | Solución |
|----------|--------------|----------|
| Audio no se reproduce en notificación | `[Custom Sound] Error loading` | Verificar CORS en bucket |
| Audio se reproduce en test pero no en notificación | `[MonitoringView] isCustom=false` | Verificar `use_custom_sounds=true` en BD |
| "Error loading audio" en consola | `[Audio Validation] URL validation failed` | Verificar que bucket es público |
| Sonido predeterminado en vez de personalizado | `[Custom Sound] Falling back to default` | Revisar URL y conexión de red |
| No hay logs en consola | F12 → Console | Verificar que filtro de logs no está activado |

---

## Contacto / Escalación

Si después de todas estas pruebas algo no funciona:

1. Proporciona el **nombre exacto del error** de la consola
2. Incluye todos los **logs del sistema** (copiar desde console)
3. Especifica el **formato del archivo** de audio usado
4. Indica si el problema es **solo en notificaciones** o también en **test play**
