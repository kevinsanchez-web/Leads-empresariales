const NOT_PROVIDED_LABEL = 'No proporcionado';

/**
 * Normalizes a contact field (phone or email) before it is stored on a Lead.
 * Returns an empty string when nothing was provided, so the field never
 * falls back to a fabricated value.
 */
export function cleanContact(value?: string | null): string {
  return value?.trim() ?? '';
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