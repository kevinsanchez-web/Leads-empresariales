/**
 * Clasificación del correo capturado de un lead: proveedor gratuito (casilla
 * personal) o dominio propio de una empresa.
 *
 * No se persiste en Firestore a propósito: el correo puede cambiar después
 * (el enriquecimiento lo sobrescribe) y un tipo guardado quedaría viejo, mostrando
 * un canal que ya no aplica. Se deriva siempre del valor actual.
 */
export type EmailKind = 'personal' | 'corporativo' | 'sin-email';

export interface EmailClassification {
  kind: EmailKind;
  /** Dominio en minúsculas, o `''` si el correo no permite deducirlo. */
  domain: string;
}

/**
 * Dominios que cuentan como gratuitos solo si coinciden completos. Son nombres
 * que pueden ser el primer nivel de un dominio corporativo
 * (`mail.energiaandina.co`), así que no se comparan como etiqueta suelta.
 */
const FREE_EMAIL_DOMAINS = new Set([
  'live.com',
  'live.es',
  'msn.com',
  'me.com',
  'mac.com',
  'pm.me',
  'mail.com',
  'gmx.de',
  'web.de',
  'freenet.de',
  't-online.de',
  'yandex.ru',
  'terra.com.br',
  'uol.com.br',
  'bol.com.br',
  'yeah.net',
  'laposte.net',
  'orange.fr',
  'wanadoo.fr',
  'sfr.fr',
  'libero.it',
  'virgilio.it',
  'tiscali.it',
  'qq.com',
  '163.com',
  'sina.com',
  'mail.ru'
]);

/**
 * Etiqueta identificativa de un proveedor gratuito: se reconoce aunque el
 * dominio lleve sufijo de país (`hotmail.co.uk`, `yahoo.com.mx`).
 */
const FREE_EMAIL_LABELS = new Set([
  'gmail',
  'googlemail',
  'hotmail',
  'outlook',
  'yahoo',
  'ymail',
  'icloud',
  'proton',
  'protonmail',
  'gmx',
  'aol',
  'yandex',
  'zoho',
  'hushmail',
  'tutanota',
  'fastmail'
]);

/**
 * Sufijos públicos que se quitan antes de comparar la etiqueta. Son los de dos
 * niveles: sin ellos, `hotmail.co.uk` no se reconocería como casilla personal.
 */
const PUBLIC_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'com.co',
  'com.mx',
  'com.ar',
  'com.br',
  'com.pe',
  'com.uy',
  'com.ec',
  'com.ve',
  'com.pa',
  'com.do',
  'com.gt',
  'com.py',
  'com.bo',
  'co.cr'
]);

/** Parte del dominio que sigue después de la arroba. */
export function emailDomain(email?: string | null): string {
  const trimmed = email?.trim() ?? '';
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return '';
  return trimmed.slice(at + 1).toLowerCase();
}

/**
 * true si el dominio pertenece a un proveedor de correo gratuito.
 *
 * Reduce el dominio a su etiqueta: descarta la última parte (el TLD) y, si lo que
 * queda delante es un sufijo público de dos niveles (`com.co`), lo descarta
 * también. `gmail.com`, `hotmail.co.uk` y `yahoo.com.mx` dejan respectively
 * `gmail`, `hotmail` y `yahoo`; `bancolombia.com.co` deja `bancolombia`. Esa
 * etiqueta se busca entre los proveedores conocidos, y nunca se acepta un
 * dominio corporativo que solo empiece igual (`mail.energiaandina.co`).
 */
export function isFreeEmailDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return false;
  if (FREE_EMAIL_DOMAINS.has(normalized)) return true;

  const labels = normalized.split('.');
  // Sin un TLD no es un dominio: no alcanza para deducir el proveedor.
  if (labels.length < 2) return false;

  let end = labels.length - 1;
  if (end >= 2 && PUBLIC_SUFFIXES.has(labels.slice(end - 1).join('.'))) end -= 1;
  return FREE_EMAIL_LABELS.has(labels.slice(0, end).join('.'));
}

export function classifyEmail(email?: string | null): EmailClassification {
  const domain = emailDomain(email);
  if (!domain) return { kind: 'sin-email', domain: '' };
  return { kind: isFreeEmailDomain(domain) ? 'personal' : 'corporativo', domain };
}

/** Texto corto para explicar la decisión sin abrir nada. */
export function emailKindLabel(kind: EmailKind): string {
  if (kind === 'personal') return 'Correo personal';
  if (kind === 'corporativo') return 'Correo corporativo';
  return 'Sin correo';
}