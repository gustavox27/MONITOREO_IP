export interface AudioContextManagerState {
  isInitialized: boolean;
  isSupported: boolean;
  context: AudioContext | null;
  state: 'suspended' | 'running' | 'closed' | 'not-initialized';
  lastError: Error | null;
}

class AudioContextManagerClass {
  private static instance: AudioContextManagerClass;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): AudioContextManagerClass {
    if (!AudioContextManagerClass.instance) {
      AudioContextManagerClass.instance = new AudioContextManagerClass();
    }
    return AudioContextManagerClass.instance;
  }

  isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  getState(): AudioContextManagerState {
    const state = this.audioContext?.state || 'not-initialized';
    return {
      isInitialized: this.isInitialized,
      isSupported: this.isSupported(),
      context: this.audioContext,
      state: state as 'suspended' | 'running' | 'closed' | 'not-initialized',
      lastError: null,
    };
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[AudioContextManager] AudioContext not supported in this browser');
      return false;
    }

    if (this.isInitialized && this.audioContext) {
      console.log('[AudioContextManager] AudioContext already initialized');
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.isInitialized = true;
      console.log('[AudioContextManager] AudioContext initialized successfully, state:', this.audioContext.state);
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('[AudioContextManager] Failed to initialize AudioContext:', error);
      return false;
    }
  }

  async resume(): Promise<boolean> {
    if (!this.audioContext) {
      console.warn('[AudioContextManager] AudioContext not initialized, attempting initialization');
      return this.initialize();
    }

    if (this.audioContext.state === 'running') {
      console.log('[AudioContextManager] AudioContext already running');
      return true;
    }

    if (this.audioContext.state === 'suspended') {
      try {
        console.log('[AudioContextManager] Resuming suspended AudioContext');
        await this.audioContext.resume();
        console.log('[AudioContextManager] AudioContext resumed successfully, state:', this.audioContext.state);
        this.notifyListeners();
        return true;
      } catch (error) {
        console.error('[AudioContextManager] Failed to resume AudioContext:', error);
        return false;
      }
    }

    return false;
  }

  getContext(): AudioContext | null {
    return this.audioContext;
  }

  isRunning(): boolean {
    return this.audioContext?.state === 'running';
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[AudioContextManager] Error in listener:', error);
      }
    });
  }
}

export const audioContextManager = AudioContextManagerClass.getInstance();
