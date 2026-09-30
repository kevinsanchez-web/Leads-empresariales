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