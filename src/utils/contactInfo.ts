const NOT_PROVIDED_LABEL = 'No proporcionado';

/**
 * Normalizes a contact field (phone or email) before it is stored on a Lead.
 * Returns an empty string when nothing was provided, so the field never
 * falls back to a fabricated value.
 */
export function cleanContact(value?: string | null): string {
  return value?.trim() ?? '';
}

/**
 * Normaliza un email antes de guardarlo: lo limpia y pasa a minúsculas (los
 * dominios son insensibles a mayúsculas y así el dedupe por email funciona).
 */
export function normalizeEmail(value?: string | null): string {
  return cleanContact(value).toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida un email con una expresión sencilla. Vacío se considera no válido. */
export function isValidEmail(value?: string | null): boolean {
  if (!cleanContact(value)) return false;
  return EMAIL_RE.test(normalizeEmail(value));
}

/**
 * Formatea un número colombiano a su forma canónica `+57 3XX XXX XXXX`:
 * - 10 dígitos → `+57 3XX XXX XXXX`
 * - 12 dígitos que empiezan por 57 (o con +57) → ídem
 * Cualquier otro caso se devuelve limpio de espacios externos, sin transformar.
 */
export function formatColombianPhone(value?: string | null): string {
  const cleaned = cleanContact(value);
  if (!cleaned) return '';
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+57 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
  if (digits.length === 12 && digits.startsWith('57')) {
    return `+57 ${digits.substring(2, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
  }
  return cleaned;
}

/**
 * Normaliza un teléfono antes de guardarlo: aplica el mismo formato colombiano
 * que usa la captura por voz para números de 10 dígitos.
 */
export function normalizePhone(value?: string | null): string {
  return formatColombianPhone(value);
}

/** Considera válido un teléfono colombiano de 10 dígitos (con o sin +57). */
export function isValidPhone(value?: string | null): boolean {
  const digits = cleanContact(value).replace(/\D/g, '');
  if (!digits) return false;
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('57'));
}

export function hasContact(value?: string | null): boolean {
  return cleanContact(value).length > 0;
}

/**
 * Renders a contact field for display. Missing contact data is shown as an
 * explicit label instead of being hidden or replaced with a sample value.
 */
export function displayContact(value?: string | null): string {
  const cleaned = cleanContact(value);
  return cleaned || NOT_PROVIDED_LABEL;
}

/**
 * Búsqueda de personas en LinkedIn, para cuando el lead no tiene un perfil
 * guardado. La mayoría de los leads no lo tienen: `linkedinUrl` solo se escribe si
 * se capturó a mano o si el enriquecimiento lo respalda con una fuente.
 *
 * Es una búsqueda, no el perfil. Por eso el que la muestra la rotula como tal y no
 * como un dato del lead: armarla con lo que ya escribió el usuario no inventa nada,
 * pero presentarla como su perfil sí.
 */
export function linkedinSearchUrl(name?: string | null, company?: string | null): string {
  const keywords = [name, company].map((part) => cleanContact(part)).filter(Boolean).join(' ');
  if (!keywords) return '';
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}