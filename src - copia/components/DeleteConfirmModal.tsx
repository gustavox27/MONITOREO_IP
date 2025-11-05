import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  deviceName: string;
  deviceIp: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ deviceName, deviceIp, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h2>
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
              Está a punto de eliminar el siguiente dispositivo de forma permanente:
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Nombre:</span>
                  <p className="text-gray-900 font-semibold">{deviceName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Dirección IP:</span>
                  <p className="text-gray-900 font-mono">{deviceIp}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">Advertencia Importante:</p>
                  <p>Esta acción no se puede deshacer. Se eliminarán permanentemente:</p>
                  <ul className="list-disc ml-4 mt-2 space-y-1">
                    <li>El dispositivo y su configuración</li>
                    <li>Todo el historial de eventos asociado</li>
                    <li>Los registros de monitoreo</li>
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
              Eliminar Dispositivo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
