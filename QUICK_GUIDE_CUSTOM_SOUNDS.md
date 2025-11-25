# Guía Rápida: Sonidos Personalizados

## Para Usuarios Finales

### Cómo Usar Sonidos Personalizados

1. **Acceder a Configuración**
   - Haz clic en "Notificaciones" en la navegación principal
   - Desplázate a la sección "Sonidos Personalizados"

2. **Habilitar la Opción**
   - Marca la casilla "Usar Sonidos Personalizados"

3. **Subir Archivos**
   - Para "En Línea": Arrastra un archivo MP3/WAV/OGG/WebM o haz clic para seleccionar
   - Para "Fuera de Línea": Igual proceso
   - Espera a que se suba (máximo 5 segundos)

4. **Probar el Sonido**
   - Haz clic en el botón "Probar" para escucharlo con tu volumen actual
   - Si no suena bien, puedes ajustar el volumen y probar de nuevo

5. **Guardar**
   - Haz clic en "Guardar Cambios" al final de la página
   - Verás una confirmación de que se guardó

### Especificaciones

| Especificación | Detalles |
|---|---|
| **Formatos** | MP3, WAV, OGG, WebM |
| **Tamaño máximo** | 5MB por archivo |
| **Duración** | 3-5 segundos recomendado (máximo 10s) |
| **Volumen** | Respeta tu configuración de volumen |
| **Disponibilidad** | Funciona cuando estés en la app o con notificaciones nativas |

### Recomendaciones

✓ Usa **MP3** para mejor compatibilidad
✓ Mantén duración entre **2-5 segundos**
✓ Prueba antes de guardar
✓ Usa sonidos **claros y distintos** para "En Línea" vs "Fuera de Línea"
✓ Descarga sonidos desde sitios como Freesound.org o Zapsplat.com

---

## Para Desarrolladores

### Arquitectura Rápida

```
Usuario sube archivo
    ↓
CustomSoundUploader (validación cliente)
    ↓
audioStorageService.uploadSound()
    ↓
Supabase Storage + Base de Datos
    ↓
MonitoringView / NotificationCenter
    ↓
notificationService.playNotificationSound()
    ↓
Audio reproducido con fallback
```

### Flujo de Código

**1. Validación**
```typescript
const validation = await audioStorageService.validateAudioFile(file);
// Valida: formato, tamaño (5MB), duración (10s)
```

**2. Carga**
```typescript
const result = await audioStorageService.uploadSound(
  file, userId, 'online' | 'offline'
);
// Devuelve: { url, name, duration, size }
```

**3. Guardado**
```typescript
await notificationService.updateUserPreferences(userId, {
  use_custom_sounds: true,
  custom_sound_online_url: result.url,
  custom_sound_online_name: result.name,
  custom_sound_online_duration: result.duration
});
```

**4. Reproducción**
```typescript
notificationService.playNotificationSound(
  'online',
  volumeLevel,
  customSoundUrl // opcional
);
// Si customSoundUrl falla → fallback a sonido predeterminado
```

### Componentes Clave

| Componente | Responsabilidad |
|---|---|
| **CustomSoundUploader** | UI para subir archivos |
| **audioStorageService** | Gestión de almacenamiento y validación |
| **notificationService** | Reproducción de sonidos |
| **NotificationSettings** | Gestión de preferencias |
| **MonitoringView** | Integración con notificaciones |

### Base de Datos

**Tabla**: `notification_preferences`

**Nuevas columnas**:
```sql
use_custom_sounds boolean DEFAULT false
custom_sound_online_url text
custom_sound_offline_url text
custom_sound_online_name text
custom_sound_offline_name text
custom_sound_online_duration numeric
custom_sound_offline_duration numeric
```

**Consulta de ejemplo**:
```sql
SELECT
  user_id,
  use_custom_sounds,
  custom_sound_online_name,
  custom_sound_offline_name,
  custom_sound_online_duration,
  custom_sound_offline_duration
FROM notification_preferences
WHERE use_custom_sounds = true;
```

### Almacenamiento

**Bucket**: `notification-sounds`

**Patrón de archivo**:
```
{user-id}-{state}-{timestamp}.{ext}

Ejemplo:
a1b2c3d4-e5f6-g7h8-online-1732576800000.mp3
a1b2c3d4-e5f6-g7h8-offline-1732576800001.wav
```

### Manejo de Errores

```typescript
try {
  // Intentar reproducir sonido personalizado
  await audioStorageService.playAudio(customUrl, volume);
} catch (error) {
  // Fallback a sonido predeterminado
  notificationService.playDefaultNotificationSound(status, volume);
}
```

### Testing

Ver `CUSTOM_SOUNDS_TESTING.md` para:
- 12 casos de prueba principales
- Pruebas de validación
- Pruebas de UI
- Pruebas de integración
- Pruebas de rendimiento

### Integración con Código Existente

**Cambios mínimos requeridos**:

1. NotificationSettings: Agregar sección "Sonidos Personalizados" ✓
2. MonitoringView: Pasar customUrl a playNotificationSound() ✓
3. NotificationCenter: Soportar customUrl en reproducción ✓
4. notificationService: Agregar método para reproducir custom audio ✓

**Cambios no requeridos** (sin cambios):
- RecurringNotificationManager (sigue funcionando igual)
- Resto de notificationService (métodos existentes intactos)
- DeviceService (sin cambios)
- Autenticación (sin cambios)

### URLs Importantes

**Documentación de validación**:
`src/services/audioStorageService.ts` (líneas 4-6)

**Componente de subida**:
`src/components/CustomSoundUploader.tsx`

**Integración en preferencias**:
`src/components/NotificationSettings.tsx` (líneas 323-374)

**Reproductor de sonidos**:
`src/services/notificationService.ts` (líneas 105-189)

### Debugging

**Console logs útiles**:
```typescript
// En audioStorageService.ts
console.log('Validating file:', file.name, file.size);
console.log('Audio duration:', duration);
console.log('Upload successful:', url);

// En notificationService.ts
console.log('Playing custom sound:', customSoundUrl);
console.log('Custom audio playback failed, falling back...', error);
```

**Browser DevTools**:
1. **Network**: Verificar subida a Supabase Storage
2. **Application → Storage → IndexedDB**: Ver datos guardados
3. **Console**: Ver logs de audio playback
4. **Performance**: Verificar tiempo de carga

### Posibles Extensiones

1. **Sonidos predefinidos**
   - Agregar librería de sonidos gratuitos
   - Descargar directamente desde la app

2. **Grabación de audio**
   - Permitir grabar directamente con el micrófono
   - Agregar editor simple

3. **Sonidos por dispositivo**
   - Diferentes sonidos para diferentes dispositivos
   - Sonidos por tipo de dispositivo (printer, server, etc.)

4. **Normalización de volumen**
   - Normalizar automáticamente volumen de archivos
   - Prevenir archivos demasiado altos o bajos

---

## Checklist de Implementación

- [x] Base de datos actualizada con nuevas columnas
- [x] TypeScript types actualizados
- [x] audioStorageService.ts creado
- [x] CustomSoundUploader.tsx creado
- [x] notificationService.ts actualizado
- [x] NotificationSettings.tsx integrado
- [x] MonitoringView.tsx integrado
- [x] NotificationCenter.tsx integrado
- [x] Build sin errores
- [x] Documentación completa
- [x] Plan de pruebas disponible

**Estado: ✓ LISTO PARA PRODUCCIÓN**

---

## Contacto y Soporte

Para problemas o mejoras:
1. Revisar `CUSTOM_SOUNDS_TESTING.md` para debugging
2. Revisar `CUSTOM_SOUNDS_IMPLEMENTATION.md` para detalles técnicos
3. Revisar console.log y DevTools

¡Disfruta personalizando tus notificaciones!
