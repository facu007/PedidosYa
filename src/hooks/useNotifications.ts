import { useCallback, useEffect, useState } from 'react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
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

  const sendLocalNotification = useCallback(async (title: string, body: string) => {
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

    // Fallback: Standard browser notification
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      console.error('Error triggering standard notification:', e);
    }
  }, []);

  // Helper to run expiry scan and alert the user (throttled per session/counts)
  const checkAndNotifyUpcomingExpirations = useCallback((products: Product[]) => {
    const today = startOfDay(new Date());
    const active = products.filter(p => !p.isDiscarded);
    const vencidos = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) < 0);
    const hoy = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 0);
    const manana = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 1);
    const sieteDias = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 7);
    const diezDias = active.filter(p => differenceInCalendarDays(startOfDay(new Date(p.expiryDate + 'T00:00:00')), today) <= 10);

    const currentCounts = `${vencidos.length}-${hoy.length}-${manana.length}-${sieteDias.length}-${diezDias.length}`;
    const lastNotifiedSession = sessionStorage.getItem('pya_last_notified_counts');

    if (lastNotifiedSession === currentCounts) {
      return;
    }

    let notified = false;

    if (vencidos.length > 0) {
      sendLocalNotification(
        '🔴 Atención: Alerta de Vencimiento',
        `Hay ${vencidos.length} producto${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''} en stock. ¡Requiere retiro inmediato!`
      );
      notified = true;
    }

    if (manana.length > 0) {
      sendLocalNotification(
        '🟠 Aviso de Carga (≤ 1 día)',
        `Hay ${manana.length} producto${manana.length > 1 ? 's' : ''} que vence${manana.length > 1 ? 'n' : ''} en 1 día o menos. ¡Cargar y rotar producto!`
      );
      notified = true;
    } else if (sieteDias.length > 0) {
      sendLocalNotification(
        '📅 Aviso de Carga (≤ 7 días)',
        `Hay ${sieteDias.length} producto${sieteDias.length > 1 ? 's' : ''} que vence${sieteDias.length > 1 ? 'n' : ''} en 7 días o menos. ¡Cargar producto al sistema!`
      );
      notified = true;
    } else if (diezDias.length > 0) {
      sendLocalNotification(
        '📅 Aviso Anticipado (≤ 10 días)',
        `Hay ${diezDias.length} producto${diezDias.length > 1 ? 's' : ''} que vence${diezDias.length > 1 ? 'n' : ''} en 10 días o menos. ¡Aviso de control de inventario!`
      );
      notified = true;
    }

    if (notified) {
      sessionStorage.setItem('pya_last_notified_counts', currentCounts);
    }
  }, [sendLocalNotification]);

  return {
    permission,
    requestPermission,
    sendLocalNotification,
    checkAndNotifyUpcomingExpirations,
  };
};
