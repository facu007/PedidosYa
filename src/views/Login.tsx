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
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FF1744] flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-red-200 dark:shadow-none mb-3">
            P
          </div>
          <h2 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">
            Pedidos<span className="text-[#FF1744]">Ya</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-400 uppercase tracking-widest font-bold mt-1">
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
