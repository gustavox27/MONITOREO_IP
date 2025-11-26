import { useState, useEffect } from 'react';
import { Volume2, X, CheckCircle, Loader } from 'lucide-react';
import { audioInitializationService, type AudioInitState } from '../services/audioInitializationService';

export function AudioInitializationBanner() {
  const [state, setState] = useState<AudioInitState>({
    isReady: false,
    isUnlocked: false,
    isLoading: false,
    error: null,
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setState(audioInitializationService.getState());

    const unsubscribe = audioInitializationService.subscribe((newState) => {
      setState(newState);
    });

    return () => unsubscribe();
  }, []);

  if (dismissed || state.isUnlocked) {
    return null;
  }

  const handleEnableAudio = async () => {
    await audioInitializationService.unlockAudio();
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Volume2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Habilita el audio para recibir notificaciones sonoras personalizadas
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Los sonidos se reproducirán automáticamente cuando cambien los estados de tus dispositivos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleEnableAudio}
              disabled={state.isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap disabled:opacity-50"
            >
              {state.isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Habilitando...
                </>
              ) : state.isUnlocked ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Habilitado
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Habilitar Audio
                </>
              )}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-100 rounded-lg transition"
              aria-label="Descartar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
