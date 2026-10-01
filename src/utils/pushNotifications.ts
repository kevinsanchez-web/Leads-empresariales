import { Lead } from '../types';
import { leadTimestampNow } from './date';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks current browser push notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Requests browser push notification permissions from the user
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  } catch (error) {
    console.error('Error pidiendo permiso de notificaciones:', error);
    return 'denied';
  }
}

/**
 * Triggers a native browser push notification for a priority lead
 */
export async function sendPriorityLeadPushNotification(lead: Lead): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const title = `⚡ ¡Nuevo Lead Prioritario: ${lead.name}!`;
  const body = `${lead.role} en ${lead.company} | Evento: ${lead.event || 'Captura en Vivo'}. Intereses: ${lead.interests.slice(0, 2).join(', ')}`;
  
  const options: NotificationOptions & { vibrate?: number[] } = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `priority-lead-${lead.id}`,
    vibrate: [200, 100, 200, 100, 300],
    data: { leadId: lead.id, url: '/' },
    requireInteraction: true
  };

  try {
    // Try via Service Worker Registration first (supports background / non-foreground notifications)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    // Fallback to direct Notification API
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (e) {
    console.warn('Error enviando notificación push:', e);
    // Fallback try standard Notification
    try {
      const notification = new Notification(title, { body });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Sends a test push notification to verify browser configuration
 */
export async function sendTestPushNotification(): Promise<boolean> {
  const dummyLead: Lead = {
    id: `test-${Date.now()}`,
    name: 'Carlos Mendoza (Demo Push)',
    role: 'Director de Operaciones',
    company: 'Cementos Argos',
    email: 'cmendoza@argos.com.co',
    phone: '+57 312 888 7766',
    event: 'Tech Summit Bogotá',
    interests: ['IA', 'Automatización'],
    experiences: ['Demo Push Test'],
    sources: ['Notificación Push'],
    capturedBy: 'Sistema Ejecutivo',
    capturedAt: leadTimestampNow(),
    lastContact: leadTimestampNow(),
    priority: true,
    status: 'Nuevo',
    estimatedValue: 45000,
    notes: 'Prueba de alerta push enviada exitosamente al navegador.',
    history: []
  };

  return sendPriorityLeadPushNotification(dummyLead);
}
