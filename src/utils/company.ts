export function cleanCompanyName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function companyKey(raw: string): string {
  return cleanCompanyName(raw).toLowerCase();
}
