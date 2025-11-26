# Quick Fix - Audios Personalizados (5 Minutos)

## El Problema
✗ Audios se reproducen en botón "Probar" pero NO en notificaciones reales

## La Solución (3 PASOS)

### PASO 1: CORS Configuration (2 minutos)

```
1. https://app.supabase.com
2. Storage → notification-sounds → ⚙️ Settings
3. CORS Configuration → Pega esto:

{
  "Access-Control-Allow-Origin": ["*"],
  "Access-Control-Allow-Methods": ["GET","POST","PUT","DELETE","OPTIONS"],
  "Access-Control-Allow-Headers": ["Content-Type","Authorization"],
  "Access-Control-Max-Age": 86400
}

4. Save
```

### PASO 2: SQL Policies (2 minutos)

```
SQL Editor → Ejecuta esto:
```

```sql
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can create their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON notification_preferences;

CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences"
  ON notification_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

### PASO 3: Test (1 minuto)

```
1. Recarga la app (Ctrl+F5)
2. Abre F12 → Console
3. Sube audio personalizado
4. Busca: [Audio Validation] File validation successful
5. Guarda cambios
6. Cambia estado de dispositivo
7. Escucha el audio personalizado
```

## Verificación

✓ En console deberías ver:
```
[Custom Sound] Audio playback started successfully
```

✓ Si ves error CORS:
```
[Custom Sound] Error details - Code: MEDIA_ERR_CORS_NOT_ALLOWED
→ Vuelve a PASO 1, verifica CORS configuration
```

## Listo

Los audios personalizados ahora se reproducen en las notificaciones reales.
