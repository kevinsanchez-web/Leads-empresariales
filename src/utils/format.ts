/**
 * Formato monetario en USD para toda la app.
 *
 * El pipeline asume dólares en todos los listados (ya se escribía a mano con
 * `toLocaleString()` en LeadsTable y LeadDrawerTabContent), así que aquí se
 * centraliza para que tarjetas, encabezados de columna y métricas globales
 * muestren el mismo estilo.
 */

/** Valor estimado de referencia cuando un lead no tiene `estimatedValue`. */
export const DEFAULT_ESTIMATED_VALUE = 35000;

/** `35000` → `$35,000 USD`. Formato completo para fichas y tablas. */
export function formatCurrencyUSD(value?: number): string {
  const amount = value ?? DEFAULT_ESTIMATED_VALUE;
  return `$${amount.toLocaleString('en-US')} USD`;
}

/**
 * `35000` → `$35K USD`, `210000` → `$210K USD`, `1500000` → `$1.5M USD`.
 * Versión compacta para encabezados de columna y métricas, donde el formato
 * completo no cabe sin romper la fila.
 */
export function formatCompactUSD(value?: number): string {
  const amount = value ?? DEFAULT_ESTIMATED_VALUE;

  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    const trimmed = Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1);
    return `$${trimmed}M USD`;
  }

  if (Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    const trimmed = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
    return `$${trimmed}K USD`;
  }

  return `$${Math.round(amount)} USD`;
}

/** Suma de `estimatedValue` de una lista de leads, con el valor por defecto como fallback. */
export function sumEstimatedValue(leads: Array<{ estimatedValue?: number }>): number {
  return leads.reduce((total, lead) => total + (lead.estimatedValue ?? DEFAULT_ESTIMATED_VALUE), 0);
}
