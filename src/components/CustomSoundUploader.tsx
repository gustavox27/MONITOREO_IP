import { useState, useRef } from 'react';
import { Upload, Play, Trash2, Loader, AlertCircle, CheckCircle, Volume2 } from 'lucide-react';
import {
  audioStorageService,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE,
  MAX_DURATION,
  RECOMMENDED_DURATION,
  type UploadResult
} from '../services/audioStorageService';

interface CustomSoundUploaderProps {
  soundType: 'online' | 'offline';
  currentUrl?: string | null;
  currentName?: string | null;
  currentDuration?: number | null;
  onUploadSuccess: (result: UploadResult) => void;
  onDelete: () => void;
  volume: number;
}

export function CustomSoundUploader({
  soundType,
  currentUrl,
  currentName,
  currentDuration,
  onUploadSuccess,
  onDelete,
  volume
}: CustomSoundUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusLabel = soundType === 'online' ? 'En Línea' : 'Fuera de Línea';
  const statusEmoji = soundType === 'online' ? '✓' : '✗';

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await audioStorageService.uploadSound(file, 'temp-user', soundType);
      onUploadSuccess(result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al subir el archivo';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleTestPlay = async () => {
    if (!currentUrl) return;

    setTestPlaying(true);
    try {
      await audioStorageService.playAudio(currentUrl, volume);
    } catch (err) {
      console.error('Error playing test audio:', err);
    } finally {
      setTestPlaying(false);
    }
  };

  const handleDelete = () => {
    if (currentUrl) {
      audioStorageService.deleteSoundByUrl(currentUrl).catch((err) => {
        console.error('Error deleting sound:', err);
      });
    }
    onDelete();
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">
          <span className="text-lg mr-2">{statusEmoji}</span>
          Sonido para Estado "{statusLabel}"
        </h4>
        <p className="text-sm text-gray-600">
          Formatos: {SUPPORTED_EXTENSIONS.join(', ')} • Máximo: 5MB • Recomendado: {RECOMMENDED_DURATION}s (Máximo: {MAX_DURATION}s)
        </p>
      </div>

      {currentUrl && currentName ? (
        <div className="bg-white border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="font-medium text-gray-900 truncate">{currentName}</p>
              </div>
              <p className="text-sm text-gray-600 ml-6">
                Duración: {currentDuration ? currentDuration.toFixed(1) : '?'}s
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={handleTestPlay}
                disabled={testPlaying || loading}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium whitespace-nowrap"
              >
                {testPlaying ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Reproduciendo
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Probar
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          disabled={loading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          {loading ? (
            <>
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-gray-900">Subiendo archivo...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400" />
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Haz clic para subir
                </button>
                <p className="text-xs text-gray-500 mt-1">o arrastra y suelta un archivo</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">Archivo subido correctamente</p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
        <Volume2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          El sonido se reproducirá con el volumen configurado ({Math.round(volume * 100)}%)
        </p>
      </div>
    </div>
  );
}
