import { useEffect, useState } from 'react';
import { Settings, Volume2, Bell, Zap, Check, Loader, AlertCircle, Music, Unlock } from 'lucide-react';
import { notificationService, type NotificationPreferences } from '../services/notificationService';
import { audioInitializationService, type AudioInitState } from '../services/audioInitializationService';
import { CustomSoundUploader } from './CustomSoundUploader';
import { AudioStatusIndicator } from './AudioStatusIndicator';
import type { UploadResult } from '../services/audioStorageService';

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
    enable_recurring_notifications: false,
    recurring_interval: 30,
    recurring_volume: 0.5,
    use_custom_sounds: false,
    custom_sound_online_url: null,
    custom_sound_offline_url: null,
    custom_sound_online_name: null,
    custom_sound_offline_name: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [audioState, setAudioState] = useState<AudioInitState>({
    isReady: false,
    isUnlocked: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    loadPreferences();
    const unsubscribe = audioInitializationService.subscribe(setAudioState);
    return unsubscribe;
  }, [userId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      console.log(`[NotificationSettings] Loading preferences for user: ${userId}`);
      const userPrefs = await notificationService.getUserPreferences(userId);
      if (userPrefs) {
        console.log(`[NotificationSettings] Preferences loaded successfully:`, {
          use_custom_sounds: userPrefs.use_custom_sounds,
          custom_sound_online_url: userPrefs.custom_sound_online_url ? 'SET' : 'NOT SET',
          custom_sound_offline_url: userPrefs.custom_sound_offline_url ? 'SET' : 'NOT SET',
          custom_sound_online_name: userPrefs.custom_sound_online_name,
          custom_sound_offline_name: userPrefs.custom_sound_offline_name,
          sound_volume: userPrefs.sound_volume
        });
        setPreferences(userPrefs);

        if (userPrefs.use_custom_sounds && (userPrefs.custom_sound_online_url || userPrefs.custom_sound_offline_url)) {
          console.log('[NotificationSettings] Preloading custom sounds');
          await audioInitializationService.preloadCustomSounds(
            userPrefs.custom_sound_online_url,
            userPrefs.custom_sound_offline_url
          );
        }
      } else {
        console.log(`[NotificationSettings] No preferences found for user: ${userId}, initializing defaults`);
      }
    } catch (error) {
      console.error('[NotificationSettings] Error loading preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      console.log(`[NotificationSettings] Saving preferences for user: ${userId}`, {
        use_custom_sounds: preferences.use_custom_sounds,
        custom_sound_online_url: preferences.custom_sound_online_url ? 'SET' : 'NOT SET',
        custom_sound_offline_url: preferences.custom_sound_offline_url ? 'SET' : 'NOT SET',
        sound_volume: preferences.sound_volume
      });

      if (preferences.enable_notifications || preferences.enable_sound) {
        console.log('[NotificationSettings] Notifications enabled, unlocking audio');
        await audioInitializationService.unlockAudio();
      }

      if (preferences.use_custom_sounds && (preferences.custom_sound_online_url || preferences.custom_sound_offline_url)) {
        console.log('[NotificationSettings] Preloading custom sounds after save');
        await audioInitializationService.preloadCustomSounds(
          preferences.custom_sound_online_url,
          preferences.custom_sound_offline_url
        );
      }

      await notificationService.updateUserPreferences(userId, preferences);
      console.log(`[NotificationSettings] Preferences saved successfully`);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('[NotificationSettings] Error saving preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (
    key: keyof NotificationPreferences,
    value: boolean | number | string | null
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCustomSoundUpload = async (
    soundType: 'online' | 'offline',
    result: UploadResult
  ) => {
    if (soundType === 'online') {
      setPreferences((prev) => ({
        ...prev,
        custom_sound_online_url: result.url,
        custom_sound_online_name: result.name,
        custom_sound_online_duration: result.duration,
        use_custom_sounds: true,
      }));
    } else {
      setPreferences((prev) => ({
        ...prev,
        custom_sound_offline_url: result.url,
        custom_sound_offline_name: result.name,
        custom_sound_offline_duration: result.duration,
        use_custom_sounds: true,
      }));
    }

    console.log('[NotificationSettings] Preloading newly uploaded sound');
    await audioInitializationService.preloadCustomSounds(
      soundType === 'online' ? result.url : preferences.custom_sound_online_url,
      soundType === 'offline' ? result.url : preferences.custom_sound_offline_url
    );
  };

  const handleDeleteCustomSound = (soundType: 'online' | 'offline') => {
    if (soundType === 'online') {
      setPreferences((prev) => ({
        ...prev,
        custom_sound_online_url: null,
        custom_sound_online_name: null,
        custom_sound_online_duration: null,
      }));
    } else {
      setPreferences((prev) => ({
        ...prev,
        custom_sound_offline_url: null,
        custom_sound_offline_name: null,
        custom_sound_offline_duration: null,
      }));
    }

    const hasAnySound =
      soundType === 'online'
        ? preferences.custom_sound_offline_url
        : preferences.custom_sound_online_url;

    if (!hasAnySound) {
      setPreferences((prev) => ({
        ...prev,
        use_custom_sounds: false,
      }));
    }
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
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Configuración de Notificaciones</h3>
        </div>
        <AudioStatusIndicator />
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

        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Notificaciones Recurrentes</p>
                <p className="text-sm text-gray-600">Alerta cada X segundos mientras haya dispositivos desconectados</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.enable_recurring_notifications}
              onChange={(e) =>
                handleToggle('enable_recurring_notifications', e.target.checked)
              }
              className="w-5 h-5 cursor-pointer rounded"
            />
          </div>

          {preferences.enable_recurring_notifications && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Intervalo de Alerta</p>
                    <p className="text-sm text-gray-600">Cada cuántos segundos se repite la notificación</p>
                  </div>
                </label>
                <div className="flex items-center gap-4 pl-8">
                  <select
                    value={preferences.recurring_interval}
                    onChange={(e) =>
                      handleToggle('recurring_interval', parseInt(e.target.value))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15}>15 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>1 minuto</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <Volume2 className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Volumen Reducido</p>
                    <p className="text-sm text-gray-600">Volumen específico para notificaciones recurrentes</p>
                  </div>
                </label>
                <div className="flex items-center gap-4 pl-8">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={preferences.recurring_volume}
                    onChange={(e) =>
                      handleToggle('recurring_volume', parseFloat(e.target.value))
                    }
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 min-w-12">
                    {Math.round(preferences.recurring_volume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Sonidos Personalizados</h3>
        </div>

        <div className={`mb-4 p-4 rounded-lg border ${
          preferences.use_custom_sounds
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.use_custom_sounds || false}
              onChange={(e) => handleToggle('use_custom_sounds', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">Usar Sonidos Personalizados</p>
                {preferences.use_custom_sounds && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-200 text-green-800">
                    <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                    Activo
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">Sube tus propios archivos de audio para las notificaciones</p>
            </div>
          </label>
        </div>

        {preferences.use_custom_sounds && (
          <div className="space-y-4">
            <CustomSoundUploader
              soundType="online"
              userId={userId}
              currentUrl={preferences.custom_sound_online_url}
              currentName={preferences.custom_sound_online_name}
              currentDuration={preferences.custom_sound_online_duration}
              onUploadSuccess={(result) => handleCustomSoundUpload('online', result)}
              onDelete={() => handleDeleteCustomSound('online')}
              volume={preferences.sound_volume}
            />

            <CustomSoundUploader
              soundType="offline"
              userId={userId}
              currentUrl={preferences.custom_sound_offline_url}
              currentName={preferences.custom_sound_offline_name}
              currentDuration={preferences.custom_sound_offline_duration}
              onUploadSuccess={(result) => handleCustomSoundUpload('offline', result)}
              onDelete={() => handleDeleteCustomSound('offline')}
              volume={preferences.sound_volume}
            />

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Consejo:</strong> Se recomienda usar sonidos de 2-5 segundos de duración.
                Formatos recomendados: MP3 (compatible universal) o WAV (mejor calidad).
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
        {!audioState.isUnlocked && (
          <button
            onClick={async () => {
              await audioInitializationService.unlockAudio();
            }}
            disabled={audioState.isLoading}
            className="flex items-center justify-center gap-2 bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 transition font-medium disabled:opacity-50"
          >
            {audioState.isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Desbloqueando audio...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Desbloquear Audio</span>
              </>
            )}
          </button>
        )}

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
