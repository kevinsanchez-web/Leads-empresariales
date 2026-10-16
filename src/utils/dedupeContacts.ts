import { Lead } from '../types';

export interface DedupedContact {
  key: string;
  name: string;
  // Nombre normalizado original ('' si el lead no trae nombre). La fase 2 debe
  // comparar este valor: `name` puede ser el texto visible "(Sin nombre)".
  nameKey: string;
  email?: string;
  // Cargo más frecuente entre los registros del contacto (ver final de
  // `dedupeContacts`); '' si ningún registro trae cargo.
  mainRole: string;
  roles: string[];
  count: number;
  leadIds: string[];
  priority: boolean;
}

// Normaliza sin distinguir mayúsculas, acentos ni espacios repetidos:
// "Juan Pérez" y "juan perez" son la misma persona.
const normalizeName = (raw: string) =>
  (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

// Dos nombres compatibles = misma persona escrita de formas distintas
// ("Juan Pérez" vs "juan perez", o uno contenido en el otro). Un nombre vacío
// nunca es compatible: sin nombre no se puede afirmar que dos registros son la misma persona.
const namesCompatible = (a: string, b: string) => {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
};

const mergeInto = (target: DedupedContact, other: DedupedContact) => {
  target.count += other.count;
  other.leadIds.forEach(id => {
    if (!target.leadIds.includes(id)) target.leadIds.push(id);
  });
  other.roles.forEach(r => {
    if (r && !target.roles.includes(r)) target.roles.push(r);
  });
  if (other.priority) target.priority = true;
  if (!target.email && other.email) target.email = other.email;
};

/**
 * Agrupa los leads de una empresa en contactos únicos.
 *
 * Fase 1: agrupa por nombre normalizado → un mismo contacto con distintos cargos
 * (o distintos correos) queda en una sola entrada con sus cargos combinados.
 * Leads sin nombre usan su ID como clave para que nunca se fusionen entre sí.
 *
 * Fase 2: fusiona entradas distintas solo si comparten LinkedIn o correo
 * Y sus nombres son compatibles. Así un ID genérico compartido (p. ej. el
 * LinkedIn de la empresa que la IA devolvió para todos los contactos)
 * no colapsa a todos los usuarios en una sola entrada.
 */
export function dedupeContacts(companyLeads: Lead[]): DedupedContact[] {
  const entries: DedupedContact[] = [];
  const byBaseKey = new Map<string, DedupedContact>();
  const entryByLeadId = new Map<string, DedupedContact>();

  // Fase 1: agrupación por nombre (o ID del lead si no hay nombre)
  companyLeads.forEach(l => {
    const nameKey = normalizeName(l.name);
    const baseKey = nameKey ? `name:${nameKey}` : `id:${l.id}`;
    let entry = byBaseKey.get(baseKey);
    if (!entry) {
      entry = {
        key: baseKey,
        name: l.name || '(Sin nombre)',
        nameKey,
        email: l.email || undefined,
        mainRole: l.role || '',
        roles: l.role ? [l.role] : [],
        count: 1,
        leadIds: [l.id],
        priority: !!l.priority
      };
      byBaseKey.set(baseKey, entry);
      entries.push(entry);
    } else {
      entry.count += 1;
      entry.leadIds.push(l.id);
      if (l.priority) entry.priority = true;
      if (l.role && !entry.roles.includes(l.role)) entry.roles.push(l.role);
      if (!entry.email && l.email) entry.email = l.email;
      if (!entry.mainRole && l.role) entry.mainRole = l.role;
    }
    entryByLeadId.set(l.id, entry);
  });

  if (entries.length > 1) {
    // Fase 2: fusión por identidad fuerte (LinkedIn / correo) con nombres compatibles
    const byIdentity = new Map<string, DedupedContact[]>();
    const addToIndex = (id: string, entry: DedupedContact) => {
      const list = byIdentity.get(id);
      if (!list) byIdentity.set(id, [entry]);
      else if (!list.includes(entry)) list.push(entry);
    };

    companyLeads.forEach(l => {
      const entry = entryByLeadId.get(l.id);
      if (!entry) return;
      const linkedin = l.linkedinUrl?.toLowerCase().trim();
      const email = l.email?.toLowerCase().trim();
      if (linkedin) addToIndex(linkedin, entry);
      if (email && email.length > 0) addToIndex(email, entry);
    });

    byIdentity.forEach(list => {
      if (list.length < 2) return;
      const target = list[0];
      for (let i = 1; i < list.length; i++) {
        const candidate = list[i];
        if (candidate === target) continue;
        if (!namesCompatible(target.nameKey, candidate.nameKey)) continue;
        mergeInto(target, candidate);
        // Reapunta el candidato a la entrada sobreviviente en todos los índices
        byIdentity.forEach(lst => {
          const idx = lst.indexOf(candidate);
          if (idx >= 0) lst[idx] = target;
        });
        const pos = entries.indexOf(candidate);
        if (pos >= 0) entries.splice(pos, 1);
      }
    });
  }

  // mainRole definitivo: el cargo más frecuente entre los registros del
  // contacto; en empate, el del registro prioritario; desempate alfabético
  // para que el resultado sea determinista. Los cargos vacíos no cuentan.
  const leadById = new Map(companyLeads.map(l => [l.id, l]));
  entries.forEach(entry => {
    const counts = new Map<string, { n: number; priority: boolean }>();
    entry.leadIds.forEach(id => {
      const lead = leadById.get(id);
      const role = (lead?.role || '').trim();
      if (!role) return;
      const agg = counts.get(role) || { n: 0, priority: false };
      agg.n += 1;
      agg.priority = agg.priority || !!lead?.priority;
      counts.set(role, agg);
    });
    let best = '';
    let bestAgg: { n: number; priority: boolean } | null = null;
    counts.forEach((agg, role) => {
      if (!bestAgg) {
        best = role;
        bestAgg = agg;
        return;
      }
      if (agg.n !== bestAgg.n) {
        if (agg.n > bestAgg.n) { best = role; bestAgg = agg; }
        return;
      }
      if (agg.priority !== bestAgg.priority) {
        if (agg.priority) { best = role; bestAgg = agg; }
        return;
      }
      if (role.localeCompare(best) < 0) { best = role; bestAgg = agg; }
    });
    entry.mainRole = best;
  });

  return entries.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority ? 1 : -1;
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
}
