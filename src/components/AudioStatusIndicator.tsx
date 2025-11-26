import { useState, useEffect } from 'react';
import { Volume2, VolumeX, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { audioContextManager } from '../services/audioContextManager';
import { audioInitializationService, type AudioInitState } from '../services/audioInitializationService';

export function AudioStatusIndicator() {
  const [state, setState] = useState<AudioInitState>({
    isReady: false,
    isUnlocked: false,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    setState(audioInitializationService.getState());

    const unsubscribe = audioInitializationService.subscribe((newState) => {
      setState(newState);
    });

    const contextUnsubscribe = audioContextManager.subscribe(() => {
      setState(audioInitializationService.getState());
    });

    return () => {
      unsubscribe();
      contextUnsubscribe();
    };
  }, []);

  const isSupported = audioContextManager.isSupported();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
        <VolumeX className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">Audio no soportado</span>
      </div>
    );
  }

  if (state.isUnlocked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-xs font-medium text-green-700">Audio habilitado</span>
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <Loader className="w-4 h-4 text-yellow-600 animate-spin" />
        <span className="text-xs font-medium text-yellow-700">Habilitando...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <span className="text-xs font-medium text-red-700">Error de audio</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <Volume2 className="w-4 h-4 text-blue-600" />
      <span className="text-xs font-medium text-blue-700">Audio deshabilitado</span>
    </div>
  );
}
