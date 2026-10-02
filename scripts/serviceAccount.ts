/**
 * Carga la credencial de Service Account para los scripts CLI.
 *
 * Las reglas de `firestore.rules` exigen Google Auth verificado del dominio
 * institucional, así que el SDK cliente no puede leer nada desde Node. Con una
 * Service Account el Admin SDK salta las reglas.
 *
 * La clave NUNCA se escribe en el repo. Se toma de una variable de entorno:
 *
 *   FIRESTORE_SERVICE_ACCOUNT_PATH=C:\ruta\a\service-account.json npm run audit:dates
 *
 * o bien del JSON completo en FIRESTORE_SERVICE_ACCOUNT_JSON.
 */
import { readFileSync } from "node:fs";
import { cert } from "firebase-admin/app";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export function loadServiceAccount(): ServiceAccount {
  const json = process.env.FIRESTORE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    return normalize(JSON.parse(json));
  }

  const path = process.env.FIRESTORE_SERVICE_ACCOUNT_PATH?.trim();
  if (path) {
    return normalize(JSON.parse(readFileSync(path, "utf8")));
  }

  console.error(
    "\nFalta la credencial de Service Account.\n\n" +
      "  Opción 1 (archivo):\n" +
      "    $env:FIRESTORE_SERVICE_ACCOUNT_PATH = 'C:\\ruta\\service-account.json'\n" +
      "  Opción 2 (contenido):\n" +
      "    $env:FIRESTORE_SERVICE_ACCOUNT_JSON = Get-Content -Raw 'C:\\ruta\\service-account.json'\n\n" +
      "Generala en Firebase console > Configuración > Cuentas de servicio.\n"
  );
  process.exit(1);
}

/** Credencial lista para `initializeApp`, con la clave privada ya desempaquetada. */
export function serviceAccountCredential(): ReturnType<typeof cert> {
  const { project_id, client_email, private_key } = loadServiceAccount();
  return cert({ projectId: project_id, clientEmail: client_email, privateKey: private_key });
}

function normalize(raw: Record<string, unknown>): ServiceAccount {
  const projectId = raw.project_id ?? raw.projectId;
  const clientEmail = raw.client_email ?? raw.clientEmail;
  const privateKey = raw.private_key ?? raw.privateKey;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("El JSON de Service Account no trae project_id / client_email / private_key.");
    process.exit(1);
  }

  return {
    project_id: String(projectId),
    client_email: String(clientEmail),
    // Firebase guarda el \n escapado dentro del JSON.
    private_key: String(privateKey).replace(/\\n/g, "\n")
  };
}