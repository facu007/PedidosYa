import { useEffect, useState } from 'react';
import type { Product } from '../services/db';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Este dispositivo no soporta notificaciones de escritorio.');
      return false;
    }

    try {
      const resp = await Notification.requestPermission();
      setPermission(resp);
      return resp === 'granted';
    } catch (e) {
      console.error('Error solicitando permisos de notificación:', e);
      return false;
    }
  };

  const sendLocalNotification = async (title: string, body: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Try showing notification via Service Worker first (important for minimized/background state)
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          tag: 'pedidosya-expiry-notification',
          renotify: true,
        } as any);
        return;
      }
    } catch (e) {
      console.warn('Could not send notification via service worker, falling back to standard notification:', e);
    }

    // Fallback: Standard browser notification (requires page to be active/running, works when minimized on some desktops)
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      console.error('Error triggering standard notification:', e);
    }
  };

  // Helper to run expiry scan and alert the user
  const checkAndNotifyUpcomingExpirations = (products: Product[]) => {
    const active = products.filter(p => !p.isDiscarded);
    const vencidos = active.filter(p => p.status === 'vencido');
    const hoy = active.filter(p => p.status === 'vence_hoy');
    const manana = active.filter(p => p.status === 'vence_manana');

    if (vencidos.length > 0) {
      sendLocalNotification(
        '🔴 Atención: Alerta de Vencimiento',
        `Hay ${vencidos.length} producto${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} en stock. ¡Requiere retiro inmediato!`
      );
    }

    if (hoy.length > 0) {
      sendLocalNotification(
        '🟡 Atención: Control Diario',
        `Hay ${hoy.length} producto${hoy.length > 1 ? 's' : ''} que vence${hoy.length > 1 ? 'n' : ''} hoy.`
      );
    } else if (manana.length > 0) {
      sendLocalNotification(
        '🟠 Atención: Control Diario',
        `Hay ${manana.length} producto${manana.length > 1 ? 's' : ''} que vence${manana.length > 1 ? 'n' : ''} mañana.`
      );
    }
  };

  return {
    permission,
    requestPermission,
    sendLocalNotification,
    checkAndNotifyUpcomingExpirations,
  };
};
