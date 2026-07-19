import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { syncService } from '../services/syncService';
import { useAudio } from '../hooks/useAudio';
import { dbService } from '../services/db';
import { 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  Database, 
  Download, 
  Upload, 
  CloudLightning,
  Shield,
  Activity,
  RefreshCw,
  X,
  Users,
  UserPlus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { user: currentUser, users, createUser, deleteUser } = useAuth();
  const { config, saveConfig, auditLogs, products, refreshData } = useApp();
  const { playSuccess, playError } = useAudio();
  const isAdmin = currentUser?.role === 'admin';

  // Local state for Sync Configuration
  const [syncProvider, setSyncProvider] = useState<'firebase' | 'supabase'>(config.syncProvider || 'firebase');
  const [apiKey, setApiKey] = useState(config.firebaseConfig?.apiKey || '');
  const [projectId, setProjectId] = useState(config.firebaseConfig?.projectId || '');
  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseConfig?.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(config.supabaseConfig?.anonKey || '');
  const [syncEnabled, setSyncEnabled] = useState(config.syncEnabled);
  const [syncStatus, setSyncStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ success: boolean; message: string } | null>(null);

  // Local state for system updates
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  // Local state for user management
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'empleado'>('empleado');
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [showAddUserPassword, setShowAddUserPassword] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);
    if (!newUsername.trim() || !newPassword.trim()) {
      setUserError('Complete usuario y contraseña.');
      playError();
      return;
    }
    const res = await createUser({
      username: newUsername.trim(),
      passwordHash: newPassword.trim(),
      role: newRole,
    });
    if (res.success) {
      setUserSuccess(`Usuario "${newUsername}" creado con éxito.`);
      setNewUsername('');
      setNewPassword('');
      playSuccess();
    } else {
      setUserError(res.error || 'Error al crear el usuario.');
      playError();
    }
  };

  const handleDeleteUser = async (username: string) => {
    setUserError(null);
    setUserSuccess(null);
    if (username === currentUser?.username) {
      setUserError('No puedes eliminar tu propio usuario activo.');
      playError();
      return;
    }
    if (username === 'admin') {
      setUserError('No se puede eliminar el usuario administrador predeterminado.');
      playError();
      return;
    }
    if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${username}"?`)) {
      const res = await deleteUser(username);
      if (res.success) {
        setUserSuccess(`Usuario "${username}" eliminado.`);
        playSuccess();
      } else {
        setUserError(res.error || 'Error al eliminar usuario.');
        playError();
      }
    }
  };

  // Backup data
  const handleBackup = () => {
    try {
      const backupData = {
        products,
        config,
        auditLogs,
        backupVersion: '1.0',
        timestamp: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_pedidosya_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      playSuccess();
    } catch (e) {
      playError();
      alert('Error al generar la copia de seguridad.');
    }
  };

  // Restore data
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawJson = event.target?.result as string;
        const backup = JSON.parse(rawJson);

        if (!backup.products || !backup.config || !backup.auditLogs) {
          throw new Error('Formato de copia de seguridad inválido.');
        }

        // Restore in DB
        await dbService.restoreData(backup.products, backup.config, backup.auditLogs);
        await refreshData();
        setRestoreMessage({ success: true, message: 'Copia de seguridad restaurada correctamente.' });
        playSuccess();
      } catch (err: any) {
        setRestoreMessage({ success: false, message: `Error al restaurar: ${err.message || err}` });
        playError();
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Save Settings Changes (alertDays, soundEnabled)
  const handleAlertDaysChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isAdmin) return;
    const days = parseInt(e.target.value, 10);
    await saveConfig({ ...config, alertDays: days });
    playSuccess();
  };

  const toggleSound = async () => {
    if (!isAdmin) return;
    const newState = !config.soundEnabled;
    await saveConfig({ ...config, soundEnabled: newState });
    if (newState) {
      // Play a success sound to confirm it's working
      setTimeout(() => {
        playSuccess();
      }, 100);
    }
  };

  // Save Sincronización configuration
  const handleSaveSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    await saveConfig({
      ...config,
      syncEnabled,
      syncProvider,
      firebaseConfig: {
        apiKey,
        projectId,
        authDomain: `${projectId}.firebaseapp.com`,
        storageBucket: `${projectId}.appspot.com`,
        messagingSenderId: '123456789',
        appId: '1:123456789:web:123456789',
      },
      supabaseConfig: {
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      }
    });
    playSuccess();
    setSyncStatus({ success: true, message: 'Configuración de sincronización guardada.' });
  };

  // Trigger Sync Now
  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncStatus(null);
    const tempConfig = {
      ...config,
      syncEnabled: true,
      syncProvider,
      firebaseConfig: {
        apiKey,
        projectId,
        authDomain: `${projectId}.firebaseapp.com`,
        storageBucket: `${projectId}.appspot.com`,
        messagingSenderId: '123456789',
        appId: '1:123456789:web:123456789',
      },
      supabaseConfig: {
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
      }
    };
    const result = await syncService.syncData(tempConfig);
    setSyncing(false);
    setSyncStatus({ success: result.success, message: result.message });
    if (result.success) {
      playSuccess();
      await refreshData();
    } else {
      playError();
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateMsg(null);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        if (registration.waiting) {
          setUpdateMsg('¡Nueva versión encontrada! Recargando para aplicar...');
          playSuccess();
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          setUpdateMsg('La aplicación ya está en su versión más reciente.');
          playSuccess();
        }
      } else {
        setUpdateMsg('Las actualizaciones no están soportadas en este navegador.');
        playError();
      }
    } catch (e) {
      console.error(e);
      setUpdateMsg('Error al buscar actualizaciones.');
      playError();
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-black dark:text-white">Configuración y Auditoría</h2>
        <p className="text-xs text-slate-900 dark:text-slate-400 mt-0.5 font-semibold">Controla las alertas de vencimiento, copias de seguridad y auditoría de la sucursal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: App configuration & Sync */}
        <div className="lg:col-span-1 space-y-6">
          {/* General Config Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <SettingsIcon className="w-5 h-5 text-[#FF1744]" />
              <h3 className="font-extrabold text-sm text-black dark:text-white">Ajustes Generales</h3>
            </div>

            {/* Days warning per category */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#000000] dark:text-slate-250 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-1.5">Días de Alerta por Categoría</h4>
              
              <div>
                <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-400 uppercase tracking-wider mb-1">
                  General / Otros
                </label>
                <select
                  disabled={!isAdmin}
                  value={config.alertDays}
                  onChange={handleAlertDaysChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF1744]/25 focus:border-[#FF1744]"
                >
                  <option value={1}>1 día de anticipación</option>
                  <option value={2}>2 días de anticipación</option>
                  <option value={3}>3 días de anticipación</option>
                  <option value={5}>5 días de anticipación</option>
                  <option value={7}>7 días de anticipación</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-400 uppercase tracking-wider mb-1">
                  Cárnicos
                </label>
                <select
                  disabled={!isAdmin}
                  value={config.alertDaysCarnicos ?? 2}
                  onChange={async (e) => {
                    await saveConfig({ ...config, alertDaysCarnicos: parseInt(e.target.value, 10) });
                    playSuccess();
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white text-xs font-semibold focus:outline-none"
                >
                  <option value={1}>1 día de anticipación</option>
                  <option value={2}>2 días de anticipación</option>
                  <option value={3}>3 días de anticipación</option>
                  <option value={5}>5 días de anticipación</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-400 uppercase tracking-wider mb-1">
                  Embutidos
                </label>
                <select
                  disabled={!isAdmin}
                  value={config.alertDaysEmbutidos ?? 5}
                  onChange={async (e) => {
                    await saveConfig({ ...config, alertDaysEmbutidos: parseInt(e.target.value, 10) });
                    playSuccess();
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white text-xs font-semibold focus:outline-none"
                >
                  <option value={2}>2 días de anticipación</option>
                  <option value={3}>3 días de anticipación</option>
                  <option value={5}>5 días de anticipación</option>
                  <option value={7}>7 días de anticipación</option>
                  <option value={10}>10 días de anticipación</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-400 uppercase tracking-wider mb-1">
                  Lácteos
                </label>
                <select
                  disabled={!isAdmin}
                  value={config.alertDaysLacteos ?? 3}
                  onChange={async (e) => {
                    await saveConfig({ ...config, alertDaysLacteos: parseInt(e.target.value, 10) });
                    playSuccess();
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white text-xs font-semibold focus:outline-none"
                >
                  <option value={1}>1 día de anticipación</option>
                  <option value={2}>2 días de anticipación</option>
                  <option value={3}>3 días de anticipación</option>
                  <option value={5}>5 días de anticipación</option>
                  <option value={7}>7 días de anticipación</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-400 uppercase tracking-wider mb-1">
                  Vegetales
                </label>
                <select
                  disabled={!isAdmin}
                  value={config.alertDaysVegetales ?? 1}
                  onChange={async (e) => {
                    await saveConfig({ ...config, alertDaysVegetales: parseInt(e.target.value, 10) });
                    playSuccess();
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white text-xs font-semibold focus:outline-none"
                >
                  <option value={1}>1 día de anticipación</option>
                  <option value={2}>2 días de anticipación</option>
                  <option value={3}>3 días de anticipación</option>
                </select>
              </div>
            </div>

            {/* Sound toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-bold text-black dark:text-slate-300 uppercase tracking-wider">Sonidos de la App</p>
                <p className="text-[10px] text-slate-900 dark:text-slate-400 font-semibold">Confirmación y alertas</p>
              </div>
              <button
                disabled={!isAdmin}
                onClick={toggleSound}
                className={`p-2.5 rounded-xl transition-all ${
                  config.soundEnabled
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-750 dark:text-slate-455'
                }`}
              >
                {config.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>

            {/* System Updates check */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-black dark:text-slate-350 uppercase tracking-wider">Actualizaciones de App</p>
                    <p className="text-[10px] text-slate-900 dark:text-slate-400 font-semibold">Buscar nueva versión del sistema</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckUpdates}
                    disabled={checkingUpdate}
                    className="py-1.5 px-3 bg-[#FF1744] hover:bg-red-650 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                    <span>{checkingUpdate ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>
                {updateMsg && (
                  <p className="text-[10px] font-bold text-slate-650 dark:text-slate-350 bg-slate-50 dark:bg-slate-750 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    {updateMsg}
                  </p>
                )}
              </div>
            </div>

            {!isAdmin && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-[10px] text-[#FF1744] dark:text-red-400 font-semibold flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                <span>Solo Administradores pueden editar ajustes.</span>
              </div>
            )}
          </div>

          {/* Backup & Restore Card */}
          {isAdmin && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <Database className="w-5 h-5 text-[#FF1744]" />
                <h3 className="font-extrabold text-sm text-black dark:text-white">Copia de Seguridad</h3>
              </div>

              {restoreMessage && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  restoreMessage.success 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-850 dark:bg-emerald-500/10 dark:text-emerald-400' 
                    : 'bg-red-50 border-red-250 text-red-850 dark:bg-red-500/10 dark:text-red-450'
                }`}>
                  <span>{restoreMessage.message}</span>
                  <button onClick={() => setRestoreMessage(null)}><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleBackup}
                  className="w-full py-3 bg-slate-100 text-slate-800 dark:bg-slate-750 dark:text-slate-200 dark:hover:bg-slate-700 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-xs"
                >
                  <Download className="w-4 h-4 text-indigo-500" />
                  <span>Descargar Backup JSON</span>
                </button>

                <div className="relative">
                  <input
                    type="file"
                    id="restore-file"
                    accept=".json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                  <label
                    htmlFor="restore-file"
                    className="w-full py-3 bg-slate-100 text-slate-800 dark:bg-slate-750 dark:text-slate-200 dark:hover:bg-slate-700 hover:bg-slate-200 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-xs cursor-pointer border border-dashed border-slate-300 dark:border-slate-600"
                  >
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <span>Restaurar Copia de Seguridad</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Sync Settings (Admin) */}
          {isAdmin && (
            <form onSubmit={handleSaveSync} className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <CloudLightning className="w-5 h-5 text-[#FF1744]" />
                <h3 className="font-extrabold text-sm text-black dark:text-white">Sincronización Nube</h3>
              </div>

              {syncStatus && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  syncStatus.success 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-850 dark:bg-emerald-500/10' 
                    : 'bg-red-50 border-red-250 text-red-850 dark:bg-red-500/10'
                }`}>
                  <span>{syncStatus.message}</span>
                  <button type="button" onClick={() => setSyncStatus(null)}><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-2">Proveedor de Sincronización</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSyncProvider('firebase')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        syncProvider === 'firebase'
                          ? 'bg-[#FF1744] text-white border-[#FF1744]'
                          : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Firebase
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncProvider('supabase')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        syncProvider === 'supabase'
                          ? 'bg-[#FF1744] text-white border-[#FF1744]'
                          : 'bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Supabase
                    </button>
                  </div>
                </div>

                {syncProvider === 'firebase' && (
                  <>
                    <div>
                      <label className="block font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-1">Firebase Project ID</label>
                      <input
                        type="text"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        placeholder="E.g. pedidosya-expiry-control"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white font-semibold rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-1">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSyA1..."
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white font-semibold rounded-lg"
                      />
                    </div>
                  </>
                )}

                {syncProvider === 'supabase' && (
                  <>
                    <div>
                      <label className="block font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-1">Supabase URL</label>
                      <input
                        type="text"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://xyz.supabase.co"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white font-semibold rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-black dark:text-slate-400 uppercase tracking-wider mb-1">Supabase Anon Key</label>
                      <input
                        type="password"
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        placeholder="eyJhbGciOi..."
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white font-semibold rounded-lg"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="sync-enabled"
                    checked={syncEnabled}
                    onChange={(e) => setSyncEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#FF1744] rounded border-slate-350"
                  />
                  <label htmlFor="sync-enabled" className="font-bold text-black dark:text-slate-300">Habilitar auto-sincronización</label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-white rounded-xl text-xs font-bold"
                >
                  Guardar Sync
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleSyncNow}
                  className="flex-1 py-2 px-3 bg-[#FF1744] text-white hover:bg-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Sincronizando...' : 'Sincronizar Ya'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right column: Audit Logs & User Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audit Logs Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
              <Activity className="w-5 h-5 text-[#FF1744]" />
              <h3 className="font-extrabold text-sm text-black dark:text-white">Auditoría de Cambios</h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 divide-y divide-slate-100 dark:divide-slate-700">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row justify-between gap-2 text-xs font-semibold">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.action === 'create' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          log.action === 'update' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' :
                          log.action === 'discard' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {log.action === 'create' ? 'Crear' :
                           log.action === 'update' ? 'Editar' :
                           log.action === 'discard' ? 'Descartar' : 'Eliminar'}
                        </span>
                      </div>
                      
                      <p className="text-black dark:text-slate-250 mt-1">
                        Producto: <span className="font-extrabold text-black dark:text-white">#{log.productCode}</span> - {log.details}
                      </p>
                    </div>

                    <div className="sm:text-right text-slate-900 dark:text-slate-400 flex items-center gap-1 self-start sm:self-center shrink-0">
                      <span>Realizado por:</span>
                      <span className="bg-slate-100 dark:bg-slate-700 text-black dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                        {log.user}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                  <Activity className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-bold text-xs">No hay registros de auditoría aún.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Los cambios que realices aparecerán aquí.</p>
                </div>
              )}
            </div>
          </div>

          {/* User Management Card (Admin Only) */}
          {isAdmin && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <Users className="w-5 h-5 text-[#FF1744]" />
                <h3 className="font-extrabold text-sm text-black dark:text-white">Gestión de Usuarios</h3>
              </div>

              {userError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span>{userError}</span>
                  <button onClick={() => setUserError(null)}><X className="w-3.5 h-3.5" /></button>
                </div>
              )}

              {userSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-750 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span>{userSuccess}</span>
                  <button onClick={() => setUserSuccess(null)}><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-black dark:text-slate-400 uppercase tracking-wider">Usuarios Registrados</h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {users.map((u) => (
                      <div key={u.username} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="font-bold text-sm text-black dark:text-white">{u.username}</p>
                          <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            u.role === 'admin' 
                              ? 'bg-red-50 text-[#FF1744] dark:bg-red-500/10 dark:text-red-400' 
                              : 'bg-slate-100 text-black dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        {u.username !== currentUser?.username && u.username !== 'gfacu7@gmail.com' && (
                          <button
                            onClick={() => handleDeleteUser(u.username)}
                            className="p-2 text-black hover:text-[#FF1744] hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add User Form */}
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <h4 className="text-xs font-bold text-black dark:text-slate-400 uppercase tracking-wider">Agregar Nuevo Usuario</h4>
                  
                  <div className="text-xs space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-400 uppercase mb-1">Nombre de Usuario</label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Ej. juan_perez"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white font-semibold rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-450 uppercase mb-1">Contraseña</label>
                      <div className="relative">
                        <input
                          type={showAddUserPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white font-semibold rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAddUserPassword(!showAddUserPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-900 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
                          aria-label={showAddUserPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showAddUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#000000] dark:text-slate-400 uppercase mb-1">Rol</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'admin' | 'empleado')}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-black dark:text-white font-semibold rounded-lg"
                      >
                        <option value="empleado">Empleado</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#FF1744] text-white hover:bg-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Usuario</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
