import { supabase } from '../lib/supabase';

export const SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp3'];
export const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.webm'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_DURATION = 10;
export const RECOMMENDED_DURATION = 5;

export interface AudioFileInfo {
  duration: number;
  size: number;
  format: string;
}

export interface UploadResult {
  url: string;
  name: string;
  duration: number;
  size: number;
}

export const audioStorageService = {
  async validateAudioFile(file: File): Promise<{ valid: boolean; error?: string; info?: AudioFileInfo }> {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!SUPPORTED_EXTENSIONS.includes(fileExtension)) {
      return {
        valid: false,
        error: `Formato no soportado. Usa: ${SUPPORTED_EXTENSIONS.join(', ')}`
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Archivo demasiado grande. Máximo: 5MB (Tu archivo: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      };
    }

    try {
      const duration = await this.getAudioDuration(file);
      if (duration > MAX_DURATION) {
        return {
          valid: false,
          error: `Duración demasiada larga. Máximo: ${MAX_DURATION}s (Tu archivo: ${duration.toFixed(1)}s)`
        };
      }

      return {
        valid: true,
        info: {
          duration,
          size: file.size,
          format: file.type || fileExtension
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: 'No se pudo leer la duración del archivo. Intenta con otro archivo.'
      };
    }
  },

  async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio file'));
      };

      audio.src = url;
    });
  },

  async uploadSound(
    file: File,
    userId: string,
    soundType: 'online' | 'offline',
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const validation = await this.validateAudioFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (!validation.info) {
      throw new Error('No se pudo validar el archivo');
    }

    const timestamp = Date.now();
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    const fileName = `${userId}-${soundType}-${timestamp}${fileExtension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('notification-sounds')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('notification-sounds').getPublicUrl(fileName);

      if (!data.publicUrl) {
        throw new Error('No se pudo obtener la URL del archivo');
      }

      return {
        url: data.publicUrl,
        name: file.name,
        duration: validation.info.duration,
        size: validation.info.size
      };
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error instanceof Error ? error : new Error('Error al subir el archivo');
    }
  },

  async deleteSound(fileName: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from('notification-sounds').remove([fileName]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting audio:', error);
      throw error instanceof Error ? error : new Error('Error al eliminar el archivo');
    }
  },

  async deleteSoundByUrl(url: string): Promise<void> {
    try {
      const fileName = url.split('/').pop();
      if (!fileName) {
        throw new Error('Invalid URL');
      }
      await this.deleteSound(fileName);
    } catch (error) {
      console.error('Error deleting sound by URL:', error);
    }
  },

  playAudio(url: string, volume: number = 0.5): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.src = url;

        audio.onended = () => {
          resolve();
        };

        audio.onerror = () => {
          reject(new Error('Failed to play audio'));
        };

        audio.play().catch((error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  preloadAudio(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        audio.src = url;

        audio.oncanplay = () => {
          resolve();
        };

        audio.onerror = () => {
          reject(new Error('Failed to load audio'));
        };

        audio.load();
      } catch (error) {
        reject(error);
      }
    });
  },

  extractFileNameFromUrl(url: string): string {
    return url.split('/').pop() || '';
  }
};
