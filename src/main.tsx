import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { seedDB } from './services/db';

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
