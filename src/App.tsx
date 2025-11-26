import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage, RegisterPage } from './components/AuthPages';
import { Dashboard } from './components/Dashboard';
import { AudioInitializationBanner } from './components/AudioInitializationBanner';
import { audioInitializationService } from './services/audioInitializationService';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<'login' | 'register' | 'dashboard'>('login');

  useEffect(() => {
    audioInitializationService.setup();
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/register') {
      setPage('register');
    } else if (path === '/login') {
      setPage('login');
    } else if (user) {
      setPage('dashboard');
    }
  }, [user]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/register') {
        setPage('register');
      } else if (path === '/login') {
        setPage('login');
      } else if (user) {
        setPage('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('/')) {
        e.preventDefault();
        const href = target.getAttribute('href');
        window.history.pushState({}, '', href);
        if (href === '/register') {
          setPage('register');
        } else if (href === '/login') {
          setPage('login');
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return page === 'register' ? <RegisterPage /> : <LoginPage />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AudioInitializationBanner />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
