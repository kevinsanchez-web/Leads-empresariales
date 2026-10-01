import { Lead } from "../types";
import { cleanContact } from "./contactInfo";
import { companyKey } from "./company";

export type EnrichmentField = "linkedin" | "email" | "phone";

export const ENRICHMENT_FIELDS: EnrichmentField[] = ["linkedin", "email", "phone"];

export const FIELD_LABELS: Record<EnrichmentField, string> = {
  linkedin: "LinkedIn",
  email: "Correo",
  phone: "Teléfono",
};

// Cómo se llama cada campo del lado del Worker. El mapeo es explícito y no por posición: los
// nombres no coinciden ("linkedin" es "linkedinUrl", "phone" es "companyPhone").
export const ENRICHMENT_WORKER_FIELDS: Record<EnrichmentField, string> = {
  linkedin: "linkedinUrl",
  email: "email",
  phone: "companyPhone",
};

// Etiqueta de un campo para armar el mensaje de resultado.
export const FIELD_RESULT_LABELS: Record<EnrichmentField, string> = {
  linkedin: "LinkedIn",
  email: "correo",
  phone: "teléfono",
};

// Etiqueta de "lo que le falta" al lead. La de teléfono aclara que lo que se busca es el central
// de la empresa, para que no se lea como si le faltara el número personal del contacto.
export const FIELD_GAP_LABELS: Record<EnrichmentField, string> = {
  linkedin: "LinkedIn",
  email: "correo",
  phone: "teléfono (central de la empresa)",
};

export interface FieldGap {
  field: EnrichmentField;
  label: string;
}

export interface LeadGaps {
  lead: Lead;
  missing: EnrichmentField[];
}

export interface CompanyGaps {
  key: string;
  name: string;
  totalLeads: number;
  // Leads que ya tienen los tres campos (LinkedIn, correo y teléfono) y por tanto no entran a la
  // cola. Tener una vía de contacto no alcanza: mientras falte cualquiera de los tres, el lead
  // sigue siendo incompleto y se puede enriquecer.
  completeLeads: Lead[];
  // Leads incompletos agrupados por campo faltante. Los grupos no son excluyentes: un lead sin
  // las tres cosas aparece en los tres, que es exactamente lo que la segmentación debe mostrar.
  byField: Record<EnrichmentField, Lead[]>;
  totalIncomplete: number;
}

export function missingFieldsFor(lead: Lead): EnrichmentField[] {
  const missing: EnrichmentField[] = [];
  if (!cleanContact(lead.email)) missing.push("email");
  if (!cleanContact(lead.phone)) missing.push("phone");
  if (!cleanContact(lead.linkedinUrl)) missing.push("linkedin");
  return missing;
}

export function segmentByCompany(leads: Lead[]): CompanyGaps[] {
  const grouped: Record<string, Lead[]> = {};
  leads.forEach((lead) => {
    const key = companyKey(lead.company);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(lead);
  });

  return Object.entries(grouped)
    .map(([key, companyLeads]) => {
      const byField: Record<EnrichmentField, Lead[]> = { linkedin: [], email: [], phone: [] };
      const completeLeads: Lead[] = [];

      companyLeads.forEach((lead) => {
        const missing = missingFieldsFor(lead);
        if (missing.length === 0) {
          completeLeads.push(lead);
          return;
        }
        missing.forEach((field) => byField[field].push(lead));
      });

      const totalIncomplete = companyLeads.length - completeLeads.length;

      return {
        key,
        name: companyLeads[0].company,
        totalLeads: companyLeads.length,
        completeLeads,
        byField,
        totalIncomplete,
      };
    })
    .sort((a, b) => b.totalIncomplete - a.totalIncomplete || a.name.localeCompare(b.name));
}

/**
 * Aplana los leads incompletos de una empresa en el orden que el admin eligió, sin repetir:
 * si un lead no tiene ninguno de los tres campos, aparece una sola vez y por eso no consume
 * tres búsquedas.
 */
export function buildQueue(company: CompanyGaps, priority: EnrichmentField[]): LeadGaps[] {
  const seen = new Set<string>();
  const queue: LeadGaps[] = [];

  priority.forEach((field) => {
    company.byField[field].forEach((lead) => {
      if (seen.has(lead.id)) return;
      seen.add(lead.id);
      queue.push({ lead, missing: missingFieldsFor(lead) });
    });
  });

  return queue;
}
