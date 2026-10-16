# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

CRM móvil-primario de captura de leads para eventos comerciales (Divergency AI). UI y dominio están en español. React 19 + TypeScript + Vite 6 + Tailwind 4, Firestore + Firebase Auth (Google), IA vía un Cloudflare Worker con Gemini. Ver [README.md](README.md) para stack, despliegue y seguridad.

## Comandos

```bash
npm run dev       # Vite dev server
npm run build     # build a dist/ (lo que sirve Firebase Hosting)
npm run lint      # tsc --noEmit (es el único chequeo; no hay tests ni ESLint)
npm run seed      # tsx scripts/seed.ts — carga inicial a Firestore
npm run verify:ai # verifica transporte y Worker de IA
```

Scripts de mantenimiento de fechas/contactos en `scripts/` (`migrate:dates`, `audit:dates`, `check:dates`, `check:contacts`, `backfill:dates`); usan `firebase-admin` con una service account (ver `scripts/serviceAccount.ts`) y operan sobre datos reales.

El Worker vive aparte en `worker/` (su propio `package.json`, `wrangler.toml`): `cd worker && wrangler deploy`. Despliega **el Worker antes que la app**; un HTTP 404 en una operación de IA significa Worker desactualizado.

## Arquitectura

- **Sin router ni store global**: [src/App.tsx](src/App.tsx) es el contenedor único. Mantiene `activeView` (`ActiveView` en [src/types.ts](src/types.ts)), suscripciones a Firestore (leads, users, events), evento actual, tema de acento y filtros, y renderiza la vista correspondiente de `src/components/`. Preferencias van a `localStorage` con claves versionadas (`*_v1`).
- **Datos**: todo acceso a Firestore pasa por [src/services/firestoreService.ts](src/services/firestoreService.ts) (`subscribeTo*`, `createOrUpdate*`, `importLeads`…). El proyecto de Firebase es compartido con otras herramientas, por eso `users` se filtra con `isAppUser`. La protección real está en [firestore.rules](firestore.rules) (dominios `gmail.com` / `cun.edu.co`, debe coincidir con [src/allowedUsers.ts](src/allowedUsers.ts), que solo controla el login en el navegador).
- **Offline**: [src/utils/offlineStore.ts](src/utils/offlineStore.ts) encola leads en `localStorage` cuando no hay red y `App` los sincroniza al volver.
- **IA**: [src/services/aiService.ts](src/services/aiService.ts) es el único punto de salida; [aiTransport.ts](src/services/aiTransport.ts) hace el fetch al Worker (`VITE_AI_WORKER_URL`) con ID token de Firebase. Sin esa variable, [aiDevSamples.ts](src/services/aiDevSamples.ts) devuelve datos simulados. Los resultados son `AiOutcome<T>` y **hay que usar `isAiFailure()`** para discriminar: el proyecto no compila con `strict`, así que el narrowing por `success` no ocurre solo. Los datos simulados (`isFallback`) se rechazan para no guardarlos. `research-company` y `enrich-lead` requieren grounding con Google Search y deliberadamente no tienen fallback sin búsqueda.
- **Worker** (`worker/src/index.ts`): 5 rutas de IA, valida el JWT de Firebase con `jose`; `GEMINI_API_KEY` es secret de Wrangler, nunca va en `.env`.
- **Formularios de lead unificados**: `useLeadForm.ts` + `LeadFormFields.tsx` los comparten el modal de nuevo lead, la captura móvil y el drawer de detalle (`LeadDrawerHost`/`LeadDetailDrawer`/`LeadDrawerTabContent`, estado en `useLeadDrawer.ts`). Cambios de campos deben mantenerse coherentes en los tres.
- **Utilidades de dominio** en `src/utils/`: normalización/validación de contacto y empresa (`contactInfo`, `company`, `emailKind`), `dedupeContacts`, importación de hojas de cálculo (`spreadsheet`, `importSpreadsheets`, usa `xlsx`/`papaparse`), `voiceLeadParser`, y fechas (`date.ts`: hay varios scripts de migración de fechas, así que las fechas de captura son un punto sensible; usar los helpers de ahí).
- **Tema**: colores definidos en [src/index.css](src/index.css) (tokens `@theme` + bloques `[data-theme=...]`); `App` solo cambia el atributo `data-theme` (azul/verde/naranja/púrpura).

## Notas

- `tsconfig` sin `strict`; `allowJs` activo. Alias `@` apunta a la raíz del repo.
- `vite.config.ts` tiene `DISABLE_HMR` heredado de AI Studio; no tocarlo.
- `server.ts.bak` y `dist/` son restos/artefactos; no editar.
