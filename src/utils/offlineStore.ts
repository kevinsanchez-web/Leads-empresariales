import { Lead } from '../types';

const OFFLINE_LEADS_KEY = 'centralized_offline_leads_queue_v1';

export interface OfflineLeadItem {
  lead: Lead;
  savedAt: string;
  synced: boolean;
}

/**
 * Checks if the browser currently has network connectivity
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

/**
 * Retrieves all offline leads queued locally
 */
export function getOfflineLeads(): OfflineLeadItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_LEADS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo la cola de leads offline:', e);
    return [];
  }
}

/**
 * Saves a lead to the local offline queue
 */
export function saveLeadOffline(lead: Lead): OfflineLeadItem {
  const items = getOfflineLeads();
  const newItem: OfflineLeadItem = {
    lead: {
      ...lead,
      notes: (lead.notes ? `${lead.notes} ` : '') + '[Capturado Offline]'
    },
    savedAt: new Date().toISOString(),
    synced: false
  };

  const updated = [newItem, ...items];
  try {
    localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error guardando en la cola offline:', e);
  }

  // Dispatch custom event for real-time UI updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline_queue_changed', { detail: { count: updated.length } }));
  }

  return newItem;
}

/**
 * Removes the given leads from the offline queue after a confirmed sync
 */
export function removeOfflineLeads(leadIds: string[]): void {
  if (leadIds.length === 0) return;
  const ids = new Set(leadIds);
  const updated = getOfflineLeads().filter(item => !ids.has(item.lead.id));
  try {
    localStorage.setItem(OFFLINE_LEADS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error actualizando cola offline:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline_queue_changed', { detail: { count: updated.length } }));
  }
}

/**
 * Removes a lead from the offline queue after successful sync
 */
export function removeOfflineLead(leadId: string): void {
  removeOfflineLeads([leadId]);
}

/**
 * Clears the entire offline queue
 */
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_LEADS_KEY);
  } catch (e) {
    console.error('Error limpiando cola offline:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline_queue_changed', { detail: { count: 0 } }));
  }
}

export interface SyncResult {
  synced: number;
  failed: number;
  failedLeadIds: string[];
}

/**
 * Sends every queued lead to Firestore and removes ONLY the ones that actually landed.
 * A lead whose write rejected stays in the queue, so a sync failure can never lose data.
 */
export async function syncOfflineLeads(
  onSyncLead: (lead: Lead) => Promise<void>
): Promise<SyncResult> {
  const items = getOfflineLeads();
  if (items.length === 0) return { synced: 0, failed: 0, failedLeadIds: [] };

  const results = await Promise.allSettled(items.map(item => onSyncLead(item.lead)));

  const syncedIds: string[] = [];
  const failedLeadIds: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      syncedIds.push(items[index].lead.id);
    } else {
      failedLeadIds.push(items[index].lead.id);
    }
  });

  removeOfflineLeads(syncedIds);

  if (failedLeadIds.length > 0) {
    console.error(
      `${failedLeadIds.length} lead(s) offline no se pudieron sincronizar y siguen en la cola:`,
      failedLeadIds.join(', ')
    );
  }

  return { synced: syncedIds.length, failed: failedLeadIds.length, failedLeadIds };
}
