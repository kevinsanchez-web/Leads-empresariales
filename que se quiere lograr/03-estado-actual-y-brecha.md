# Cómo está la app hoy y qué hay que cambiar para llegar al MVP

Análisis hecho sobre el código del repositorio (rama `main`, commit `dc5073a`). Compara la app actual con el MVP descrito en [02-mvp.md](02-mvp.md). Todo lo que aparece aquí sale de leer el código; no se probó la app en ejecución, ni se revisaron los datos reales de Firestore.

## 1. Estado actual

### Qué es
Una SPA en React 19 + TypeScript + Vite, con Firestore y Firebase Auth (Google), y un Cloudflare Worker que llama a Gemini. Está pensada para un solo cliente que captura leads en eventos. Son unas 14.300 líneas en `src/` y `worker/src/`; los archivos más grandes son `VoiceLeadAssistant.tsx` (1.126 líneas), `EnriquecimientoView.tsx` (773), `LeadDetailDrawer.tsx` (728) y `App.tsx` (712).

### Qué funciona bien y se puede reutilizar
| Pieza | Dónde | Comentario |
|---|---|---|
| Lectura de tarjetas por foto | `scan-card` en el Worker, `CardScannerModal.tsx` | Funciona y ya está integrada al formulario de lead. |
| Enriquecimiento con fuentes citadas | `enrich-lead`, `research-company`, `EnriquecimientoView.tsx` | Solo guarda datos con cita; si no hay, devuelve `null` con motivo. Es la parte más diferencial. |
| Caché de enriquecimiento | `firestoreService.ts` (`enrichmentCache`, 90 días por empresa y 30 por persona) | Reduce el costo de repetir búsquedas. |
| Captura por voz | `VoiceLeadAssistant.tsx`, `voiceLeadParser.ts` | Extra que no estaba en el documento. |
| Importación con deduplicación | `ImportLeadsModal.tsx`, `importSpreadsheets.ts`, `dedupeContacts.ts` | Cubre el rol de Capturador. |
| Formulario de lead unificado | `useLeadForm.ts` + `LeadFormFields.tsx` | Compartido por modal, captura móvil y drawer: facilita volver dinámicos los campos. |
| Kanban, alertas, historial, reportes | `SeguimientosView`, `notifications.ts`, `Lead.history`, `ReportsDashboard` | Base del pipeline y de los paneles. |
| Modo offline | `offlineStore.ts` | Cola local de leads que se sincroniza al volver la red. |
| Transporte de IA seguro | `aiTransport.ts`, `aiService.ts`, Worker | La clave de Gemini no sale del Worker; valida el token con `jose`; rechaza datos simulados. |

## 2. Hallazgos críticos (bloquean dar acceso a una empresa real)

### 2.1 La identidad del usuario no está ligada a Firebase Auth
En `App.tsx`, `currentUser` sale de `localStorage` (`centralized_current_user_v1`) o de `MOCK_USERS[0]`, y se cambia con `setCurrentUser` desde el selector de usuarios (`onSelectUser`). Firebase Auth solo decide quién entra a la pantalla; **después, cualquier usuario autenticado puede elegirse como otro usuario o como administrador desde el navegador.** El rol (`isAdmin`) se calcula en el cliente a partir de ese objeto, y también con `role.includes('admin')`. Hoy los roles son solo cosmética de la interfaz.

### 2.2 Las reglas de Firestore no distinguen roles ni propietarios
`firestore.rules` tiene una sola regla: cualquier cuenta con correo verificado de `gmail.com` o `cun.edu.co` puede leer y escribir **todo** (`/{document=**}`). Eso incluye borrar leads, editar usuarios y leer `enrichmentCache`. `gmail.com` abre el acceso a cualquier persona con una cuenta de Google.

### 2.3 Contraseñas y PIN en Firestore y en el código
- `UserRep` tiene los campos `password` y `pin` (por defecto `'1234'` en `UserAccountsModal.tsx`), que se guardan con `createOrUpdateUser`.
- `src/data/mockData.ts` trae contraseñas de ejemplo (`adminpassword`, `password123`).
- Como la lectura de `users` es abierta, cualquier usuario autenticado puede leer esos campos.

### 2.4 El Worker no limita ni cuenta el uso
`requireAuthorizedUser` valida el token y el dominio, pero no registra quién consume ni cuánto: no hay créditos, cuotas por usuario ni límite de tasa propios (solo se detectan errores de cuota de Gemini). El CORS está abierto (`Access-Control-Allow-Origin: *`). La lista de dominios permitidos está repetida en el cliente, en el Worker y en las reglas.

## 3. Brecha por bloque del MVP

### Fase A. Permisos, asignación y auditoría

| Qué pide el MVP | Hoy | Qué cambiar |
|---|---|---|
| Roles Administrador, Marketing, Capturador, Ventas | Solo `admin` / `executive` (`UserRoleType`), aplicados en el cliente | Ampliar el tipo de rol; guardar el rol del usuario en un documento que solo el administrador pueda escribir y en `custom claims` de Firebase Auth; derivar `currentUser` del token (`auth.currentUser`), no de `localStorage`. |
| Ventas solo ve lo suyo | `Lead.capturedBy` guarda un **nombre** (texto) de quien capturó; no hay campo de asignación | Añadir `assignedTo` (id de usuario) al lead; reglas de Firestore que limiten la lectura de Ventas a sus leads; migrar los leads existentes. El filtrado actual por `capturedBy` (`showOnlyMyLeads`) es solo un filtro de pantalla. |
| Reglas del servidor por rol | Una regla global | Reescribir `firestore.rules` por colección y rol; probarlas con el emulador de Firebase. |
| Sin `password` / `pin` | Presentes en el tipo, el modal y los datos de ejemplo | Eliminar los campos y el flujo de contraseñas; la autenticación ya la hace Google. Revisar los documentos existentes en `users` y borrar esos campos. |
| Bitácora de auditoría | No existe. `Lead.history` es el historial de contacto del lead, no una auditoría | Colección `auditLog` de solo escritura (sin edición ni borrado), con quién, qué, cuándo y el valor anterior; registrar cambios de etapa, exportaciones, ediciones de configuración y accesos de soporte. Lo ideal es escribirla desde el servidor, no desde el cliente. |
| Modo soporte con consentimiento | No existe | Documento de autorización con vigencia y revocación, y una regla que permita el acceso del rol Soporte solo mientras esté vigente. |
| Exportar datos solo para Administrador | `LeadsTable` y `ReportsDashboard` exportan para cualquier usuario | Restringir por rol y registrar la exportación. |

### Fase B. Configuración sin código

**Etapas y embudos.** `LeadStatus` es un tipo fijo de 6 valores y aparece como texto literal unas 84 veces en 15 archivos (`FiltersModal`, `SeguimientosView`, `ReportsDashboard`, `LeadsTable`, `useLeadDrawer`, `importSpreadsheets`, `notifications`, `mockData`, entre otros). Un solo embudo, sin probabilidad de cierre ni motivos de cierre.

Cambios:
- Nuevas colecciones `pipelines`, `stages` (con orden, color y probabilidad) y `closeReasons`.
- `Lead.status` pasa de texto fijo a una referencia a una etapa, y el lead pasa a pertenecer a un embudo.
- Sustituir todos los literales por consultas a la configuración.
- Migrar los leads existentes: mapear los 6 estados actuales a las etapas de la plantilla por defecto.

**Campos personalizados.** `Lead` tiene unos 25 campos fijos y los formularios los repiten a mano. Para campos dinámicos:
- Definiciones de campo (tipo, obligatoriedad, etapa en la que se exige) guardadas como datos.
- Un objeto `customFields` dentro del lead.
- `LeadFormFields.tsx` y `useLeadForm.ts` (ya unificados) generan el formulario a partir de las definiciones; también hay que adaptar la tabla, los filtros, la importación y los reportes.
- La validación "campo obligatorio por etapa" va al mover el lead (kanban y drawer).
- Hoy no hay entidades separadas para contactos, empresas y oportunidades: la empresa es un texto del lead. Decidir si el MVP mantiene "lead = contacto + oportunidad" (más simple) o los separa.

**Etiquetas y plantillas por vertical.** No existe. Las etiquetas pueden ser un campo más; las plantillas son un script o pantalla que carga embudo, campos y motivos predefinidos.

**Marca por cliente.** El tema actual es `data-theme` con 4 colores fijos y un logo (`DivergencyLogo`) del proveedor. Hay que sacar nombre, logo y colores a una configuración por empresa.

### Fase C. Créditos y asignación

| Qué pide el MVP | Hoy | Qué cambiar |
|---|---|---|
| Créditos de enriquecimiento y lectura de tarjetas | Sin conteo | Registrar cada llamada de IA por empresa (en el Worker, que ya autentica) y descontar de un saldo; que la UI muestre el saldo y bloquee al agotarse. No cobrar si el enriquecimiento devuelve "no encontrado". |
| Enriquecimiento "por correo o teléfono" | Hoy enriquece por nombre, cargo y empresa | Revisar el diseño: buscar por teléfono o correo personal da pocos resultados y más problemas de privacidad. |
| Asignación Round Robin | No existe | Función que, al crear o calificar un lead, elija al siguiente usuario de Ventas; guardar el último asignado. Depende de `assignedTo` (fase A). |
| Alertas "sin atención en 2 horas" | Las alertas se calculan en el navegador al abrir la app (`getNotificationAlerts`) | Para avisos reales a un supervisor hace falta un proceso del servidor (Cloud Functions o tarea programada); no se pueden calcular desde el navegador. |
| Reportes por rol | Un solo panel, sin ingresos proyectados | Probabilidad por etapa (fase B) + `estimatedValue` ya permiten el pronóstico; filtrar métricas según el rol. |
| Filtros guardados | No existen | Guardar filtros por usuario (hoy `App.tsx` mantiene los filtros solo en memoria). |

### Fase D. Bot de WhatsApp (no iniciado)
No hay nada: ni conexión con la API de WhatsApp Business, ni base de conocimiento, ni recepción de mensajes. Requiere un servicio de servidor para el webhook (el Worker actual podría hospedarlo, pero hoy solo atiende rutas de IA bajo `/api/ai/`), almacenamiento y búsqueda de los documentos del cliente, registro de cada respuesta con su fuente, y traspaso a un humano. Se mantiene fuera de las fases A a C.

## 4. Deuda técnica que condiciona el trabajo

1. **`App.tsx` concentra el estado.** 712 líneas con filtros, suscripciones, usuario actual, eventos y el reparto de props. Con permisos y configuración dinámica conviene extraerlo (contexto o hooks por dominio) antes de la fase B.
2. **Sin `strict` en TypeScript.** Hay narrowing que no ocurre solo (lo deja anotado `aiTransport.ts`). Activar `strict` de forma gradual ayudaría a detectar errores al cambiar tipos como `Lead` y `LeadStatus`. Hoy `npm run lint` (`tsc --noEmit`) pasa sin errores.
3. **Sin pruebas automáticas.** No hay runner ni pruebas. Los scripts `check:*` y `verify:*` son comprobaciones manuales contra datos reales. Mínimo necesario: pruebas de las reglas de Firestore (emulador) y de las utilidades de dominio (`dedupeContacts`, `importSpreadsheets`, `date`, `contactInfo`).
4. **Fechas como punto sensible.** Existen cuatro scripts de migración y auditoría de fechas (`migrate:dates`, `audit:dates`, `check:dates`, `backfill:dates`), señal de problemas pasados con las fechas de captura. Al migrar `Lead` hay que reutilizar los helpers de `utils/date.ts`.
5. **Proyecto de Firebase compartido.** El código ya filtra `users` con `isAppUser` porque otras herramientas de Divergency escriben en el mismo proyecto. Esto choca con reglas estrictas por colección: hay que aislar el proyecto del MVP o prefijar las colecciones.
6. **Idioma y marca fijos en español y atados a Divergency.** Aceptable para los pilotos.
7. **`firebase-debug.log`, `server.ts.bak`, `dist/` y `.env.production`** están en el directorio de trabajo; los dos primeros y `dist/` ya están ignorados por git, pero conviene revisar qué contiene `.env.production` antes de abrir el repositorio a más personas.

## 5. Orden de trabajo propuesto

Sigue el orden del MVP, con pasos que se pueden entregar y probar por separado.

1. **Identidad y seguridad (primero, sin cambiar la interfaz).** Derivar `currentUser` del usuario autenticado; eliminar `password` y `pin`; roles en `custom claims`; reescribir `firestore.rules`; pruebas con el emulador.
2. **Asignación.** Añadir `assignedTo`, migrar los leads existentes, restringir a Ventas, y retirar el selector de usuarios.
3. **Auditoría.** Colección `auditLog` y registro de los eventos clave; modo soporte con consentimiento.
4. **Extraer el estado de `App.tsx`** (preparación de la fase B).
5. **Embudos, etapas y motivos de cierre como datos**, con la migración de los 6 estados actuales.
6. **Campos personalizados**, generando el formulario, la tabla y los filtros desde las definiciones; plantillas por vertical.
7. **Créditos de IA** medidos en el Worker, y asignación Round Robin.
8. **Alertas del servidor y reportes por rol.**
9. Bot de WhatsApp, solo tras validar lo anterior con un piloto.

Los pasos 1 a 3 no cambian lo que ve el usuario, pero sin ellos no se debe dar acceso a un cliente real. El paso 5 es el cambio más extenso: toca unos 15 archivos y exige una migración de datos.

## 6. Preguntas abiertas para decidir antes de empezar

- ¿Un proyecto de Firebase por cliente piloto, o uno compartido con `tenantId`? (El MVP asume uno por cliente.)
- ¿"Lead" sigue siendo contacto y oportunidad a la vez, o se separan contactos, empresas y oportunidades?
- ¿Qué ocurre con los leads y usuarios que ya existen en el proyecto actual: se migran o se empieza limpio?
- ¿Las alertas de supervisor justifican introducir Cloud Functions en esta fase?
- ¿Qué políticas de datos personales se prometen a los pilotos (consentimiento, borrado, ubicación de los datos y uso de modelos externos de IA)?
