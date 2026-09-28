// Dominios de correo autorizados a entrar a la app (a pedido explícito del cliente: cualquier
// cuenta de Gmail, o cualquier correo institucional de la CUN). Debe coincidir exactamente con
// el regex en firestore.rules — esa regla es la protección real de los datos, este archivo solo
// controla la pantalla de login del navegador.
const ALLOWED_DOMAINS = ["gmail.com", "cun.edu.co"];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}
