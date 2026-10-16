import { SUPER_ADMIN_EMAILS } from "../src/models/superAdmin";

// SOLO PARA PRUEBAS LOCALES. Credenciales de desarrollo del Super Administrador.
//
// Viven en scripts/ y no en src/ a propósito: lo que está en src/ se empaqueta en el navegador y
// una contraseña ahí quedaría visible para cualquiera. Hoy ningún código las usa, porque el
// inicio de sesión es con Google; las usará la semilla local y un eventual login de desarrollo
// con correo y contraseña. No sirven como credencial real de ningún entorno publicado.
export const DEV_SUPER_ADMIN = {
  email: SUPER_ADMIN_EMAILS[0],
  password: "123456",
} as const;
