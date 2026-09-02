import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { dbService, seedDB } from './services/db';
import { syncService } from './services/syncService';

// Register Service Worker for PWA (offline capability)
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Dispatch a custom event to notify React components
    window.dispatchEvent(new CustomEvent('pwa-update-available', { detail: { updateSW } }));
  },
  onOfflineReady() {
    console.log('Control de Vencimientos listo para funcionar offline.');
  },
});

const root = createRoot(document.getElementById('root')!);

const bootstrap = async () => {
  try {
    await seedDB();
    // Connect with database and download inventory and load history at startup
    if (syncService.isOnline()) {
      const config = await dbService.getConfig();
      syncService.syncData(config).catch(err => console.warn('Background bootstrap sync note:', err));
    }
  } catch (error) {
    console.error('Error al inicializar la base de datos local:', error);
  }

  root.render(
    <StrictMode>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </StrictMode>,
  );
};

void bootstrap();
