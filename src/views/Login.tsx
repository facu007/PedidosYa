import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, User, HelpCircle, UserPlus, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, createUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    if (activeTab === 'login') {
      const res = await login(username, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Error al iniciar sesión.');
      }
    } else {
      // Public registrations default strictly to "empleado" role
      const res = await createUser({ username, role: 'empleado', passwordHash: password });
      if (res.success) {
        setSuccess('¡Usuario creado correctamente! Iniciando sesión...');
        // Auto-login
        const loginRes = await login(username, password);
        setLoading(false);
        if (!loginRes.success) {
          setError(loginRes.error || 'Usuario creado pero falló el inicio de sesión automático.');
        }
      } else {
        setLoading(false);
        setError(res.error || 'Error al registrar el usuario.');
      }
    }
  };

  // Quick login helper for convenience
  const handleQuickLogin = async (userType: 'admin' | 'empleado') => {
    setError('');
    setSuccess('');
    setLoading(true);
    const userVal = userType === 'admin' ? 'gfacu7@gmail.com' : 'empleado';
    const passVal = userType === 'admin' ? 'facu2002' : 'empleado123';
    const res = await login(userVal, passVal);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Error al iniciar sesión.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 dark:border-slate-700">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-[#FF1744] dark:text-white">
          <svg viewBox="0 0 153.6 34.6" className="h-10 w-auto mb-3" fill="currentColor">
            <path d="m91.1 9.3c-1.3 0-2.3 1-2.3 2.4 0 1.1.7 1.7 1.8 1.7 1.3 0 2.3-1 2.3-2.4 0-1-.6-1.7-1.8-1.7zm-4.1.6c0-.1-.1-.1-.2-.1h-2.9c-.1 0-.2.1-.3.2 0 0-1.1 5.6-1.2 5.9-.7-1.3-2.2-2.1-3.9-2.1-3.5 0-6.1 2.8-6.1 6.7 0 3.2 1.9 5.4 4.8 5.4 1.4 0 2.6-.6 3.5-1.6-.1.3-.1.6-.2.9 0 .1 0 .2.1.2 0 .1.1.1.2.1h2.9c.1 0 .2-.1.3-.2l3.1-15.3zm-5.6 10c-.1.4-.2.8-.4 1.1s-.4.7-.7.9c-.3.3-.6.5-.9.6-.6.3-1.4.3-2 0-.3-.1-.5-.3-.7-.5s-.3-.5-.4-.8-.1-.6-.1-1 .1-.9.3-1.3.4-.8.7-1.1.6-.5 1-.7.8-.3 1.2-.3.7.1 1 .2.5.3.7.6c.2.2.3.5.4.9 0 .6 0 1-.1 1.4zm10.2-4.8h-3c-.1 0-.2.1-.3.2l-2 10c0 .1 0 .1.1.2s.1.1.2.1h3c.1 0 .2-.1.3-.2l2-10c0-.1 0-.1-.1-.2-.1 0-.2-.1-.2-.1zm-43.6 9.6c.3-1.4.9-4.4.9-4.4h3.5c4 0 6.6-2.2 6.6-5.6 0-3-2.1-4.9-5.6-4.9h-6c-.1 0-.2.1-.3.2l-3 15.2c0 .1 0 .2.1.2 0 .1.1.1.2.1h2.7c-.1.1.7.1.9-.8zm4.5-7.7h-3c0-.1.8-3.8.8-4h2.8c1.3 0 2.1.6 2.1 1.7-.1 1.5-1 2.3-2.7 2.3zm61.3-3.1c-3.9 0-6.8 2.8-6.8 6.7 0 3.3 2.3 5.4 5.8 5.4 3.9 0 6.8-2.8 6.8-6.7-.1-3.3-2.3-5.4-5.8-5.4zm-.8 8.7c-1.5 0-2.4-.8-2.4-2.2 0-1.8 1.2-3 2.9-3 1.5 0 2.4.8 2.4 2.2 0 1.7-1.2 3-2.9 3zm-5.6-12.7c0-.1-.1-.1-.2-.1h-2.9c-.1 0-.2.1-.3.2 0 0-1.1 5.6-1.2 5.9-.7-1.3-2.2-2.1-3.9-2.1-3.5 0-6.1 2.8-6.1 6.7 0 3.2 1.9 5.4 4.8 5.4 1.4 0 2.6-.6 3.5-1.6-.1.3-.1.6-.2.9 0 .1 0 .2.1.2 0 .1.1.1.2.1h2.9c.1 0 .2-.1.3-.2l3.1-15.3s-.1 0-.1-.1zm-5.5 10c-.1.4-.2.8-.4 1.1s-.4.7-.7.9c-.3.3-.6.5-.9.6-.6.3-1.4.3-2 0-.3-.1-.5-.3-.7-.5s-.3-.5-.4-.8-.1-.6-.1-1 .1-.9.3-1.3.4-.8.7-1.1.6-.5 1-.7.8-.3 1.2-.3.7.1 1 .2.5.3.7.6c.2.2.3.5.4.9-.1.6-.1 1-.1 1.4zm27.2-5.1c-1.5-.7-3.1-1-4.5-.9-2.5.2-3.9 1.7-3.7 3.9.1 1.3.9 2.3 2.3 3.1l1.6.8c.6.3.7.5.7.7 0 .5-.5.6-.8.6-1 .1-2.2-.3-3.5-1.1h-.2c-.1 0-.1.1-.2.1l-1.3 2.2c-.1.1 0 .3.1.3 1.6 1.1 3.4 1.6 5.2 1.4 2.8-.2 4.2-1.7 4-4-.1-1.4-.8-2.3-2.3-3.1l-1.4-.7c-.8-.5-.9-.6-.9-.8 0-.1 0-.5.8-.6s1.8.2 2.8.7h.2c.1 0 .1-.1.1-.1l1-2.3c.2 0 .1-.2 0-.2zm15.7-4.5c0-.1-.1-.2-.2-.2h-4.1c-.1 0-.2 0-.2.1 0 0-4.1 5.8-4.4 6.3-.1-.5-2.1-6.2-2.1-6.2 0-.1-.1-.2-.3-.2h-3.6c-.1 0-.2 0-.2.1-.1.1-.1.2 0 .3l3.8 9.6-1.1 5.6c0 .1 0 .2.1.2.1.1.1.1.2.1h2.9c.4 0 .7-.3.8-.6l1-5.2 7.5-9.7c-.1 0-.1-.1-.1-.2zm8.7 4.3c0-.1-.1-.1-.2-.1h-2.8c-.1 0-.2.1-.2.2 0 0-.1.5-.2.9-.6-.8-1.6-1.2-2.6-1.3-.9-.1-1.8.1-2.6.4-2.8 1.1-4.6 3.8-4.6 6.8 0 2.6 1.7 4.4 4.3 4.5 1.4.1 2.6-.4 3.7-1.3-.1.3-.1.6-.2.9 0 .1 0 .1.1.2 0 .1.1.1.2.1h2.8c.1 0 .2-.1.2-.2l2.2-10.9c-.1 0-.1-.1-.1-.2zm-4.4 5.6c-.1.4-.2.8-.4 1.1s-.4.6-.7.9l-.9.6c-.6.3-1.4.3-1.9 0-.3-.1-.5-.3-.7-.5s-.3-.4-.4-.7-.1-.6-.1-1 .1-.8.3-1.2.4-.7.7-1 .6-.5.9-.7c.4-.2.7-.2 1.1-.2.3 0 .7.1.9.2.3.1.5.3.7.5s.3.5.4.9c.2.3.2.7.1 1.1zm-83.2-6.3c-3.9 0-6.7 2.8-6.7 6.7 0 3.3 2.3 5.4 5.9 5.4 1.6 0 3-.4 4.4-1.4.1-.1.1-.3 0-.4l-1.8-1.8c-.1-.1-.2-.1-.3 0-.8.4-1.5.6-2.3.6-1.7 0-2.6-.8-2.6-2.1h8.1c.1 0 .2-.1.3-.2.2-.8.3-1.4.3-2.1-.1-2.9-2.1-4.7-5.3-4.7zm-3 4.5c.5-1.3 1.5-1.9 2.9-1.9 1.5 0 2.2.7 2.2 2-.2-.1-4.9-.1-5.1-.1zm-39-18.3h-23.3c-.4 0-.6.2-.6.6v3.3c0 3.7 2.6 5.7 7.3 5.7h16.7c1.8 0 3.2 1.4 3.2 3.2s-1.4 3.2-3.2 3.2h-18.8c-.3 0-.5.2-.6.4l-4.3 17.5c0 .2 0 .4.1.5s.3.2.5.2h5.9c2.2 0 3.3-1.8 3.5-2.8l1.7-6.3h11.9c7 0 12.8-5.7 12.8-12.8 0-7-5.7-12.7-12.8-12.7z"/>
          </svg>
          <p className="text-xs text-slate-455 dark:text-slate-400 uppercase tracking-widest font-extrabold mt-1">
            Control de Vencimientos
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 dark:bg-slate-750 p-1 rounded-2xl mb-6">
          <button
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-[#FF1744] text-[#FF1744] dark:text-red-400 text-sm font-semibold rounded-r-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 bg-emerald-50 dark:bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-600 dark:text-emerald-400 text-sm font-semibold rounded-r-xl">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Usuario
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario o email"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* Password Input with show/hide password toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Key className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744] transition-all text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#FF1744] text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {activeTab === 'login' ? (
              <>
                <LogIn className="w-5 h-5" />
                <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>{loading ? 'Creando cuenta...' : 'Crear Cuenta'}</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-slate-100 dark:border-slate-700"></div>
          <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Acceso rápido</span>
          <div className="flex-grow border-t border-slate-100 dark:border-slate-700"></div>
        </div>

        {/* Quick entry links */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleQuickLogin('admin')}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            🔑 Entrar como Admin
          </button>
          <button
            onClick={() => handleQuickLogin('empleado')}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            👤 Entrar como Empleado
          </button>
        </div>

        {/* Demo info note */}
        <div className="mt-6 flex gap-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl text-xs text-slate-500 dark:text-slate-400">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="font-bold">Usuarios demo:</span>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 font-medium">
              <li>Admin: <code className="text-slate-800 dark:text-slate-350 bg-slate-200/50 dark:bg-slate-700 px-1 rounded">gfacu7@gmail.com</code> / <code className="text-slate-800 dark:text-slate-350 bg-slate-200/50 dark:bg-slate-700 px-1 rounded">facu2002</code></li>
              <li>Empleado: <code className="text-slate-800 dark:text-slate-350 bg-slate-200/50 dark:bg-slate-700 px-1 rounded">empleado</code> / <code className="text-slate-800 dark:text-slate-350 bg-slate-200/50 dark:bg-slate-700 px-1 rounded">empleado123</code></li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};
