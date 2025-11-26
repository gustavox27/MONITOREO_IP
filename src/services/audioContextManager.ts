export interface AudioContextManagerState {
  isInitialized: boolean;
  isSupported: boolean;
  context: AudioContext | null;
  state: 'suspended' | 'running' | 'closed' | 'not-initialized';
  lastError: Error | null;
}

interface AudioBuffer {
  online: AudioBuffer | null;
  offline: AudioBuffer | null;
}

class AudioContextManagerClass {
  private static instance: AudioContextManagerClass;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private isUnlocked = false;
  private listeners: Set<() => void> = new Set();
  private audioBuffers: AudioBuffer = { online: null, offline: null };
  private loadingPromises: Map<'online' | 'offline', Promise<AudioBuffer | null>> = new Map();

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
      this.isUnlocked = true;
      return true;
    }

    if (this.audioContext.state === 'suspended') {
      try {
        console.log('[AudioContextManager] Resuming suspended AudioContext');
        await this.audioContext.resume();
        this.isUnlocked = true;
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

  isAudioUnlocked(): boolean {
    return this.isUnlocked && this.audioContext?.state === 'running';
  }

  async loadAudioBuffer(url: string, type: 'online' | 'offline'): Promise<AudioBuffer | null> {
    if (!this.audioContext) {
      console.warn('[AudioContextManager] AudioContext not initialized, initializing now');
      await this.initialize();
      if (!this.audioContext) {
        console.error('[AudioContextManager] Failed to initialize AudioContext for buffer loading');
        return null;
      }
    }

    if (this.loadingPromises.has(type)) {
      console.log(`[AudioContextManager] Audio buffer for ${type} is already loading, waiting...`);
      return this.loadingPromises.get(type)!;
    }

    const loadPromise = (async () => {
      try {
        console.log(`[AudioContextManager] Starting to load ${type} audio from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log(`[AudioContextManager] Downloaded ${(arrayBuffer.byteLength / 1024).toFixed(2)}KB for ${type} audio`);

        const decoded = await this.audioContext!.decodeAudioData(arrayBuffer);
        console.log(`[AudioContextManager] Successfully decoded ${type} audio buffer: duration=${decoded.duration.toFixed(2)}s, channels=${decoded.numberOfChannels}`);

        this.audioBuffers[type] = decoded;
        return decoded;
      } catch (error) {
        console.error(`[AudioContextManager] Failed to load ${type} audio buffer:`, error);
        return null;
      } finally {
        this.loadingPromises.delete(type);
      }
    })();

    this.loadingPromises.set(type, loadPromise);
    return loadPromise;
  }

  playAudioBuffer(type: 'online' | 'offline', volume: number = 0.4): boolean {
    if (!this.audioContext || this.audioContext.state !== 'running') {
      console.warn('[AudioContextManager] AudioContext not available or not running, cannot play buffer');
      return false;
    }

    const buffer = this.audioBuffers[type];
    if (!buffer) {
      console.warn(`[AudioContextManager] No audio buffer loaded for ${type}, cannot play`);
      return false;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = Math.max(0, Math.min(1, volume));

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start(0);
      console.log(`[AudioContextManager] Started playing ${type} audio buffer with volume ${(volume * 100).toFixed(0)}%`);
      return true;
    } catch (error) {
      console.error(`[AudioContextManager] Error playing ${type} audio buffer:`, error);
      return false;
    }
  }

  getContext(): AudioContext | null {
    return this.audioContext;
  }

  isRunning(): boolean {
    return this.audioContext?.state === 'running';
  }

  clearAudioBuffers(): void {
    console.log('[AudioContextManager] Clearing audio buffers');
    this.audioBuffers = { online: null, offline: null };
    this.loadingPromises.clear();
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
