# Guía Rápida: Notificaciones PUSH en Monitor IP

## 1. Habilitar Notificaciones (Primera Vez)

1. Abre la aplicación
2. Haz clic en la pestaña **"Notificaciones"** en la barra superior
3. Haz clic en el botón **"Habilitar Notificaciones"**
4. Acepta el permiso que solicite tu navegador
5. ¡Listo! Las notificaciones están activadas

## 2. Configurar Preferencias

En la pestaña **"Notificaciones"** → **"Configuración"**:

- **Habilitar Notificaciones**: Activa/desactiva todas las notificaciones
- **Sonidos de Notificación**: Activa/desactiva los sonidos
- **Agrupar Notificaciones**: Combina múltiples cambios en una sola notificación
- **Volumen de Sonido**: Ajusta del 0% al 100%
- **Duración de Notificación**: Elige cuánto tiempo permanecen (1-60 segundos)

Haz clic en **"Guardar Cambios"** cuando termines.

## 3. Probar Notificaciones

En la pestaña **"Notificaciones"** → **"Pruebas"**:

1. **Probar Sonidos**: Haz clic en el icono de volumen
2. **Probar En Línea**: Haz clic en botón verde
3. **Probar Fuera de Línea**: Haz clic en botón rojo

**Prueba en segundo plano:**
- Minimiza el navegador
- Abre otra pestaña
- Luego prueba nuevamente los botones

Verás las notificaciones PUSH del navegador.

## 4. Cómo Funcionan

### Cuando página está visible:
- Notificación aparece en la esquina inferior izquierda
- Sonido de alerta
- Se desvanece automáticamente (configurable)

### Cuando página está en segundo plano/minimizada:
- Notificación aparece como PUSH del navegador
- Sonido del navegador + vibración
- Se desvanece automáticamente después de 10 segundos
- Haz clic para enfocar la aplicación

### Tipos de Notificaciones:

**Estado "En Línea"** (Dispositivo conectado) 🟢
- Sonido: 2 tonos cortos (800 Hz)
- Vibración: patrón corto

**Estado "Fuera de Línea"** (Dispositivo desconectado) 🔴
- Sonido: 3 tonos escalonados (400 Hz)
- Vibración: patrón largo

## 5. Agrupación Inteligente

Si tienes **"Agrupar Notificaciones"** activado:

Con 3 dispositivos que se desconectan en 500ms:
- **Sin agrupación**: 3 notificaciones separadas
- **Con agrupación**: 1 notificación que dice "3 dispositivos con cambios"

Esto reduce la "fatiga de notificaciones".

## 6. Casos de Uso Comunes

### Trabajar en otra aplicación
1. Deja la aplicación en segundo plano
2. Las notificaciones te alertarán sin interrumpir
3. Haz clic en la notificación para volver a Monitor IP

### En casa/oficina
1. Deja minimizado el navegador
2. Sigue trabajando en el escritorio
3. Recibirás alertas de cualquier cambio

### En móvil
1. Cierra la pestaña o minimiza
2. Recibirás notificaciones PUSH del navegador
3. Toca la notificación para abrir la app

## 7. Solucionar Problemas

### Las notificaciones no funcionan

**Verificar permisos:**
- Ir a Notificaciones → Pruebas
- Ver si dice "Habilitadas" o "Deshabilitadas"
- Si está deshabilitada, haz clic en "Habilitar Notificaciones"

**En Chrome/Edge:**
- Chrome → Configuración → Privacidad y seguridad → Permisos del sitio → Notificaciones
- Busca "Monitor IP" y asegúrate de que está permitido

**En Firefox:**
- Firefox → Preferencias → Privacidad → Permisos
- Busca "Notificaciones" y permite Monitor IP

**En Safari:**
- Safari → Preferencias → Sitios web → Notificaciones
- Busca "Monitor IP" y selecciona "Permitir"

### No escucho los sonidos
1. Verifica que "Sonidos de Notificación" esté activado
2. Comprueba el volumen de tu computadora
3. Aumenta el "Volumen de Sonido" en configuración
4. Prueba el sonido en el panel de pruebas

### Notificaciones muy rápidas/lentas
1. Ve a Configuración → Duración de Notificación
2. Ajusta el tiempo (en segundos)
3. Guarda cambios

## 8. Características Avanzadas

### Vibración
- Solo en dispositivos móviles/tablets
- Patrón diferente según estado:
  - Online: vibración corta
  - Offline: vibración larga

### Agrupación Automática
- Agrupa automáticamente cambios dentro de 500ms
- Muestra "X dispositivos con cambios" en la notificación
- Diferencia entre cambios a online y offline

### Persistencia
- Las preferencias se guardan en tu cuenta
- Funcionan en cualquier dispositivo
- Se sincrunizan automáticamente

## 9. Atajos Útiles

| Acción | Pasos |
|--------|-------|
| Abrir Notificaciones | Dashboard → Notificaciones |
| Cambiar Volumen | Notificaciones → Configuración → Volumen |
| Probar Sonidos | Notificaciones → Pruebas → Click en volumen |
| Habilitar/Deshabilitar | Notificaciones → Configuración → Toggle |

## 10. Buenas Prácticas

1. **Habilita Agrupación** si tienes muchos dispositivos
2. **Usa volumen bajo** en ambientes compartidos
3. **Prueba los sonidos** después de cambiar configuración
4. **Revisa permisos** si dejan de funcionar
5. **Guarda cambios** después de ajustar preferencias

## Preguntas Frecuentes

**P: ¿Las notificaciones funcionan si cierro el navegador?**
A: No, pero sí si cierras la pestaña o minimizas el navegador.

**P: ¿Puedo recibir notificaciones en mi móvil?**
A: Sí, si usas el navegador del móvil. También puedes instalar como PWA.

**P: ¿Qué pasa si rechazo los permisos?**
A: Solo recibirás notificaciones en pantalla, no notificaciones PUSH.

**P: ¿Puedo cambiar los sonidos?**
A: No, pero puedes ajustar el volumen o silenciar completamente.

**P: ¿Se guardan mis preferencias?**
A: Sí, en tu cuenta de usuario en Supabase.

## Contacto & Soporte

Para problemas o sugerencias, revisa:
- `NOTIFICATIONS_GUIDE.md` - Guía completa
- `IMPLEMENTATION_SUMMARY.md` - Detalles técnicos
- Consola del navegador (F12) - Mensajes de error

---

**Versión**: 1.0.0
**Última actualización**: 13 de Noviembre de 2025
