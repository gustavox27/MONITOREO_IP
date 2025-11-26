# Políticas de RLS para Supabase - Sistema de Audios Personalizados

## Resumen

Este documento contiene todas las políticas de Row Level Security (RLS) necesarias para que el sistema de audios personalizados funcione correctamente. Incluye políticas para:

1. Tabla `notification_preferences` (almacena preferencias de usuario)
2. Storage bucket `notification-sounds` (almacena archivos de audio)

---

## Tabla: notification_preferences

Esta tabla almacena las preferencias de notificaciones de cada usuario, incluyendo URLs de audios personalizados.

### Verificar que RLS está habilitado

```sql
-- Ejecutar en Supabase SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notification_preferences';

-- Debe mostrar: notification_preferences | true
```

Si no lo muestra, ejecuta:
```sql
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
```

### Política 1: SELECT (Lectura - Usuarios leen sus propias preferencias)

```sql
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

**Descripción:**
- Permite que usuarios autenticados lean SOLO sus propias preferencias
- `auth.uid()` retorna el ID del usuario autenticado
- `user_id` es la columna que almacena el ID del propietario

### Política 2: INSERT (Crear - Usuarios crean sus preferencias)

```sql
CREATE POLICY "Users can create their own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

**Descripción:**
- Permite que usuarios autenticados creen nuevas preferencias
- Solo pueden crear preferencias donde `user_id` = su propio ID
- `WITH CHECK` valida que no intenten poner `user_id` de otro usuario

### Política 3: UPDATE (Actualizar - Usuarios actualizan sus preferencias)

```sql
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Descripción:**
- Permite actualizar SOLO las preferencias propias
- `USING` verifica que la fila actual pertenece al usuario
- `WITH CHECK` verifica que la fila actualizada seguirá siendo del usuario

### Política 4: DELETE (Eliminar - Usuarios eliminan sus preferencias)

```sql
CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**Descripción:**
- Permite eliminar SOLO las preferencias propias
- No permite que un usuario elimine preferencias de otro

---

## Storage Bucket: notification-sounds

Este bucket almacena los archivos de audio personalizados subidos por los usuarios.

### Verificar que el bucket existe y es público

1. Ve a **Storage** en Supabase Console
2. Busca el bucket `notification-sounds`
3. Verifica que esté marcado como **PUBLIC**

Si no existe, crea uno nuevo:
1. Click en **Create a new bucket**
2. Nombre: `notification-sounds`
3. Selecciona **Public bucket**
4. Click en **Create bucket**

### Política 1: Lectura Pública (Cualquiera puede descargar archivos)

En **Storage → notification-sounds → Policies → Create Policy**

```
Policy Name: Public read access to notification sounds
Target roles: Public
Permissions: SELECT
Template: For public access
```

O en SQL:

```sql
-- Las políticas de Storage se configuran principalmente en la interfaz
-- Esta es una representación de lo que se debe permitir:

-- Permitir lectura pública de archivos
-- "Por defecto, si el bucket es público, los archivos son legibles"
```

### Política 2: Inserción por Usuarios Autenticados

En **Storage → notification-sounds → Policies → Create Policy**

```
Policy Name: Authenticated users can upload notification sounds
Target roles: authenticated
Permissions: INSERT, UPDATE
Template: For authenticated users
```

### Política 3: Eliminación de Archivos Propios

En **Storage → notification-sounds → Policies → Create Policy**

```
Policy Name: Users can delete their own notification sounds
Target roles: authenticated
Permissions: DELETE
Template: User own files
```

---

## Implementación Completa (Script SQL)

Para implementar todas las políticas de una vez, copia y ejecuta esto en **SQL Editor** de Supabase:

```sql
-- ============================================
-- NOTIFICATION_PREFERENCES TABLE POLICIES
-- ============================================

-- 1. Enable RLS if not already enabled
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (optional, para actualizar)
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can create their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON notification_preferences;

-- 3. Create SELECT policy (Read)
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create INSERT policy (Create)
CREATE POLICY "Users can create their own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Create UPDATE policy (Update)
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Create DELETE policy (Delete)
CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verificar que las políticas están activas:
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'notification_preferences'
ORDER BY policyname;

-- Verificar que RLS está habilitado:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notification_preferences';
```

---

## Testing de Políticas

### Test 1: Verificar que solo tu usuario ve sus preferencias

```sql
-- Como usuario autenticado, ejecuta:
SELECT * FROM notification_preferences WHERE user_id = auth.uid();

-- Resultado: Solo ves TUS preferencias (el que ejecuta la consulta)
```

### Test 2: Intentar ver preferencias de otro usuario (debería fallar)

```sql
-- Busca el user_id de otro usuario
SELECT * FROM notification_preferences WHERE user_id = 'otro-user-id';

-- Resultado: Vacío (no tienes permiso de leer otras preferencias)
```

### Test 3: Crear nuevas preferencias

```sql
INSERT INTO notification_preferences (
  user_id,
  enable_notifications,
  enable_sound,
  use_custom_sounds
) VALUES (
  auth.uid(),
  true,
  true,
  false
);

-- Resultado: Éxito (solo puedes crear para tu propio user_id)
```

### Test 4: Intentar crear preferencias para otro usuario (debería fallar)

```sql
INSERT INTO notification_preferences (
  user_id,
  enable_notifications,
  enable_sound
) VALUES (
  'otro-user-id',
  true,
  true
);

-- Resultado: Error de política (RLS bloqueado)
```

---

## Configuración de CORS para Storage

Aunque Storage de Supabase es principalmente público, asegúrate de que CORS esté bien configurado:

1. Ve a **Storage → notification-sounds**
2. Haz clic en el ícono de engranaje (Settings)
3. Localiza **CORS Configuration**
4. Verifica que esté configurado:

```json
{
  "Access-Control-Allow-Origin": ["*"],
  "Access-Control-Allow-Methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "Access-Control-Allow-Headers": ["Content-Type", "Authorization"],
  "Access-Control-Max-Age": 86400
}
```

Si necesitas configurarlo vía SQL, contacta con soporte de Supabase ya que CORS es principalmente una configuración de la interfaz.

---

## Columnas de Tabla notification_preferences

Asegúrate de que tu tabla tiene estas columnas:

| Columna | Tipo | Null | Default | Descripción |
|---------|------|------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | ID único |
| user_id | uuid | NO | - | ID del usuario (FK a auth.users) |
| enable_notifications | boolean | NO | true | Habilitar notificaciones |
| enable_sound | boolean | NO | true | Habilitar sonido |
| use_custom_sounds | boolean | NO | false | Usar audios personalizados |
| custom_sound_online_url | text | YES | NULL | URL del audio "En Línea" |
| custom_sound_offline_url | text | YES | NULL | URL del audio "Fuera de Línea" |
| custom_sound_online_name | text | YES | NULL | Nombre del archivo "En Línea" |
| custom_sound_offline_name | text | YES | NULL | Nombre del archivo "Fuera de Línea" |
| sound_volume | numeric | NO | 0.4 | Volumen (0.0 a 1.0) |
| notification_duration | integer | NO | 10000 | Duración en ms |
| enable_recurring_notifications | boolean | NO | false | Notificaciones recurrentes |
| recurring_interval | integer | NO | 30 | Intervalo en segundos |
| recurring_volume | numeric | NO | 0.25 | Volumen recurrente |
| created_at | timestamp | NO | now() | Fecha de creación |
| updated_at | timestamp | NO | now() | Fecha de actualización |

---

## Flujo de Seguridad Completo

```
┌─────────────────────────────────────────┐
│  Usuario Autenticado (auth.uid())       │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼─────────┐
        │ Sube Audio MP3 │
        └──────┬─────────┘
               │
        ┌──────▼──────────────────────────────────┐
        │ Validación en Frontend:                │
        │ - Formato (.mp3, .wav, .ogg, .webm)  │
        │ - Tamaño (< 5MB)                       │
        │ - Duración (≤ 10s)                     │
        └──────┬───────────────────────────────┬─┘
               │                               │
            VÁLIDO                        INVÁLIDO
               │                               │
        ┌──────▼─────────────────────────┐    │
        │ Upload a Storage Bucket        │    │
        │ notification-sounds            │    │
        │ (Bucket es PÚBLICO)            │    │
        └──────┬──────────────────────────┘    │
               │                                │
        ┌──────▼──────────────────────────┐   │
        │ Genera URL Pública:             │   │
        │ https://.../notification-sounds/│   │
        │ user-id-online-timestamp.mp3    │   │
        └──────┬──────────────────────────┘   │
               │                                │
        ┌──────▼──────────────────────────────┐│
        │ Guarda URL en notification_        ││
        │ preferences (RLS Protegido)       ││
        │ - Solo usuario puede acceder     ││
        │ - Solo usuario puede actualizar ││
        └──────┬──────────────────────────┐ ││
               │                           │ ││
            ✓ GUARDADO            ✗ RECHAZADO
               │                           │
        ┌──────▼────────────────┐  Mostrar
        │ Cuando cambia estado  │  Error
        │ de dispositivo:       │
        │ 1. Cargar prefs (RLS) │
        │ 2. Verificar URLs     │
        │ 3. Reproducir audio   │
        │ (acceso público OK)   │
        └─────────────────────┘
```

---

## Checklist de Configuración

Antes de considerar que todo está listo:

- [ ] Tabla `notification_preferences` existe
- [ ] RLS está **habilitado** en la tabla
- [ ] Política SELECT existe y está activa
- [ ] Política INSERT existe y está activa
- [ ] Política UPDATE existe y está activa
- [ ] Política DELETE existe y está activa
- [ ] Bucket `notification-sounds` existe
- [ ] Bucket está en modo **PÚBLICO**
- [ ] CORS está configurado en el bucket
- [ ] Todas las columnas de audio existen en la tabla
- [ ] Puedes crear una preferencia como usuario autenticado
- [ ] No puedes ver preferencias de otros usuarios
- [ ] Puedes subir archivos al bucket
- [ ] Los archivos subidos son públicamente legibles

---

## Soporte y Debugging

### Problema: "No permission to SELECT"

**Causa:** RLS está habilitado pero no hay políticas SELECT

**Solución:**
```sql
-- Crear la política SELECT
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### Problema: "Cannot insert row: permission denied"

**Causa:** La política INSERT valida que `user_id` sea del usuario actual

**Solución:**
- Asegúrate de que envías `user_id: auth.uid()` desde el frontend
- No intentes forzar un `user_id` diferente

### Problema: "Storage bucket not found"

**Causa:** El bucket no existe o está privado

**Solución:**
- Crea el bucket manualmente
- Asegúrate de marcarlo como PÚBLICO

### Problema: "CORS error when playing audio"

**Causa:** CORS no está configurado en el bucket

**Solución:**
- Ve a Storage → notification-sounds → Settings
- Configura CORS como se indica en este documento
