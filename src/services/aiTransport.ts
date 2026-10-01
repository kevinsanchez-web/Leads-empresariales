export interface AiFailure {
  success: false;
  simulated: boolean;
  error: string;
}

// `success` vive en la posición no genérica a propósito: si el discriminante quedara dentro de T,
// el type guard no podría leerlo. Además el proyecto no compila con "strict", así que el
// narrowing por discriminante booleano no ocurre solo: hay que pasar siempre por isAiFailure.
export type AiOutcome<T> = ({ success: true; simulated: boolean } & T) | AiFailure;

export function isAiFailure<T>(outcome: AiOutcome<T>): outcome is AiFailure {
  return outcome.success === false;
}

export const AI_SIMULATED_WARNING =
  "Modo sin IA: VITE_AI_WORKER_URL no está configurada, así que estos datos son de ejemplo. No los guardes.";

export const AI_FALLBACK_REJECTED =
  "El asistente de IA devolvió datos de ejemplo en lugar de datos reales. Revisa los campos a mano.";

export const AI_SIMULATED_DISABLED =
  "El asistente de IA no está disponible en este entorno. Revisa VITE_AI_WORKER_URL.";

function containsSimulatedMarker(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSimulatedMarker);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.isFallback === true) return true;
  return Object.values(record).some(containsSimulatedMarker);
}

function describeFailure(status: number | null, payload: any, err?: any): string {
  // Un 404 acá significa que el Worker desplegado no tiene esta ruta: la operación existe en el
  // código pero no en lo que está publicado. Es un fallo de despliegue, no de la IA.
  if (status === 404) {
    return "El asistente de IA no reconoce esta operación (HTTP 404). Probablemente el Worker desplegado está desactualizado.";
  }
  const fromWorker = typeof payload?.error === "string" && payload.error.trim().length > 0 ? payload.error : null;
  if (fromWorker) return fromWorker;
  if (status === 401 || status === 403) return "Tu sesión no es válida. Cierra sesión y vuelve a entrar.";
  if (status === 429) return "Se agotó la cuota del asistente de IA. Intenta de nuevo más tarde.";
  if (status !== null && status >= 500) return `El asistente de IA falló (HTTP ${status}).`;
  if (err) {
    // navigator.onLine solo refleja la interfaz de red, no si el destino es alcanzable, y en
    // algunos navegadores ni siquiera existe. Por eso se combina con el tipo de error.
    const offline = (typeof navigator !== "undefined" && navigator.onLine === false) || isNetworkError(err);
    if (offline) return "No hay conexión. El asistente de IA necesita internet.";
    return `No se pudo contactar el asistente de IA: ${err?.message || "error de red"}.`;
  }
  return "No se pudo obtener información de la IA.";
}

function isNetworkError(err: any): boolean {
  if (err?.name === "TypeError") return true;
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("econnrefused")
  );
}

export interface AiRequestOptions<T> {
  workerUrl: string;
  path: string;
  body: unknown;
  getIdToken: () => Promise<string | undefined>;
  devSample?: () => T;
  isOnline?: () => boolean;
}

export async function aiRequest<T extends object>(options: AiRequestOptions<T>): Promise<AiOutcome<T>> {
  const { workerUrl, path, body, getIdToken, devSample } = options;

  if (!workerUrl) {
    if (!devSample) {
      return { success: false, simulated: false, error: AI_SIMULATED_DISABLED };
    }
    return { success: true, ...devSample(), simulated: true } as AiOutcome<T>;
  }

  let payload: any = null;
  let status: number | null = null;

  try {
    const idToken = await getIdToken();
    if (!idToken) {
      return { success: false, simulated: false, error: "No hay sesión activa. Vuelve a iniciar sesión." };
    }

    const res = await fetch(`${workerUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    status = res.status;

    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      return { success: false, simulated: false, error: describeFailure(status, payload) };
    }

    if (!payload || typeof payload !== "object") {
      return { success: false, simulated: false, error: "El asistente de IA devolvió una respuesta ilegible." };
    }

    if (containsSimulatedMarker(payload)) {
      return { success: false, simulated: false, error: AI_FALLBACK_REJECTED };
    }

    // Un 200 con success:false no debe pasar por éxito solo por el status.
    if (payload.success === false) {
      return {
        success: false,
        simulated: false,
        error: describeFailure(status, payload),
      };
    }

    return { success: true, ...payload, simulated: false } as AiOutcome<T>;
  } catch (err) {
    console.warn(`Fallo real en ${path}:`, err);
    return { success: false, simulated: false, error: describeFailure(null, null, err) };
  }
}
