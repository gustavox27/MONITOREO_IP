# Guía de Sistema de Notificaciones PUSH Nativas

## Descripción General

El sistema de notificaciones ha sido completamente implementado con soporte para notificaciones PUSH nativas del navegador que funcionan incluso cuando:
- La pestaña del navegador está en segundo plano
- El navegador está minimizado
- El usuario está en otra pestaña
- La aplicación web no está activa

## Características Implementadas

### 1. Notificaciones Nativas del Navegador
- **Service Worker**: Gestiona notificaciones en segundo plano
- **Permisos**: Sistema de solicitud de permisos automático
- **Sonidos Profesionales**: Diferentes sonidos para estados online/offline
- **Vibración**: Retroalimentación háptica en dispositivos soportados
- **Iconos**: Iconos personalizados en notificaciones
- **Auto-cierre**: Las notificaciones se desvanecen automáticamente después de 10 segundos

### 2. Sistema de Preferencias de Usuario
- Habilitar/deshabilitar notificaciones
- Control de sonido independiente
- Ajuste de volumen de sonido
- Duración customizable de notificaciones
- Agrupación de notificaciones para múltiples cambios
- Todas las preferencias se guardan en Supabase

### 3. Agrupación Inteligente de Notificaciones
- Agrupa múltiples cambios de estado en una sola notificación
- Diferencia entre cambios a "en línea" y "fuera de línea"
- Optimiza la cantidad de notificaciones mostradas
- Funciona con notificaciones nativas y en pantalla

### 4. Panel de Pruebas
- Probar notificaciones para estado "En Línea"
- Probar notificaciones para estado "Fuera de Línea"
- Ajustar volumen en tiempo real
- Mostrar estado de permisos del navegador
- Reproducir sonidos de prueba

## Cómo Usar

### Para Usuarios Finales

#### Habilitar Notificaciones
1. Navega a la sección "Notificaciones" en el Dashboard
2. Haz clic en "Habilitar Notificaciones"
3. Acepta el permiso que solicite el navegador
4. Las notificaciones ahora aparecerán incluso en segundo plano

#### Configurar Preferencias
1. Ve a "Notificaciones" → "Configuración"
2. Ajusta las siguientes opciones:
   - **Habilitar Notificaciones**: Activa/desactiva notificaciones
   - **Sonidos de Notificación**: Activa/desactiva sonidos
   - **Agrupar Notificaciones**: Agrupa cambios múltiples
   - **Volumen de Sonido**: Ajusta del 0% al 100%
   - **Duración de Notificación**: Tiempo que permanece en pantalla (1-60 segundos)
3. Haz clic en "Guardar Cambios"

#### Probar Notificaciones
1. Ve a "Notificaciones" → "Pruebas"
2. Haz clic en "Habilitar Notificaciones" si es necesario
3. Prueba los sonidos con el botón "Volumen"
4. Simula notificaciones con:
   - Botón "En Línea" - simula dispositivo conectado
   - Botón "Fuera de Línea" - simula dispositivo desconectado
5. Minimiza el navegador o abre otra pestaña para ver las notificaciones nativas

### Flujo de Operación

#### Cuando cambia el estado de un dispositivo:
1. El sistema detecta el cambio
2. Si la página está visible: muestra notificación en pantalla + sonido
3. Si la página NO está visible:
   - Muestra notificación PUSH nativa
   - Genera sonido del navegador
   - Causa vibración del dispositivo (si soporta)
4. Si "Agrupar Notificaciones" está activo y hay múltiples cambios:
   - Los agrupa en una sola notificación
   - Especifica el número de dispositivos afectados
5. La notificación se desvanece automáticamente después del tiempo configurado

## Tecnología Utilizada

### Frontend
- **Service Worker API**: Para notificaciones en segundo plano
- **Notifications API**: Para crear notificaciones del navegador
- **Web Audio API**: Para reproducir sonidos personalizados
- **Supabase**: Para guardar preferencias de usuario

### Backend (Supabase)
- **Tabla**: `notification_preferences`
- **RLS Policies**: Cada usuario solo puede ver/editar sus propias preferencias
- **Validaciones**: Volumen entre 0-1, duración entre 1000-60000ms

## Compatibilidad de Navegadores

| Navegador | Soporte | Notas |
|-----------|---------|-------|
| Chrome/Edge | ✓ | Soporte completo |
| Firefox | ✓ | Soporte completo |
| Safari | ✓ | macOS 16+, iOS limitado |
| Opera | ✓ | Soporte completo |
| Brave | ✓ | Soporte completo |
| IE 11 | ✗ | No soporta |

## Formato de Notificaciones

### Notificaciones en Pantalla
```
┌─────────────────────────┐
│ [Icono] Nombre Dispositivo
│         192.168.1.100
│         ✓ EN LÍNEA / ✗ FUERA DE LÍNEA
└─────────────────────────┘
```

### Notificaciones Nativas
- **Título**: Nombre del dispositivo o "X dispositivos con cambios"
- **Cuerpo**: Estado + IP o resumen de cambios
- **Icono**: Logo de Monitor IP Pro
- **Duración**: 10 segundos por defecto
- **Vibración**: Patrón diferente para online/offline

## Sonidos

### Estado "En Línea" 🟢
- Frecuencia: 800 Hz
- Duración: 2 tonos de 0.2s con pausa de 150ms
- Volumen: Configurable (0-100%)

### Estado "Fuera de Línea" 🔴
- Frecuencia: 400 Hz
- Duración: 3 tonos de (0.2s, 0.2s, 0.3s) con pausas de 250ms/500ms
- Volumen: Configurable (0-100%)

## Seguridad

### Row Level Security (RLS)
- Los usuarios solo pueden ver sus propias preferencias
- Las preferencias se validan en la base de datos
- Imposible acceder a preferencias de otros usuarios

### Permisos
- El navegador solicita permiso explícitamente
- El usuario puede revocar permisos en cualquier momento
- Las notificaciones respetan la configuración del navegador

## Solución de Problemas

### Las notificaciones no aparecen
1. Verifica que el navegador soporte notificaciones
2. Comprueba que diste permiso en la sección "Notificaciones"
3. Verifica que "Habilitar Notificaciones" esté activado
4. Asegúrate de que el navegador no tiene notificaciones silenciadas

### No escucho sonidos
1. Verifica que "Sonidos de Notificación" esté activado
2. Comprueba el volumen de la computadora/navegador
3. Aumenta el "Volumen de Sonido" en configuración
4. Prueba los sonidos en el panel de pruebas

### El Service Worker no se registra
1. Asegúrate de que estés en HTTPS (excepto localhost)
2. Verifica la consola del navegador (F12) para errores
3. Limpia el cache y recarga la página
4. Intenta desactivar extensiones de navegador que bloqueen scripts

### Las notificaciones se desvanecen muy rápido/lento
1. Ajusta la "Duración de Notificación" en configuración
2. Los valores válidos son: 1 segundo a 1 minuto
3. Guarda los cambios

## API Disponible (Para Desarrolladores)

### Cargar preferencias de usuario
```typescript
const preferences = await notificationService.getUserPreferences(userId);
```

### Actualizar preferencias
```typescript
await notificationService.updateUserPreferences(userId, {
  enable_notifications: true,
  sound_volume: 0.5,
});
```

### Mostrar notificación nativa
```typescript
await notificationService.showNativeNotification(device, 'online');
```

### Reproducir sonido
```typescript
notificationService.playNotificationSound('offline', 0.4);
```

### Verificar soporte
```typescript
const supported = notificationService.isBrowserSupported();
const hasPermission = notificationService.canShowNotifications();
```

## Notas Importantes

1. **Los Service Workers requieren HTTPS**: En producción, las notificaciones solo funcionarán en HTTPS
2. **Localhost funciona para desarrollo**: Puedes probar en http://localhost sin HTTPS
3. **Las notificaciones persisten en el navegador**: Aparecen incluso si cierras la pestaña/navegador
4. **El sonido usa Web Audio API**: Compatible con todos los navegadores modernos
5. **La vibración funciona solo en dispositivos móviles**: Las computadoras la ignorarán

## Mantenimiento

### Base de datos
- Las preferencias se actualizan automáticamente
- No requiere limpieza manual
- Los índices se optimizan automáticamente

### Service Worker
- Se actualiza automáticamente al refrescar
- Compatibilidad hacia atrás garantizada
- Soporta múltiples versiones simultáneamente

---

**Última actualización**: 2025-11-13
**Versión**: 1.0.0
