import { useEffect, useState } from 'react';
import { Settings, Volume2, Bell, Zap, Check, Loader } from 'lucide-react';
import { notificationService, type NotificationPreferences } from '../services/notificationService';

interface NotificationSettingsProps {
  userId: string;
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enable_notifications: true,
    enable_sound: true,
    group_notifications: true,
    sound_volume: 0.4,
    notification_duration: 10000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const userPrefs = await notificationService.getUserPreferences(userId);
      if (userPrefs) {
        setPreferences(userPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await notificationService.updateUserPreferences(userId, preferences);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (
    key: keyof NotificationPreferences,
    value: boolean | number
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Configuración de Notificaciones</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Habilitar Notificaciones</p>
              <p className="text-sm text-gray-600">Recibe alertas cuando cambien los estados de dispositivos</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.enable_notifications}
            onChange={(e) =>
              handleToggle('enable_notifications', e.target.checked)
            }
            className="w-5 h-5 cursor-pointer rounded"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Sonidos de Notificación</p>
              <p className="text-sm text-gray-600">Reproduce sonidos al cambiar estado de dispositivos</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.enable_sound}
            onChange={(e) => handleToggle('enable_sound', e.target.checked)}
            className="w-5 h-5 cursor-pointer rounded"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Agrupar Notificaciones</p>
              <p className="text-sm text-gray-600">Agrupa múltiples cambios en una sola notificación</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.group_notifications}
            onChange={(e) =>
              handleToggle('group_notifications', e.target.checked)
            }
            className="w-5 h-5 cursor-pointer rounded"
          />
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <Volume2 className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Volumen de Sonido</p>
              <p className="text-sm text-gray-600">Ajusta el volumen de los sonidos de notificación</p>
            </div>
          </label>
          <div className="flex items-center gap-4 pl-8">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={preferences.sound_volume}
              onChange={(e) =>
                handleToggle('sound_volume', parseFloat(e.target.value))
              }
              className="flex-1"
              disabled={!preferences.enable_sound}
            />
            <span className="text-sm font-medium text-gray-700 min-w-12">
              {Math.round(preferences.sound_volume * 100)}%
            </span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Duración de Notificación</p>
              <p className="text-sm text-gray-600">Tiempo que permanece la notificación en pantalla</p>
            </div>
          </label>
          <div className="flex items-center gap-4 pl-8">
            <input
              type="range"
              min="1000"
              max="60000"
              step="1000"
              value={preferences.notification_duration}
              onChange={(e) =>
                handleToggle('notification_duration', parseInt(e.target.value))
              }
              className="flex-1"
              disabled={!preferences.enable_notifications}
            />
            <span className="text-sm font-medium text-gray-700 min-w-16">
              {Math.round(preferences.notification_duration / 1000)}s
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
        <button
          onClick={handleSavePreferences}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : saveStatus === 'success' ? (
            <>
              <Check className="w-4 h-4" />
              <span>Guardado</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </>
          )}
        </button>
      </div>

      {saveStatus === 'error' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Error al guardar los cambios. Por favor intenta de nuevo.
        </div>
      )}
    </div>
  );
}
