# Configuración de Supabase Storage para Sonidos Personalizados

## Problema Original

Los archivos de audio se suben correctamente y se reproducen en la prueba (test), pero NO se reproducen en las notificaciones reales. Esto se debe a que falta configurar las políticas de acceso CORS en Supabase Storage.

---

## Paso 1: Verificar la Configuración del Bucket

1. Ve a tu proyecto Supabase en `https://app.supabase.com`
2. Selecciona **Storage** en el menú izquierdo
3. Verifica que exista el bucket **`notification-sounds`**
4. El bucket debe estar en modo **PÚBLICO**

---

## Paso 2: Configurar CORS en Supabase Storage

### Opción A: Usar la Consola de Supabase (RECOMENDADO)

1. En Storage → notification-sounds bucket
2. Haz clic en **Settings** (ícono de engranaje)
3. Localiza la sección **CORS Configuration**
4. Configura los siguientes headers:

```json
{
  "Access-Control-Allow-Origin": ["*"],
  "Access-Control-Allow-Methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "Access-Control-Allow-Headers": ["Content-Type", "Authorization"],
  "Access-Control-Max-Age": 86400
}
```

5. Guarda los cambios

### Opción B: Configurar via SQL (si la interfaz no lo permite)

Este comando se ejecutaría en la consola SQL de Supabase:

```sql
-- Nota: Las políticas de CORS en Storage se configuran principalmente
-- a través de la interfaz gráfica de Supabase.
-- Este es un documento de referencia.
```

---

## Paso 3: Crear Políticas de RLS en la Base de Datos

Las políticas de acceso a la tabla `notification_preferences` están configuradas, pero confirmemos que existan:

### Política para Lectura (SELECT)
```sql
CREATE POLICY "Users can read own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Política para Inserción (INSERT)
```sql
CREATE POLICY "Users can create their own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### Política para Actualización (UPDATE)
```sql
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Paso 4: Verificar la Accesibilidad de URLs de Audio

### Test Manual en la Consola del Navegador

Ejecuta esto en la consola del navegador (F12 → Console):

```javascript
// Reemplaza URL_DEL_AUDIO con una URL de tu audio subido
const testAudio = new Audio();
testAudio.crossOrigin = 'anonymous';

testAudio.oncanplay = () => {
  console.log('✓ Audio cargado exitosamente');
  console.log('Duración:', testAudio.duration + 's');
  console.log('ReadyState:', testAudio.readyState);
};

testAudio.onerror = () => {
  console.error('✗ Error cargando audio');
  console.error('Error code:', testAudio.error?.code);
  console.error('Error message:', testAudio.error?.message);
  console.error('Network state:', testAudio.networkState);
};

testAudio.src = 'https://vwqwvsblxfefodncvlws.supabase.co/storage/v1/object/public/notification-sounds/TU_ARCHIVO.mp3';
testAudio.load();
```

---

## Paso 5: Verificar Que Todo Funciona

### Checklist de Validación

- [ ] El bucket `notification-sounds` existe y está en modo PÚBLICO
- [ ] CORS está configurado para permitir GET desde cualquier origen
- [ ] Cargaste al menos un archivo de audio personalizad desde la UI
- [ ] El archivo se muestra con un nombre en la interfaz
- [ ] El botón "Probar" reproduce el audio correctamente
- [ ] Guardaste los cambios de preferencias
- [ ] La consola muestra logs de validación exitosa al cargar preferencias

### Verificar en Logs de Consola

Abre la consola (F12) y busca estos logs:

```
[Audio Validation] File validation successful
[Audio Upload] Public URL generated: https://...
[Audio Validation] URL validation successful (canplay event): https://...
[MonitoringView] Preferences loaded successfully
[NotificationCenter] Custom audio playback started successfully
```

---

## Paso 6: Solución de Problemas

### Problema: "CORS error" en consola

**Solución:**
1. Verifica que CORS esté configurado en el bucket
2. Asegúrate de que el bucket está en modo PÚBLICO
3. Recarga la página (Ctrl+F5)

### Problema: "Error loading audio" pero test play funciona

**Causa:** Las notificaciones usan un contexto de seguridad diferente

**Solución:**
1. Confirma que `use_custom_sounds` está guardado como `true` en la BD
2. Verifica que las URLs están completas y correctas
3. Revisa los logs en la consola en la sección `[Custom Sound]`

### Problema: Audio se reproduce en test pero no en notificación real

**Causa:** El contexto de la página es diferente cuando hay cambios de estado

**Solución:**
1. Asegúrate de que el navegador tiene permisos de notificaciones
2. Verifica que `enable_sound` está activado en preferencias
3. Comprueba que el archivo no tiene protección CORS restrictiva

---

## Configuración de Políticas de Almacenamiento Supabase

Si necesitas controlar acceso más específicamente (usuarios solo pueden ver sus archivos):

### Política para Lectura (Anonymous)
```sql
-- Permite lectura pública de archivos de audio
-- Ya que están en una carpeta pública del bucket
```

### Política para Escritura (Authenticated Users)
```sql
-- Solo usuarios autenticados pueden subir archivos
-- Configurar en la interfaz de Storage Policies
```

---

## URLs Correctas para Audios

Formato de URL de Supabase Storage:

```
https://{PROJECT_ID}.supabase.co/storage/v1/object/public/{BUCKET}/{FILENAME}
```

Ejemplo:
```
https://vwqwvsblxfefodncvlws.supabase.co/storage/v1/object/public/notification-sounds/user-id-online-1732576800000.mp3
```

---

## Logs de Depuración Disponibles

El sistema ahora registra información detallada en la consola:

### Audio Validation
- `[Audio Validation] Starting file validation...`
- `[Audio Validation] Audio duration detected: X.XXs`
- `[Audio Validation] File validation successful`

### Audio Upload
- `[Audio Upload] Starting upload...`
- `[Audio Upload] File uploaded successfully`
- `[Audio Upload] Public URL generated: https://...`

### Custom Sound Playback
- `[Custom Sound] Attempting to play custom audio from: https://...`
- `[Custom Sound] Error loading custom audio...`
- `[Custom Sound] CORS or access issue detected`

### Notification Center
- `[NotificationCenter] Sound request: status=offline, isCustom=true`
- `[NotificationCenter] Custom audio playback started successfully`
- `[NotificationCenter] Custom audio failed to load`

---

## Próximos Pasos

1. **Configurar CORS** siguiendo el Paso 2
2. **Verificar accesibilidad** con el test manual del Paso 4
3. **Confirmar todo funciona** con el checklist del Paso 5
4. **Revisar logs** si hay problemas
5. **Prueba completa** con un cambio real de estado de dispositivo

---

## Contacto / Soporte

Si experimentas problemas después de seguir estos pasos:

1. Abre la consola del navegador (F12)
2. Copia todos los logs que comienzan con `[Audio]`, `[Custom Sound]`, `[NotificationCenter]`
3. Proporciona esta información junto con la descripción del problema
