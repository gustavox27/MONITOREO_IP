import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { isValidCustomSoundUrl } from '../utils/audioValidation';

interface Notification {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
  status: 'online' | 'offline';
  timestamp: number;
  displayDuration: number;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

function playBeep(frequency: number, duration: number, volume: number = 0.3) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.log('Audio playback not supported:', error);
  }
}

export function playNotificationSound(
  status: 'online' | 'offline',
  volume: number = 0.4,
  customUrl?: string | null,
  isCustom: boolean = false
) {
  const hasValidUrl = isValidCustomSoundUrl(customUrl);
  const shouldUseCustom = isCustom && hasValidUrl;

  console.log(`[NotificationCenter] Sound request: status=${status}, isCustom=${isCustom}, hasValidUrl=${hasValidUrl}`);
  console.log(`[NotificationCenter] Custom URL provided: ${customUrl ? 'YES' : 'NO'}`);

  if (shouldUseCustom) {
    try {
      console.log(`[NotificationCenter] Attempting to play custom sound from: ${customUrl}`);
      const audio = new Audio();
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.crossOrigin = 'anonymous';

      let audioErrorOccurred = false;

      audio.onloadstart = () => {
        console.log(`[NotificationCenter] Audio loading started`);
      };

      audio.onprogress = () => {
        console.log(`[NotificationCenter] Audio data being downloaded`);
      };

      audio.oncanplay = () => {
        console.log(`[NotificationCenter] Audio ready to play. Duration: ${audio.duration}s, ReadyState: ${audio.readyState}`);
      };

      audio.onerror = () => {
        audioErrorOccurred = true;
        const errorCode = audio.error?.code || 'UNKNOWN';
        const errorMsg = audio.error?.message || 'Unknown error';

        console.error(`[NotificationCenter] Custom audio failed to load`);
        console.error(`[NotificationCenter] Error code: ${errorCode}, Message: ${errorMsg}`);
        console.error(`[NotificationCenter] Network state: ${audio.networkState}, Ready state: ${audio.readyState}`);
        console.error(`[NotificationCenter] URL: ${customUrl}`);
        console.error(`[NotificationCenter] Falling back to default sound`);

        playDefaultSound(status, volume);
      };

      audio.onended = () => {
        console.log(`[NotificationCenter] Audio playback ended`);
      };

      audio.src = customUrl;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`[NotificationCenter] Custom audio playback started successfully`);
          })
          .catch((error) => {
            audioErrorOccurred = true;
            console.error(`[NotificationCenter] Custom audio playback failed:`, error.message);
            console.error(`[NotificationCenter] Error type:`, error.name);
            playDefaultSound(status, volume);
          });
      }
    } catch (error) {
      console.error(`[NotificationCenter] Exception playing custom audio:`, error);
      playDefaultSound(status, volume);
    }
  } else {
    if (isCustom && !hasValidUrl) {
      console.warn(`[NotificationCenter] Custom sound enabled but URL is invalid: ${customUrl}`);
    }
    console.log(`[NotificationCenter] Playing default sound for ${status}`);
    playDefaultSound(status, volume);
  }
}

function playDefaultSound(status: 'online' | 'offline', volume: number = 0.4) {
  if (status === 'offline') {
    playBeep(400, 0.2, volume);
    setTimeout(() => playBeep(400, 0.2, volume), 250);
    setTimeout(() => playBeep(400, 0.3, volume), 500);
  } else {
    playBeep(800, 0.2, volume * 0.875);
    setTimeout(() => playBeep(800, 0.2, volume * 0.875), 150);
  }
}

export const SOUND_CONFIG = {
  offline: { frequency: 400, duration: 0.2, volume: 0.4, pattern: 'triple' },
  online: { frequency: 800, duration: 0.2, volume: 0.35, pattern: 'double' },
};

export function NotificationCenter({ notifications, onDismiss }: NotificationCenterProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(notification.id), 300);
    }, notification.displayDuration);

    return () => clearTimeout(timer);
  }, [notification.id, notification.displayDuration, onDismiss]);

  const isOffline = notification.status === 'offline';
  const bgColor = isOffline ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
  const iconColor = isOffline ? 'text-red-600' : 'text-green-600';
  const titleColor = isOffline ? 'text-red-900' : 'text-green-900';
  const statusText = isOffline ? 'FUERA DE LÍNEA' : 'EN LÍNEA';

  return (
    <div
      className={`border rounded-lg p-4 shadow-lg transition-all duration-300 ${bgColor} ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isOffline ? (
            <AlertCircle className={`w-5 h-5 ${iconColor}`} />
          ) : (
            <CheckCircle className={`w-5 h-5 ${iconColor}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${titleColor}`}>
            {notification.deviceName}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            <code className="bg-white bg-opacity-50 px-1.5 py-0.5 rounded text-xs">
              {notification.deviceIp}
            </code>
          </p>
          <p className={`text-xs font-medium mt-1 ${
            isOffline ? 'text-red-700' : 'text-green-700'
          }`}>
            {statusText}
          </p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(notification.id), 300);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
