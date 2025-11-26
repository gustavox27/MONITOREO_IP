import { audioContextManager } from './audioContextManager';

export interface AudioInitializationState {
  isInitialized: boolean;
  isReady: boolean;
  hasError: boolean;
}

class AudioInitializationHandlerClass {
  private static instance: AudioInitializationHandlerClass;
  private initialized = false;
  private listeners: Set<(state: AudioInitializationState) => void> = new Set();

  private constructor() {}

  static getInstance(): AudioInitializationHandlerClass {
    if (!AudioInitializationHandlerClass.instance) {
      AudioInitializationHandlerClass.instance = new AudioInitializationHandlerClass();
    }
    return AudioInitializationHandlerClass.instance;
  }

  setup(): void {
    if (this.initialized) {
      console.log('[AudioInitializationHandler] Already set up');
      return;
    }

    console.log('[AudioInitializationHandler] Setting up initialization handler');
    this.initialized = true;

    const handleUserInteraction = async () => {
      console.log('[AudioInitializationHandler] User interaction detected');
      const success = await audioContextManager.initialize();

      if (success) {
        await audioContextManager.resume();
      }

      this.notifyListeners(this.getState());
      this.removeListeners();
    };

    const events = ['click', 'touchstart', 'keydown'];

    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    console.log('[AudioInitializationHandler] Waiting for user interaction to initialize AudioContext');
  }

  initializeManually = async (): Promise<boolean> => {
    console.log('[AudioInitializationHandler] Manual initialization triggered');
    const success = await audioContextManager.initialize();
    if (success) {
      await audioContextManager.resume();
    }
    this.notifyListeners(this.getState());
    return success;
  };

  getState(): AudioInitializationState {
    const contextState = audioContextManager.getState();
    return {
      isInitialized: contextState.isInitialized,
      isReady: contextState.isInitialized && contextState.state === 'running',
      hasError: contextState.lastError !== null,
    };
  }

  subscribe(listener: (state: AudioInitializationState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: AudioInitializationState): void {
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('[AudioInitializationHandler] Error in listener:', error);
      }
    });
  }

  private removeListeners(): void {
    const handleUserInteraction = async () => {
      const success = await audioContextManager.initialize();
      if (success) {
        await audioContextManager.resume();
      }
      this.notifyListeners(this.getState());
    };

    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.removeEventListener(event, handleUserInteraction);
    });
  }
}

export const audioInitializationHandler = AudioInitializationHandlerClass.getInstance();
