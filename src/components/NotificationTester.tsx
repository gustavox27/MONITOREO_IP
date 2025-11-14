import { useEffect, useState } from 'react';
import { Bell, Volume2, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export function NotificationTester() {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0.4);
  const [testInProgress, setTestInProgress] = useState(false);

  useEffect(() => {
    const supported = notificationService.isBrowserSupported();
    setIsSupported(supported);

    if (supported) {
      const permission = notificationService.getNotificationPermission();
      setHasPermission(permission === 'granted');
    }
  }, []);

  const handleRequestPermission = async () => {
    const permission = await notificationService.requestPermission();
    setHasPermission(permission === 'granted');
  };

  const testNotificationOnline = async () => {
    if (!hasPermission) {
      alert('Por favor habilita los permisos de notificación primero');
      return;
    }

    setTestInProgress(true);
    try {
      await notificationService.showNativeNotification(
        {
          id: 'test-device-online',
          name: 'Dispositivo de Prueba',
          ip_address: '192.168.1.100',
          status: 'online',
          device_type: 'server',
          response_time: 45,
          last_check: new Date().toISOString(),
          last_down: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '',
          assigned_to: null,
        },
        'online'
      );
      notificationService.playNotificationSound('online', volumeLevel);
    } catch (error) {
      console.error('Error showing test notification:', error);
    } finally {
      setTestInProgress(false);
    }
  };

  const testNotificationOffline = async () => {
    if (!hasPermission) {
      alert('Por favor habilita los permisos de notificación primero');
      return;
    }

    setTestInProgress(true);
    try {
      await notificationService.showNativeNotification(
        {
          id: 'test-device-offline',
          name: 'Dispositivo de Prueba',
          ip_address: '192.168.1.100',
          status: 'offline',
          device_type: 'server',
          response_time: null,
          last_check: new Date().toISOString(),
          last_down: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: '',
          assigned_to: null,
        },
        'offline'
      );
      notificationService.playNotificationSound('offline', volumeLevel);
    } catch (error) {
      console.error('Error showing test notification:', error);
    } finally {
      setTestInProgress(false);
    }
  };

  const testSound = () => {
    notificationService.playNotificationSound('online', volumeLevel);
    setTimeout(() => {
      notificationService.playNotificationSound('offline', volumeLevel);
    }, 500);
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900">Navegador no compatible</p>
            <p className="text-sm text-yellow-700 mt-1">
              Tu navegador no soporta notificaciones nativas. Por favor usa un navegador moderno.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Panel de Prueba de Notificaciones</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Estado de Permisos</span>
              <div className="flex items-center gap-2">
                {hasPermission ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Habilitadas</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-700 font-medium">Deshabilitadas</span>
                  </>
                )}
              </div>
            </div>

            {!hasPermission && (
              <button
                onClick={handleRequestPermission}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                Habilitar Notificaciones
              </button>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Volumen de Sonido
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volumeLevel}
                onChange={(e) => setVolumeLevel(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-700 min-w-12">
                {Math.round(volumeLevel * 100)}%
              </span>
              <button
                onClick={testSound}
                className="p-2 text-gray-600 hover:bg-white rounded-lg transition border border-gray-200"
                title="Reproducir sonido de prueba"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Prueba de Notificaciones</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testNotificationOnline}
                disabled={!hasPermission || testInProgress}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">En Línea</span>
              </button>
              <button
                onClick={testNotificationOffline}
                disabled={!hasPermission || testInProgress}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Fuera de Línea</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Cómo funcionan las notificaciones:</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ Aparecen incluso si cierras la pestaña o minimizas el navegador</li>
                  <li>✓ Se desvanecen automáticamente después de 10 segundos</li>
                  <li>✓ Incluyen sonido y vibración (si tu dispositivo lo soporta)</li>
                  <li>✓ Hacen clic para enfocarse en la aplicación</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
