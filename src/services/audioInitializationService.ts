import { audioContextManager } from './audioContextManager';

export interface AudioInitState {
  isReady: boolean;
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
}

class AudioInitializationServiceClass {
  private static instance: AudioInitializationServiceClass;
  private listeners: Set<(state: AudioInitState) => void> = new Set();
  private state: AudioInitState = {
    isReady: false,
    isUnlocked: false,
    isLoading: false,
    error: null,
  };

  private constructor() {}

  static getInstance(): AudioInitializationServiceClass {
    if (!AudioInitializationServiceClass.instance) {
      AudioInitializationServiceClass.instance = new AudioInitializationServiceClass();
    }
    return AudioInitializationServiceClass.instance;
  }

  setup(): void {
    console.log('[AudioInitializationService] Setting up audio initialization service');

    const handleUserInteraction = async () => {
      console.log('[AudioInitializationService] User interaction detected, initializing audio');
      await this.initializeAudio();
      this.removeListeners();
    };

    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });
  }

  async initializeAudio(): Promise<boolean> {
    console.log('[AudioInitializationService] Starting audio initialization');
    this.state.isLoading = true;
    this.notifyListeners();

    try {
      const initSuccess = await audioContextManager.initialize();
      if (!initSuccess) {
        throw new Error('Failed to initialize AudioContext');
      }

      const resumeSuccess = await audioContextManager.resume();
      if (!resumeSuccess) {
        throw new Error('Failed to resume AudioContext');
      }

      this.state.isReady = true;
      this.state.isUnlocked = true;
      this.state.error = null;
      console.log('[AudioInitializationService] Audio initialized and unlocked successfully');
      this.notifyListeners();
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during audio initialization';
      this.state.error = errorMsg;
      console.error('[AudioInitializationService] Audio initialization failed:', error);
      this.notifyListeners();
      return false;
    } finally {
      this.state.isLoading = false;
    }
  }

  async unlockAudio(): Promise<boolean> {
    console.log('[AudioInitializationService] Explicit audio unlock requested');

    if (!audioContextManager.isSupported()) {
      console.error('[AudioInitializationService] AudioContext not supported');
      return false;
    }

    return this.initializeAudio();
  }

  async preloadCustomSounds(onlineUrl?: string | null, offlineUrl?: string | null): Promise<void> {
    console.log('[AudioInitializationService] Preloading custom sounds');

    const initSuccess = await audioContextManager.initialize();
    if (!initSuccess) {
      console.error('[AudioInitializationService] Failed to initialize AudioContext for preloading');
      return;
    }

    const loadPromises: Promise<any>[] = [];

    if (onlineUrl) {
      console.log('[AudioInitializationService] Preloading online sound from:', onlineUrl);
      loadPromises.push(
        audioContextManager.loadAudioBuffer(onlineUrl, 'online').catch((error) => {
          console.error('[AudioInitializationService] Failed to preload online sound:', error);
        })
      );
    }

    if (offlineUrl) {
      console.log('[AudioInitializationService] Preloading offline sound from:', offlineUrl);
      loadPromises.push(
        audioContextManager.loadAudioBuffer(offlineUrl, 'offline').catch((error) => {
          console.error('[AudioInitializationService] Failed to preload offline sound:', error);
        })
      );
    }

    if (loadPromises.length > 0) {
      await Promise.all(loadPromises);
      console.log('[AudioInitializationService] Custom sounds preloading completed');
    }
  }

  getState(): AudioInitState {
    return { ...this.state };
  }

  isAudioReady(): boolean {
    return this.state.isReady && this.state.isUnlocked;
  }

  subscribe(listener: (state: AudioInitState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('[AudioInitializationService] Error in listener:', error);
      }
    });
  }

  private removeListeners(): void {
    const handleUserInteraction = async () => {
      await this.initializeAudio();
    };

    const events = ['click', 'touchstart', 'keydown'];
    events.forEach((event) => {
      document.removeEventListener(event, handleUserInteraction);
    });
  }
}

export const audioInitializationService = AudioInitializationServiceClass.getInstance();
