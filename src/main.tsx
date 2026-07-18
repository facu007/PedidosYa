import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

// Register Service Worker for PWA (offline capability)
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm('Nueva versión de la app disponible. ¿Deseas actualizar ahora?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Control de Vencimientos listo para funcionar offline.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
);
