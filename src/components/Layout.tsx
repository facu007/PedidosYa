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
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FF1744] flex items-center justify-center text-white font-bold text-lg shadow-md shadow-red-200 dark:shadow-none">
            P
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-850 dark:text-white leading-tight">
              Pedidos<span className="text-[#FF1744]">Ya</span>
            </h1>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-widest font-semibold">
              Vencimientos
            </span>
          </div>
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FF1744] flex items-center justify-center text-white font-bold text-base shadow-sm">
            P
          </div>
          <h1 className="font-extrabold text-base text-slate-850 dark:text-white leading-tight">
            Pedidos<span className="text-[#FF1744]">Ya</span>
          </h1>
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
