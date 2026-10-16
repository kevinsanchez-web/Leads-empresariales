import { CompanyResearchSource } from '../types';

export function cleanCompanyName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function companyKey(raw: string): string {
  return cleanCompanyName(raw).toLowerCase();
}

// Dominios secundarios (documentos compartidos, presentaciones) que la IA cita pero
// no son canales oficiales de la empresa: siempre van después de la web corporativa.
const SECONDARY_DOMAINS = [
  'scribd.com',
  'prezi.com',
  'slideshare.net',
  'issuu.com',
  'speakerdeck.com',
  'docs.google.com',
  'drive.google.com'
];

/**
 * Ordena las fuentes citadas por la IA para que el sitio oficial de la empresa
 * y sus canales corporativos verificados (LinkedIn, etc.) aparezcan primero,
 * dejando sitios secundarios como scribd.com o prezi.com al final.
 */
export function prioritizeSources(
  sources: CompanyResearchSource[],
  companyName: string
): CompanyResearchSource[] {
  const lowerName = companyName.toLowerCase();
  const tokenize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/);
  const nameTokens = tokenize(lowerName).filter(t => t.length > 2);

  const hostnameOf = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  };

  const score = (url: string, title: string) => {
    let s = 0;
    const full = (url + ' ' + title).toLowerCase();
    const host = hostnameOf(url);
    if (full.includes(lowerName)) s += 5;
    nameTokens.forEach(t => {
      if (full.includes(t)) s += 2;
    });

    // Dominio oficial de la empresa (ej. bancolombia.com.co) → primero
    const hostTokens = host.split('.').filter(t => t.length >= 4);
    if (host && hostTokens.some(ht => nameTokens.some(t => ht.includes(t) || t.includes(ht)))) s += 10;

    // Canales corporativos verificados
    if (host.includes('linkedin.com')) s += 6;
    if (host.includes('crunchbase.com')) s += 1;
    if (host.includes('pitchbook.com')) s += 1;
    if (host.includes('forbes.com')) s += 1;

    // Sitios secundarios (documentos compartidos, presentaciones) → al final
    if (SECONDARY_DOMAINS.some(d => host === d || host.endsWith('.' + d))) s -= 10;

    return s;
  };

  return [...sources].sort((a, b) => score(b.url, b.title) - score(a.url, a.title));
}
