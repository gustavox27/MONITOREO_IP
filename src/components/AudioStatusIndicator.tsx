import { useState, useEffect } from 'react';
import { Volume2, VolumeX, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { audioContextManager } from '../services/audioContextManager';
import { audioInitializationHandler, type AudioInitializationState } from '../services/audioInitializationHandler';

export function AudioStatusIndicator() {
  const [state, setState] = useState<AudioInitializationState>({
    isInitialized: false,
    isReady: false,
    hasError: false,
  });

  useEffect(() => {
    setState(audioInitializationHandler.getState());

    const unsubscribe = audioInitializationHandler.subscribe((newState) => {
      setState(newState);
    });

    const contextUnsubscribe = audioContextManager.subscribe(() => {
      setState(audioInitializationHandler.getState());
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

  if (state.isReady) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <span className="text-xs font-medium text-green-700">Audio habilitado</span>
      </div>
    );
  }

  if (state.isInitialized && !state.isReady) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <span className="text-xs font-medium text-yellow-700">Inicializando audio...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <Volume2 className="w-4 h-4 text-blue-600" />
      <span className="text-xs font-medium text-blue-700">Haz clic para habilitar</span>
    </div>
  );
}
