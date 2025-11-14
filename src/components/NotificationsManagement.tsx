import { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { NotificationTester } from './NotificationTester';
import { NotificationSettings } from './NotificationSettings';

interface NotificationsManagementProps {
  userId: string;
}

export function NotificationsManagement({ userId }: NotificationsManagementProps) {
  const [activeTab, setActiveTab] = useState<'test' | 'settings'>('settings');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition font-medium ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition font-medium ${
            activeTab === 'test'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          Pruebas
        </button>
      </div>

      {activeTab === 'settings' && (
        <NotificationSettings userId={userId} />
      )}

      {activeTab === 'test' && (
        <NotificationTester />
      )}
    </div>
  );
}
