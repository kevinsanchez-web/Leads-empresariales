import { Lead, NotificationAlert } from '../types';
import { todayISODate } from './date';

// Utility to calculate date difference in days (targetDate - today)
export function getDaysDiff(targetDateStr: string, todayStr: string = todayISODate()): number {
  try {
    const target = new Date(targetDateStr);
    const today = new Date(todayStr);
    // Zero out time
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch (e) {
    return 0;
  }
}

export function getNotificationAlerts(leads: Lead[], todayStr: string = todayISODate()): NotificationAlert[] {
  const alerts: NotificationAlert[] = [];

  leads.forEach((lead) => {
    // Skip closed leads
    if (lead.status === 'Ganado' || lead.status === 'Descartado') {
      return;
    }

    const scheduled = lead.nextContactDate || lead.suggestedAction?.scheduledDate;

    if (scheduled) {
      const daysDiff = getDaysDiff(scheduled, todayStr);
      let category: 'overdue' | 'today' | 'upcoming' | 'priority' = 'upcoming';

      if (daysDiff < 0) {
        category = 'overdue';
      } else if (daysDiff === 0) {
        category = 'today';
      } else if (daysDiff <= 7) {
        category = 'upcoming';
      } else {
        // More than 7 days ahead
        return;
      }

      const actionTitle = lead.suggestedAction?.title || 
        (category === 'overdue' ? 'Seguimiento Vencido' : category === 'today' ? 'Contacto Programado Hoy' : 'Próxima Reunión');

      alerts.push({
        id: `notif-${lead.id}-${scheduled}`,
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
        role: lead.role,
        title: `${actionTitle}: ${lead.name}`,
        description: lead.suggestedAction?.description || `Seguimiento de ${lead.company} (${lead.status})`,
        scheduledDate: scheduled,
        category,
        type: lead.suggestedAction?.type || 'call',
        capturedBy: lead.capturedBy,
        daysDiff
      });
    } else if (lead.priority && (lead.status === 'Nuevo' || lead.status === 'Calificado')) {
      // Priority lead without explicit date -> flag as Priority Today
      alerts.push({
        id: `notif-prio-${lead.id}`,
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
        role: lead.role,
        title: `Seguimiento Prioritario: ${lead.name}`,
        description: `Lead prioritario en estado ${lead.status} asignado a ${lead.capturedBy}. Requiere contacto.`,
        scheduledDate: todayStr,
        category: 'priority',
        type: 'call',
        capturedBy: lead.capturedBy,
        daysDiff: 0
      });
    }
  });

  // Sort alerts: Overdue first (most overdue first), then Priority, then Today, then Upcoming
  return alerts.sort((a, b) => {
    const categoryOrder = { overdue: 1, priority: 2, today: 3, upcoming: 4 };
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    return a.daysDiff - b.daysDiff;
  });
}
