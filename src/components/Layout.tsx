import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Plus, 
  BarChart3, 
  Settings, 
  LogOut, 
  Sun, 
  Moon,
  Download,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: string) => void;
  onOpenAddModal: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, onOpenAddModal }) => {
  const { user, logout } = useAuth();
  const { config, saveConfig } = useApp();
  
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);

  const toggleTheme = () => {
    const newTheme = config.theme === 'light' ? 'dark' : 'light';
    saveConfig({ ...config, theme: newTheme });
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Sync theme class on mount
  React.useEffect(() => {
    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.theme]);

  // Handle PWA installation prompts
  React.useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Check if iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setShowIOSPrompt(true);
      } else {
        alert('Para descargar la aplicación, abre el menú de opciones de tu navegador (los tres puntos en Chrome/Edge o ajustes) y presiona "Añadir a la pantalla de inicio" o "Instalar aplicación".');
      }
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Historial', icon: ClipboardList },
    { id: 'add-trigger', label: 'Agregar', icon: Plus, isAction: true },
    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Sidebar - Desktop only */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Brand Logo Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[#FF1744] dark:text-white">
            <svg viewBox="0 0 153.6 34.6" className="h-7 w-auto" fill="currentColor">
              <path d="m91.1 9.3c-1.3 0-2.3 1-2.3 2.4 0 1.1.7 1.7 1.8 1.7 1.3 0 2.3-1 2.3-2.4 0-1-.6-1.7-1.8-1.7zm-4.1.6c0-.1-.1-.1-.2-.1h-2.9c-.1 0-.2.1-.3.2 0 0-1.1 5.6-1.2 5.9-.7-1.3-2.2-2.1-3.9-2.1-3.5 0-6.1 2.8-6.1 6.7 0 3.2 1.9 5.4 4.8 5.4 1.4 0 2.6-.6 3.5-1.6-.1.3-.1.6-.2.9 0 .1 0 .2.1.2 0 .1.1.1.2.1h2.9c.1 0 .2-.1.3-.2l3.1-15.3zm-5.6 10c-.1.4-.2.8-.4 1.1s-.4.7-.7.9c-.3.3-.6.5-.9.6-.6.3-1.4.3-2 0-.3-.1-.5-.3-.7-.5s-.3-.5-.4-.8-.1-.6-.1-1 .1-.9.3-1.3.4-.8.7-1.1.6-.5 1-.7.8-.3 1.2-.3.7.1 1 .2.5.3.7.6c.2.2.3.5.4.9 0 .6 0 1-.1 1.4zm10.2-4.8h-3c-.1 0-.2.1-.3.2l-2 10c0 .1 0 .1.1.2s.1.1.2.1h3c.1 0 .2-.1.3-.2l2-10c0-.1 0-.1-.1-.2-.1 0-.2-.1-.2-.1zm-43.6 9.6c.3-1.4.9-4.4.9-4.4h3.5c4 0 6.6-2.2 6.6-5.6 0-3-2.1-4.9-5.6-4.9h-6c-.1 0-.2.1-.3.2l-3 15.2c0 .1 0 .2.1.2 0 .1.1.1.2.1h2.7c-.1.1.7.1.9-.8zm4.5-7.7h-3c0-.1.8-3.8.8-4h2.8c1.3 0 2.1.6 2.1 1.7-.1 1.5-1 2.3-2.7 2.3zm61.3-3.1c-3.9 0-6.8 2.8-6.8 6.7 0 3.3 2.3 5.4 5.8 5.4 3.9 0 6.8-2.8 6.8-6.7-.1-3.3-2.3-5.4-5.8-5.4zm-.8 8.7c-1.5 0-2.4-.8-2.4-2.2 0-1.8 1.2-3 2.9-3 1.5 0 2.4.8 2.4 2.2 0 1.7-1.2 3-2.9 3zm-5.6-12.7c0-.1-.1-.1-.2-.1h-2.9c-.1 0-.2.1-.3.2 0 0-1.1 5.6-1.2 5.9-.7-1.3-2.2-2.1-3.9-2.1-3.5 0-6.1 2.8-6.1 6.7 0 3.2 1.9 5.4 4.8 5.4 1.4 0 2.6-.6 3.5-1.6-.1.3-.1.6-.2.9 0 .1 0 .2.1.2 0 .1.1.1.2.1h2.9c.1 0 .2-.1.3-.2l3.1-15.3s-.1 0-.1-.1zm-5.5 10c-.1.4-.2.8-.4 1.1s-.4.7-.7.9c-.3.3-.6.5-.9.6-.6.3-1.4.3-2 0-.3-.1-.5-.3-.7-.5s-.3-.5-.4-.8-.1-.6-.1-1 .1-.9.3-1.3.4-.8.7-1.1.6-.5 1-.7.8-.3 1.2-.3.7.1 1 .2.5.3.7.6c.2.2.3.5.4.9-.1.6-.1 1-.1 1.4zm27.2-5.1c-1.5-.7-3.1-1-4.5-.9-2.5.2-3.9 1.7-3.7 3.9.1 1.3.9 2.3 2.3 3.1l1.6.8c.6.3.7.5.7.7 0 .5-.5.6-.8.6-1 .1-2.2-.3-3.5-1.1h-.2c-.1 0-.1.1-.2.1l-1.3 2.2c-.1.1 0 .3.1.3 1.6 1.1 3.4 1.6 5.2 1.4 2.8-.2 4.2-1.7 4-4-.1-1.4-.8-2.3-2.3-3.1l-1.4-.7c-.8-.5-.9-.6-.9-.8 0-.1 0-.5.8-.6s1.8.2 2.8.7h.2c.1 0 .1-.1.1-.1l1-2.3c.2 0 .1-.2 0-.2zm15.7-4.5c0-.1-.1-.2-.2-.2h-4.1c-.1 0-.2 0-.2.1 0 0-4.1 5.8-4.4 6.3-.1-.5-2.1-6.2-2.1-6.2 0-.1-.1-.2-.3-.2h-3.6c-.1 0-.2 0-.2.1-.1.1-.1.2 0 .3l3.8 9.6-1.1 5.6c0 .1 0 .2.1.2.1.1.1.1.2.1h2.9c.4 0 .7-.3.8-.6l1-5.2 7.5-9.7c-.1 0-.1-.1-.1-.2zm8.7 4.3c0-.1-.1-.1-.2-.1h-2.8c-.1 0-.2.1-.2.2 0 0-.1.5-.2.9-.6-.8-1.6-1.2-2.6-1.3-.9-.1-1.8.1-2.6.4-2.8 1.1-4.6 3.8-4.6 6.8 0 2.6 1.7 4.4 4.3 4.5 1.4.1 2.6-.4 3.7-1.3-.1.3-.1.6-.2.9 0 .1 0 .1.1.2 0 .1.1.1.2.1h2.8c.1 0 .2-.1.2-.2l2.2-10.9c-.1 0-.1-.1-.1-.2zm-4.4 5.6c-.1.4-.2.8-.4 1.1s-.4.6-.7.9l-.9.6c-.6.3-1.4.3-1.9 0-.3-.1-.5-.3-.7-.5s-.3-.4-.4-.7-.1-.6-.1-1 .1-.8.3-1.2.4-.7.7-1 .6-.5.9-.7c.4-.2.7-.2 1.1-.2.3 0 .7.1.9.2.3.1.5.3.7.5s.3.5.4.9c.2.3.2.7.1 1.1zm-83.2-6.3c-3.9 0-6.7 2.8-6.7 6.7 0 3.3 2.3 5.4 5.9 5.4 1.6 0 3-.4 4.4-1.4.1-.1.1-.3 0-.4l-1.8-1.8c-.1-.1-.2-.1-.3 0-.8.4-1.5.6-2.3.6-1.7 0-2.6-.8-2.6-2.1h8.1c.1 0 .2-.1.3-.2.2-.8.3-1.4.3-2.1-.1-2.9-2.1-4.7-5.3-4.7zm-3 4.5c.5-1.3 1.5-1.9 2.9-1.9 1.5 0 2.2.7 2.2 2-.2-.1-4.9-.1-5.1-.1zm-39-18.3h-23.3c-.4 0-.6.2-.6.6v3.3c0 3.7 2.6 5.7 7.3 5.7h16.7c1.8 0 3.2 1.4 3.2 3.2s-1.4 3.2-3.2 3.2h-18.8c-.3 0-.5.2-.6.4l-4.3 17.5c0 .2 0 .4.1.5s.3.2.5.2h5.9c2.2 0 3.3-1.8 3.5-2.8l1.7-6.3h11.9c7 0 12.8-5.7 12.8-12.8 0-7-5.7-12.7-12.8-12.7z"/>
            </svg>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-450 uppercase tracking-widest font-extrabold px-1">
            Control de Vencimientos
          </span>
        </div>

        {/* User profile card */}
        {user && (
          <div className="p-4 mx-4 my-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FF1744]/10 text-[#FF1744] dark:bg-[#FF1744]/20 dark:text-red-400 flex items-center justify-center font-bold">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-slate-850 dark:text-slate-200 truncate">{user.username}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.isAction) {
              return (
                <button
                  key={item.id}
                  onClick={onOpenAddModal}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FF1744] text-white hover:bg-red-600 transition-all font-semibold shadow-md shadow-red-200 dark:shadow-none my-3 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nuevo Producto</span>
                </button>
              );
            }

            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-50 text-[#FF1744] font-bold dark:bg-red-500/10 dark:text-red-400'
                    : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-455 dark:hover:bg-slate-700 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2">
          {/* Download/Install PWA button */}
          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-slate-650 dark:text-slate-350 hover:bg-[#FF1744]/10 hover:text-[#FF1744] dark:hover:bg-[#FF1744]/20 transition-all text-xs font-bold border border-dashed border-[#FF1744]/30 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#FF1744]" />
              <span>Instalar Aplicación</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              {config.theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>Modo {config.theme === 'light' ? 'Oscuro' : 'Claro'}</span>
            </span>
            <span className="w-8 h-4 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center p-0.5 transition-all">
              <span className={`w-3 h-3 rounded-full bg-white dark:bg-slate-800 shadow-sm transition-all transform ${
                config.theme === 'dark' ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-350 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all text-sm font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <header className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 text-[#FF1744] dark:text-white">
          <svg viewBox="0 0 153.6 34.6" className="h-6 w-auto" fill="currentColor">
            <path d="m91.1 9.3c-1.3 0-2.3 1-2.3 2.4 0 1.1.7 1.7 1.8 1.7 1.3 0 2.3-1 2.3-2.4 0-1-.6-1.7-1.8-1.7zm-4.1.6c0-.1-.1-.1-.2-.1h-2.9c-.1 0-.2.1-.3.2 0 0-1.1 5.6-1.2 5.9-.7-1.3-2.2-2.1-3.9-2.1-3.5 0-6.1 2.8-6.1 6.7 0 3.2 1.9 5.4 4.8 5.4 1.4 0 2.6-.6 3.5-1.6-.1.3-.1.6-.2.9 0 .1 0 .2.1.2 0 .1.1.1.2.1h2.9c.1 0 .2-.1.3-.2l3.1-15.3zm-5.6 10c-.1.4-.2.8-.4 1.1s-.4.7-.7.9c-.3.3-.6.5-.9.6-.6.3-1.4.3-2 0-.3-.1-.5-.3-.7-.5s-.3-.5-.4-.8-.1-.6-.1-1 .1-.9.3-1.3.4-.8.7-1.1.6-.5 1-.7.8-.3 1.2-.3.7.1 1 .2.5.3.7.6c.2.2.3.5.4.9 0 .6 0 1-.1 1.4zm10.2-4.8h-3c-.1 0-.2.1-.3.2l-2 10c0 .1 0 .1.1.2s.1.1.2.1h3c.1 0 .2-.1.3-.2l2-10c0-.1 0-.1-.1-.2-.1 0-.2-.1-.2-.1zm-43.6 9.6c.3-1.4.9-4.4.9-4.4h3.5c4 0 6.6-2.2 6.6-5.6 0-3-2.1-4.9-5.6-4.9h-6c-.1 0-.2.1-.3.2l-3 15.2c0 .1 0 .2.1.2 0 .1.1.1.2.1h2.7c-.1.1.7.1.9-.8zm4.5-7.7h-3c0-.1.8-3.8.8-4h2.8c1.3 0 2.1.6 2.1 1.7-.1 1.5-1 2.3-2.7 2.3zm61.3-3.1c-3.9 0-6.8 2.8-6.8 6.7 0 3.3 2.3 5.4 5.8 5.4 3.9 0 6.8-2.8 6.8-6.7-.1-3.3-2.3-5.4-5.8-5.4zm-.8 8.7c-1.5 0-2.4-.8-2.4-2.2 0-1.8 1.2-3 2.9-3 1.5 0 2.4.8 2.4 2.2 0 1.7-1.2 3-2.9 3zm-5.6-12.7c0-.1-.1-.1-.2-.1h-2.9c-.1 0-.2.1-.3.2 0 0-1.1 5.6-1.2 5.9-.7-1.3-2.2-2.1-3.9-2.1-3.5 0-6.1 2.8-6.1 6.7 0 3.2 1.9 5.4 4.8 5.4 1.4 0 2.6-.6 3.5-1.6-.1.3-.1.6-.2.9 0 .1 0 .2.1.2 0 .1.1.1.2.1h2.9c.1 0 .2-.1.3-.2l3.1-15.3s-.1 0-.1-.1zm-5.5 10c-.1.4-.2.8-.4 1.1s-.4.7-.7.9c-.3.3-.6.5-.9.6-.6.3-1.4.3-2 0-.3-.1-.5-.3-.7-.5s-.3-.5-.4-.8-.1-.6-.1-1 .1-.9.3-1.3.4-.8.7-1.1.6-.5 1-.7.8-.3 1.2-.3.7.1 1 .2.5.3.7.6c.2.2.3.5.4.9-.1.6-.1 1-.1 1.4zm27.2-5.1c-1.5-.7-3.1-1-4.5-.9-2.5.2-3.9 1.7-3.7 3.9.1 1.3.9 2.3 2.3 3.1l1.6.8c.6.3.7.5.7.7 0 .5-.5.6-.8.6-1 .1-2.2-.3-3.5-1.1h-.2c-.1 0-.1.1-.2.1l-1.3 2.2c-.1.1 0 .3.1.3 1.6 1.1 3.4 1.6 5.2 1.4 2.8-.2 4.2-1.7 4-4-.1-1.4-.8-2.3-2.3-3.1l-1.4-.7c-.8-.5-.9-.6-.9-.8 0-.1 0-.5.8-.6s1.8.2 2.8.7h.2c.1 0 .1-.1.1-.1l1-2.3c.2 0 .1-.2 0-.2zm15.7-4.5c0-.1-.1-.2-.2-.2h-4.1c-.1 0-.2 0-.2.1 0 0-4.1 5.8-4.4 6.3-.1-.5-2.1-6.2-2.1-6.2 0-.1-.1-.2-.3-.2h-3.6c-.1 0-.2 0-.2.1-.1.1-.1.2 0 .3l3.8 9.6-1.1 5.6c0 .1 0 .2.1.2.1.1.1.1.2.1h2.9c.4 0 .7-.3.8-.6l1-5.2 7.5-9.7c-.1 0-.1-.1-.1-.2zm8.7 4.3c0-.1-.1-.1-.2-.1h-2.8c-.1 0-.2.1-.2.2 0 0-.1.5-.2.9-.6-.8-1.6-1.2-2.6-1.3-.9-.1-1.8.1-2.6.4-2.8 1.1-4.6 3.8-4.6 6.8 0 2.6 1.7 4.4 4.3 4.5 1.4.1 2.6-.4 3.7-1.3-.1.3-.1.6-.2.9 0 .1 0 .1.1.2 0 .1.1.1.2.1h2.8c.1 0 .2-.1.2-.2l2.2-10.9c-.1 0-.1-.1-.1-.2zm-4.4 5.6c-.1.4-.2.8-.4 1.1s-.4.6-.7.9l-.9.6c-.6.3-1.4.3-1.9 0-.3-.1-.5-.3-.7-.5s-.3-.4-.4-.7-.1-.6-.1-1 .1-.8.3-1.2.4-.7.7-1 .6-.5.9-.7c.4-.2.7-.2 1.1-.2.3 0 .7.1.9.2.3.1.5.3.7.5s.3.5.4.9c.2.3.2.7.1 1.1zm-83.2-6.3c-3.9 0-6.7 2.8-6.7 6.7 0 3.3 2.3 5.4 5.9 5.4 1.6 0 3-.4 4.4-1.4.1-.1.1-.3 0-.4l-1.8-1.8c-.1-.1-.2-.1-.3 0-.8.4-1.5.6-2.3.6-1.7 0-2.6-.8-2.6-2.1h8.1c.1 0 .2-.1.3-.2.2-.8.3-1.4.3-2.1-.1-2.9-2.1-4.7-5.3-4.7zm-3 4.5c.5-1.3 1.5-1.9 2.9-1.9 1.5 0 2.2.7 2.2 2-.2-.1-4.9-.1-5.1-.1zm-39-18.3h-23.3c-.4 0-.6.2-.6.6v3.3c0 3.7 2.6 5.7 7.3 5.7h16.7c1.8 0 3.2 1.4 3.2 3.2s-1.4 3.2-3.2 3.2h-18.8c-.3 0-.5.2-.6.4l-4.3 17.5c0 .2 0 .4.1.5s.3.2.5.2h5.9c2.2 0 3.3-1.8 3.5-2.8l1.7-6.3h11.9c7 0 12.8-5.7 12.8-12.8 0-7-5.7-12.7-12.8-12.7z"/>
          </svg>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 transition-all cursor-pointer"
            aria-label="Toggle Theme"
          >
            {config.theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Logout button */}
          <button
            onClick={logout}
            className="p-2 rounded-full hover:bg-red-50 text-slate-650 dark:text-slate-355 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all cursor-pointer"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile PWA Install Banner */}
      {!isStandalone && (
        <div className="md:hidden bg-gradient-to-r from-[#FF1744] to-[#E30032] text-white px-4 py-3 flex items-center justify-between shadow-md z-10 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-xs leading-tight">Descargar App</p>
              <p className="text-[9px] opacity-90 font-medium text-slate-100">Lleva el control de vencimientos en tu pantalla de inicio</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="bg-white text-[#FF1744] px-3.5 py-1.5 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            Instalar
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-24 md:pb-6 p-4 md:p-8">
        <div className="max-w-6xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar - Thumb friendly */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-2 py-1 flex items-center justify-around shadow-lg z-20 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isAction) {
            return (
              <button
                key={item.id}
                onClick={onOpenAddModal}
                className="w-14 h-14 rounded-full bg-[#FF1744] text-white flex items-center justify-center shadow-md shadow-red-200 dark:shadow-none -mt-5 border-4 border-slate-50 dark:border-slate-900 focus:outline-none hover:scale-105 active:scale-95 transition-all cursor-pointer"
                aria-label="Agregar producto"
              >
                <Plus className="w-7 h-7 stroke-[3]" />
              </button>
            );
          }

          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg focus:outline-none transition-all cursor-pointer ${
                isActive 
                  ? 'text-[#FF1744] font-bold' 
                  : 'text-slate-400 dark:text-slate-450'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* iOS Install Prompt Dialog */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full border border-slate-100 dark:border-slate-700 shadow-2xl space-y-4 relative animate-scale-up">
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 transition-all cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-12 h-12 rounded-2xl bg-[#FF1744]/10 text-[#FF1744] flex items-center justify-center mx-auto">
              <Download className="w-6 h-6" />
            </div>
            
            <div className="text-center">
              <h3 className="font-extrabold text-base text-slate-850 dark:text-white">Instalar en tu iPhone o iPad</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                Lleva la aplicación en tu pantalla de inicio siguiendo estos sencillos pasos:
              </p>
            </div>

            <ol className="text-xs text-slate-650 dark:text-slate-300 text-left list-decimal pl-5 space-y-2.5 font-semibold pt-2">
              <li>
                Pulsa el botón de <strong>Compartir</strong> en la barra inferior de Safari (el ícono del cuadro con la flecha hacia arriba).
              </li>
              <li>
                Desplázate por el menú y selecciona <strong>Añadir a la pantalla de inicio</strong>.
              </li>
              <li>
                Confirma el nombre y presiona <strong>Añadir</strong> en la esquina superior derecha.
              </li>
            </ol>

            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-3 mt-2 bg-[#FF1744] hover:bg-red-650 text-white font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm shadow-red-200 dark:shadow-none"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
