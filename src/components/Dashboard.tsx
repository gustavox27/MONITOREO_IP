import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DashboardView } from './DashboardView';
import { MonitoringView } from './MonitoringView';
import { NotificationsManagement } from './NotificationsManagement';
import { LogOut, Wifi, WifiOff, BarChart3, Monitor, Bell } from 'lucide-react';

export function Dashboard() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'monitoring' | 'notifications'>('monitoring');
  const [agentInactive, setAgentInactive] = useState(false);
  const [agentRecovered, setAgentRecovered] = useState(false);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('agent-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        lastUpdateTimeRef.current = Date.now();
        const wasInactive = agentInactive;
        setAgentInactive(false);

        if (wasInactive) {
          setAgentRecovered(true);
          if (recoveryTimerRef.current) {
            clearTimeout(recoveryTimerRef.current);
          }
          recoveryTimerRef.current = setTimeout(() => {
            setAgentRecovered(false);
          }, 5000);
        }

        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
          setAgentInactive(true);
        }, 30000);
      })
      .subscribe();

    inactivityTimerRef.current = setTimeout(() => {
      setAgentInactive(true);
    }, 30000);

    return () => {
      channel.unsubscribe();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (recoveryTimerRef.current) {
        clearTimeout(recoveryTimerRef.current);
      }
    };
  }, [agentInactive]);


  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Monitor IP</h1>
                <p className="text-xs text-gray-500">{profile?.full_name} - {profile?.role === 'administrador' ? 'Administrador' : 'Técnico'}</p>
              </div>
            </div>
<div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setCurrentView('monitoring')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                  currentView === 'monitoring'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Monitoreo</span>
              </button>
              <button
                onClick={() => setCurrentView('notifications')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                  currentView === 'notifications'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Notificaciones</span>
              </button>

              {agentInactive ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-medium text-red-700">Pérdida de conexión</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">Rastreando</span>
                </div>
              )}

              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {currentView === 'dashboard' && (
          <DashboardView />
        )}
        {currentView === 'monitoring' && (
          <MonitoringView userId={user!.id} isAdmin={isAdmin} agentInactive={agentInactive} />
        )}
        {currentView === 'notifications' && (
          <NotificationsManagement userId={user!.id} />
        )}
      </div>
    </div>
  );
}
