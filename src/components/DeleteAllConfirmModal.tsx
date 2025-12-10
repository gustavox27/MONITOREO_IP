import { AlertTriangle, X } from 'lucide-react';

interface DeleteAllConfirmModalProps {
  deviceCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAllConfirmModal({ deviceCount, onConfirm, onCancel }: DeleteAllConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Eliminar Todos los Dispositivos</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Está a punto de eliminar <strong>{deviceCount} dispositivo{deviceCount !== 1 ? 's' : ''}</strong> de forma permanente.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Advertencia:</p>
                  <p>Esta acción no se puede deshacer. Se eliminarán permanentemente:</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <ul className="list-disc ml-4 space-y-1">
                    <li>Todos los {deviceCount} dispositivo{deviceCount !== 1 ? 's' : ''} y su configuración</li>
                    <li>Todo el historial de eventos asociado</li>
                    <li>Todos los registros de monitoreo</li>
                    <li>Las preferencias de notificación de cada dispositivo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
