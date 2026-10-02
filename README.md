# Leads Centralizados — Divergency AI

CRM de captura y seguimiento de leads para eventos comerciales y visitas a clientes.
Aplicación móvil-primaria: el comercial captura contactos **en el momento** con la voz,
la cámara o el teclado, y la app los sincroniza entre dispositivos.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript 5.8 + Vite 6 |
| Estilos | Tailwind CSS 4 |
| Base de datos | Cloud Firestore (`leads-divergency`) |
| Autenticación | Firebase Auth (Google) |
| IA | Cloudflare Worker + Gemini (`gemini-3.8-flash`, fallback `gemini-3.7-flash`) |
| Deploy | Firebase Hosting |

## Funciones de IA

Todas pasan por el Worker, que guarda la API key como secret. El navegador nunca la ve.

| Función | Qué hace | Usa búsqueda web |
|---|---|---|
| `scan-card` | Extrae datos de una foto de tarjeta de negocio | No |
| `analyze-lead` | Analiza y prioriza un lead | No |
| `draft-email` | Redacta un correo de seguimiento | No |
| `research-company` | Investiga una empresa y devuelve fuentes | Sí |
| `enrich-lead` | Completa LinkedIn, correo y teléfono de un lead con fuentes citadas | Sí |

`research-company` y `enrich-lead` usan grounding con Google Search y no tienen un tercer
intento sin búsqueda: un modelo sin grounding inventa datos con el formato esperado y devuelve
`success:true`, así que sin búsqueda la respuesta correcta es un error visible.

## Instalación

**Requisitos:** Node.js 18+ y una cuenta de Google con el proyecto de Firebase.

```bash
npm install
cp .env.example .env.local
```

### Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `VITE_AI_WORKER_URL` | `.env.local` | URL del Worker que proxea las llamadas a Gemini |
| `GEMINI_API_KEY` | **Secret de Wrangler** | Clave de la API de Gemini |

> ⚠️ `GEMINI_API_KEY` **no** va en `.env.local`. La app no la lee desde ahí: es un secret
> del Cloudflare Worker, cargado una sola vez con `wrangler secret put`. Si la pones en un
> `.env.local` no tendrá efecto.

Sin `VITE_AI_WORKER_URL`, la app arranca y las funciones de IA devuelven datos simulados
locales en lugar de fallar.

### Cargar la clave de Gemini

```bash
cd worker
wrangler secret put GEMINI_API_KEY
```

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run preview  # sirve el build
npm run lint     # TypeScript en modo comprobación
npm run seed     # carga datos iniciales en Firestore
```

## Despliegue

**El Worker primero**, porque la app depende de su URL:

```bash
cd worker
wrangler deploy
```

**Luego la app:**

```bash
npm run build
firebase deploy --only hosting
```

> ⚠️ Si la app reporta `HTTP 404` en una operación de IA, el Worker publicado está desactualizado
> con respecto al código de la app: se desplegó el frontend pero no el Worker. Vuelve a correr
> `wrangler deploy`. El caso típico es `enrich-lead`, cuya ruta se agregó en el commit `75d4a5c`.

## Estructura

```
src/
  components/     Vistas y componentes (11 vistas en App.tsx)
  services/       aiService.ts: único punto de salida hacia la IA
  utils/          notificaciones, cola offline, validación
  data/           datos de la semilla
worker/src/
  index.ts        5 rutas de IA, validación JWT, prompts
scripts/seed.ts   carga inicial a Firestore
```

## Seguridad

- `firestore.rules` es la protección real de los datos. Verifica el dominio del token
  (`@gmail.com` o `@cun.edu.co`) en cada lectura y escritura.
- El Worker valida el ID token de Firebase con `jose` antes de atender cualquier ruta
  de IA, salvo el health check.
- `GEMINI_API_KEY` vive únicamente como secret de Wrangler.
- La `apiKey` de Firebase en `src/firebase.ts` es pública por diseño: identifica el
  proyecto, no autoriza. La autorización la aplican las reglas de Firestore.
