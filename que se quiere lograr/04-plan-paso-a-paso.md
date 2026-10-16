# Plan paso a paso hacia el MVP (todo en local, sin despliegue)

Convierte la brecha de [03-estado-actual-y-brecha.md](03-estado-actual-y-brecha.md) en pasos ejecutables. Alcance: fases A, B y C de [02-mvp.md](02-mvp.md). El bot de WhatsApp (fase D) queda fuera. **No se despliega nada:** todo corre en la máquina de desarrollo contra emuladores.

## Reglas del plan

- Cada paso termina con la app funcionando y `npm run lint` sin errores. No se avanza con un paso a medias.
- Cada paso es un commit (o varios pequeños) para poder volver atrás.
- Los pasos están ordenados por dependencia: no saltarse el orden.
- "Listo cuando" es el criterio de aceptación; si no se puede comprobar, el paso no está terminado.

## Entorno local (decisiones fijas)

| Pieza | Cómo corre en local |
|---|---|
| Frontend | `npm run dev` (Vite) |
| Firestore | **Emulador local** (`firebase emulators:start`); los datos del proyecto real no se tocan |
| Autenticación | **Firebase Auth real** (inicio de sesión con Google). No se usa el emulador de Auth, porque el Worker publicado solo acepta tokens firmados por Google |
| IA | **El Worker ya publicado** (`VITE_AI_WORKER_URL` actual). No se corre ni se modifica ningún Worker en local, y no se despliega nada |
| Roles | Se guardan en el documento `users/{uid}` del emulador de Firestore y las reglas los leen de ahí (no en `custom claims`, que requerirían escribir en el Auth real) |
| Datos | Un script de semilla local que crea usuarios de cada rol, un embudo y leads de prueba en el emulador |

Consecuencia: la app local lee y escribe en el emulador, pero firma las llamadas de IA con el token de una cuenta real de Google. Para probar varios roles hacen falta **varias cuentas de Google reales** (por ejemplo 3 o 4 cuentas de prueba de `gmail.com`), cada una con su documento de usuario y su rol en la semilla. Las pruebas de reglas de Firestore no necesitan cuentas reales: usan identidades simuladas del emulador.

Requisitos de la máquina: Node 18+, `firebase-tools` y Java (lo pide el emulador de Firestore).

---

## BLOQUE 0. Base de trabajo

### Paso 0.1. Emuladores y conexión local
**Estado: hecho, con una variación: se usan los emuladores de Auth **y** Firestore (`npm run emulators`, `npm run dev:local`, `npm run seed:emulator`). Con el emulador de Auth, el Worker de IA publicado rechaza los tokens, así que en este modo la IA devuelve datos de ejemplo marcados como simulados.**

**Qué se hace**
- Añadir a `firebase.json` la sección `emulators` solo para Firestore, con puerto fijo y la interfaz del emulador.
- En `src/firebase.ts`, llamar a `connectFirestoreEmulator` únicamente cuando una variable de entorno de desarrollo lo indique (por ejemplo `VITE_USE_FIRESTORE_EMULATOR=true` en `.env.local`). Auth sigue apuntando al proyecto real.
- Con la variable activa, mostrar un aviso visible en la interfaz ("Datos locales") para no confundir el entorno.
- Desactivar la caché persistente de Firestore en modo emulador, para que los datos de una sesión anterior no se mezclen.

**Listo cuando:** `firebase emulators:start` y `npm run dev` levantan, el login con Google entra, y los leads que se crean aparecen en el panel del emulador y **no** en el proyecto real.

### Paso 0.2. Semilla local
**Qué se hace**
- Reescribir `scripts/seed.ts` (o crear `scripts/seed-local.ts`) para que escriba en el emulador: una cuenta por rol (Administrador, Marketing, Capturador, Ventas A, Ventas B), un embudo de ejemplo y unos 30 leads repartidos.
- Dejar de depender de `src/data/mockData.ts` y de sus contraseñas de ejemplo.

**Listo cuando:** una sola orden deja el emulador con datos coherentes y repetibles.

### Paso 0.3. IA contra el Worker publicado
**Qué se hace**
- Dejar `VITE_AI_WORKER_URL` apuntando al Worker actual y comprobar que, con la app local y el emulador de Firestore, `scan-card` y `enrich-lead` responden.
- La caché de enriquecimiento (`enrichmentCache`) pasa a vivir en el emulador, así que en local empieza vacía.
- No se modifica el Worker en esta etapa. Lo que requiera cambiarlo (ver 4.1) se anota como pendiente para el despliegue.

**Listo cuando:** escanear una tarjeta y enriquecer un lead funcionan de punta a punta con Firestore local.

### Paso 0.4. Pruebas automáticas mínimas
**Estado: parcial: Vitest y pruebas de las reglas de Firestore (`npm test`, con el emulador en marcha). Faltan las pruebas de utilidades de dominio.**

**Qué se hace**
- Añadir Vitest para utilidades (`dedupeContacts`, `importSpreadsheets`, `date`, `contactInfo`, `emailKind`).
- Añadir un arnés de pruebas de reglas de Firestore con `@firebase/rules-unit-testing` contra el emulador.
- Un script `npm test`.

**Listo cuando:** `npm test` corre y pasa; hay al menos una prueba de reglas que hoy demuestra el problema (un usuario de Ventas puede leer leads ajenos).

---

## BLOQUE 1. Fase A: identidad, permisos y auditoría

### Paso 1.1. La identidad sale de Firebase Auth
**Estado: hecho. El id de cada documento de `users` es el correo en minúsculas.**

**Qué se hace**
- En `App.tsx`, eliminar `currentUser` basado en `localStorage` y `MOCK_USERS`. El usuario actual se construye a partir de `auth.currentUser` y de su documento en `users`.
- Quitar el selector de usuarios (`onSelectUser`, `setCurrentUser`) de `Header`, `UsuariosView` y `UserAccountsModal`, o dejarlo solo como "ver usuarios" sin poder suplantar.
- Si el usuario autenticado no tiene documento de usuario, mostrar una pantalla de "cuenta no autorizada, pide acceso al administrador".

**Listo cuando:** dos navegadores con dos cuentas distintas muestran cada uno su propio usuario y no hay forma de cambiar de usuario desde la interfaz.

### Paso 1.2. Eliminar contraseñas y PIN
**Estado: hecho en código, datos de ejemplo y semilla. Falta limpiar documentos reales existentes en el proyecto de Firebase, cuando se despliegue.**

**Qué se hace**
- Quitar `password` y `pin` de `UserRep`, del formulario de `UserAccountsModal` y de la semilla.
- Reemplazar el alta de usuario por una **invitación**: el administrador registra el correo y el rol; la persona entra con su cuenta.
- Script local que borre esos campos de documentos existentes en el emulador (para probar el procedimiento que luego se haría con datos reales).

**Listo cuando:** ninguna parte del código ni de los datos contiene `password` ni `pin`.

### Paso 1.3. Modelo de roles
**Estado: implementado (modelo, controlador y vistas).** Decisiones tomadas: `super_admin` es el equipo de Divergency y sustituye al rol "Soporte" del documento 01; se define por una lista de correos en `src/models/superAdmin.ts` y no se asigna desde la interfaz; un administrador no puede crear otros administradores. Estructura MVC: `src/models/` (roles, permisos, super admin), `src/controllers/` (acceso y sesión) y `src/components/` como vistas.

**Qué se hace**
- Ampliar `UserRoleType` a: `admin`, `marketing`, `capturador`, `ventas` (más `soporte`, que se activa en el paso 1.7).
- Definir un único módulo de permisos (por ejemplo `src/permissions.ts`) con una tabla rol → acciones (ver configuración, exportar, ver cierres, ver leads ajenos, importar, etc.). La interfaz consulta esa tabla; no vuelve a comprobar `role.includes('admin')`.
- Reemplazar las comprobaciones `isAdmin` de `Sidebar`, `Header` y `ConfiguracionView` por la tabla.

**Listo cuando:** el menú y los botones de cada rol cambian según la tabla y no queda ningún `includes('admin')` en el código.

### Paso 1.4. Roles en el servidor
**Estado: hecho en `firestore.rules` y probado (17 pruebas). Variación: el rol se lee del documento `users/{correo}` y no de `custom claims`.**

**Qué se hace**
- Guardar el rol en el documento `users/{uid}`, que solo el Administrador puede escribir. El identificador del documento es el `uid` de Firebase Auth.
- Reescribir `firestore.rules`: `role()` lee `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`; funciones `isSignedIn()` e `isAdmin()`; reglas por colección; `enrichmentCache` y `users` con permisos propios; quitar la regla global `/{document=**}` y el criterio por dominio de correo como única barrera.
- Crear el primer Administrador con la semilla (en el emulador no hay problema de "quién crea al primero").
- Nota para el despliegue: pasar el rol a `custom claims` ahorra una lectura por cada operación; se deja anotado, no se hace ahora.
- Pruebas de reglas: cada rol puede y no puede hacer lo que dice la tabla del paso 1.3.

**Listo cuando:** las pruebas de reglas pasan para los 4 roles, y una consulta directa al emulador con el token de Ventas a `users` o a configuración falla.

### Paso 1.5. Asignación de leads (`assignedTo`)
**Qué se hace**
- Añadir `assignedTo` (uid) y `assignedAt` a `Lead`.
- Script local de migración: asignar los leads existentes a un usuario (por coincidencia de nombre con `capturedBy` o a un usuario "sin asignar" explícito).
- Reglas: Ventas lee y escribe solo los leads con `assignedTo == uid`; Capturador crea leads y no ve cierres; Marketing ve leads sin asignar.
- La consulta de `subscribeToLeads` debe filtrar por rol (Firestore no permite una consulta que la regla no garantice).
- Pantalla para que el Administrador (y el Capturador, al calificar) asigne o reasigne.

**Listo cuando:** con la semilla, Ventas A solo ve sus leads, Ventas B los suyos, Administrador todos, y las pruebas de reglas lo confirman.

### Paso 1.6. Bitácora de auditoría
**Qué se hace**
- Colección `auditLog` con: quién, acción, entidad, valor anterior y nuevo, fecha. Reglas: se puede crear, nadie la edita ni la borra, solo Administrador la lee.
- Servicio `audit.ts` y registro en: cambio de etapa o estado, reasignación, borrado, exportación, cambios de usuarios y roles, cambios de configuración.
- Vista "Auditoría" para el Administrador, con filtros por usuario, acción y fecha.

**Listo cuando:** cada acción de la lista deja una entrada visible y una prueba de reglas confirma que no se puede alterar una entrada.

### Paso 1.7. Modo soporte con consentimiento
**Qué se hace**
- Documento `supportGrants` creado por el Administrador (vigencia, motivo, revocable).
- Regla que permite al rol `soporte` leer solo mientras exista una autorización vigente; todo acceso queda en `auditLog`.
- Pantalla del Administrador para conceder y revocar.

**Listo cuando:** sin autorización el usuario de soporte no lee nada; con ella sí; al expirar o revocar vuelve a no poder, y todo queda en la bitácora.

### Paso 1.8. Exportación restringida
**Qué se hace**
- `LeadsTable` y `ReportsDashboard` exportan solo si el rol lo permite y registran la acción en `auditLog`.

**Listo cuando:** Ventas y Capturador no ven el botón de exportar y el Administrador sí, dejando rastro.

**Fin de la fase A.** Hito: la app ya es segura para que la usen varios roles reales.

---

## BLOQUE 2. Preparación de la fase B

### Paso 2.1. Sacar el estado de `App.tsx`
**Qué se hace**
- Extraer a hooks o contextos: sesión y usuario, suscripciones a datos, filtros y búsqueda, evento actual, cola offline.
- `App.tsx` queda como composición de vistas.
- Sin cambios de comportamiento.

**Listo cuando:** `App.tsx` queda por debajo de unas 250 líneas, la app se comporta igual y las pruebas siguen pasando.

### Paso 2.2. Activar `strict` por etapas
**Qué se hace**
- Activar `strict` y corregir errores archivo por archivo (empezando por `types.ts`, `services/` y `utils/`).
- Mantener un historial para poder revertir si una etapa se complica.

**Listo cuando:** `npm run lint` pasa con `strict: true`.

---

## BLOQUE 3. Fase B: configuración sin código

### Paso 3.1. Modelo de datos de configuración
**Qué se hace**
- Definir los tipos y las colecciones:
  - `pipelines` (nombre, orden, activo).
  - `stages` (embudo, nombre, orden, color, probabilidad de cierre, tipo: abierta, ganada, perdida).
  - `closeReasons`.
  - `tags`.
  - `fieldDefinitions` (entidad, clave, etiqueta, tipo, opciones, obligatoriedad, etapa en que se exige).
- Servicio `configService.ts` con suscripciones, y reglas: todos los roles leen, solo Administrador escribe.
- Cambiar `Lead` para llevar `pipelineId`, `stageId`, `closeReasonId?`, `tagIds` y `customFields`.

**Listo cuando:** los tipos compilan, las colecciones existen en el emulador y las pruebas de reglas cubren la configuración.

### Paso 3.2. Plantilla por defecto y migración de estados
**Qué se hace**
- Crear la plantilla "General" con las 6 etapas actuales (Nuevo, Contactado, Calificado, Reunión Agendada, Ganado, Descartado) con sus probabilidades.
- Script local que migre `Lead.status` a `stageId` y valide que no quede ningún lead sin etapa.

**Listo cuando:** todos los leads de la semilla tienen `stageId` y el script es repetible.

### Paso 3.3. Sustituir los estados fijos, vista por vista
Se hace en este orden y en commits separados; después de cada uno la app compila y funciona:
1. `useLeadForm.ts`, `LeadFormFields.tsx` y `ImportLeadsModal` / `importSpreadsheets.ts` (alta de leads con la etapa inicial del embudo).
2. `SeguimientosView` (kanban: columnas generadas desde `stages`).
3. `LeadsTable` y `FiltersModal`.
4. `useLeadDrawer.ts`, `LeadDetailDrawer`, `LeadDrawerTabContent`.
5. `ReportsDashboard`, `LeadsTrendChart`, `MetricsHeader`.
6. `notifications.ts`, `NotificationsView`, `HeaderNotificationsPopover`, `pushNotifications.ts`, `UsuariosView`.
7. Borrar `LeadStatus`, los literales restantes y los datos de `mockData.ts`.

**Listo cuando:** una búsqueda de los 6 nombres de etapa en el código solo encuentra la plantilla y las pruebas; renombrar una etapa en los datos cambia el nombre en toda la interfaz.

### Paso 3.4. Pantalla de configuración de embudos
**Qué se hace**
- Vista de Administrador para crear, renombrar, reordenar y eliminar etapas y embudos (con aviso y reasignación si una etapa tiene leads), definir probabilidad y administrar motivos de cierre y etiquetas.
- Selector de embudo en el kanban y en los filtros.
- Al mover un lead a una etapa perdida se pide el motivo de cierre.
- Cada cambio queda en `auditLog`.

**Listo cuando:** crear un segundo embudo "Posventa" con 3 etapas y mover un lead por él funciona sin tocar código.

### Paso 3.5. Campos personalizados
**Qué se hace**
- Pantalla de Administrador para definir campos (texto, número, selección única y múltiple, fecha, casilla; los archivos se dejan para el final del paso 3.7).
- `LeadFormFields.tsx` genera los campos desde `fieldDefinitions`; `useLeadForm.ts` los valida y los guarda en `customFields`.
- Mostrarlos en `LeadDetailDrawer`, como columnas opcionales de `LeadsTable`, y como filtros en `FiltersModal`.
- `importSpreadsheets.ts` mapea columnas del archivo a campos personalizados.
- Quitar el campo de la interfaz si el rol no tiene permiso para verlo.

**Listo cuando:** un campo "Tipo de propiedad" creado por el Administrador aparece en el formulario, la ficha, la tabla, el filtro y la importación.

### Paso 3.6. Campos obligatorios por etapa
**Qué se hace**
- Al mover un lead (kanban o ficha), validar los campos exigidos por la etapa destino; si faltan, abrir un formulario con solo esos campos.
- La misma validación al importar y al guardar.

**Listo cuando:** no se puede mover un lead a "Cotizado" sin los datos de facturación, y el mensaje indica cuáles faltan.

### Paso 3.7. Plantillas por vertical y marca
**Qué se hace**
- Dos plantillas cargables desde la pantalla de configuración (por ejemplo inmobiliaria y B2B): embudos, etapas, campos y motivos de cierre.
- Aplicar una plantilla en un entorno vacío.
- Marca por empresa: nombre, logotipo y colores guardados en `settings/brand`, aplicados al tema (reutilizando `data-theme` e `index.css`) y al logo del encabezado y del login.
- Campo de tipo archivo con almacenamiento (emulador de Storage), si se decide incluirlo.

**Listo cuando:** en un emulador vacío, aplicar cada plantilla deja un CRM usable con su vocabulario y su marca en menos de unos minutos.

**Fin de la fase B.** Hito: un administrador configura el CRM sin programar.

---

## BLOQUE 4. Fase C: créditos, asignación y reportes

### Paso 4.1. Conteo de uso de IA
**Qué se hace**
- Como el Worker publicado no se toca y no tiene acceso a Firestore, **la app** registra cada llamada de IA que termina bien (quién, función, resultado) en el emulador y descuenta del saldo de créditos de la empresa.
- La app muestra el saldo y bloquea las funciones de IA al agotarse.
- Limitación asumida: este control está en el cliente, así que no es a prueba de manipulación. Para cobrar créditos de verdad, el conteo debe pasar al Worker o a una función de servidor; queda como pendiente de despliegue.
- No se descuenta el crédito si el enriquecimiento devuelve "no encontrado" o error.
- Definir cuánto cuesta cada función (`scan-card`, `enrich-lead`, `research-company`, `analyze-lead`, `draft-email`).

**Listo cuando:** consumir créditos baja el saldo visible, un resultado "no encontrado" no lo baja, y con saldo cero la función está bloqueada con un mensaje claro.

### Paso 4.2. Enriquecimiento por correo o teléfono (decisión previa)
**Qué se hace**
- Decidir con una prueba manual de 20 a 30 contactos reales si la búsqueda por correo o teléfono da resultados útiles con cita. Si no, mantener la búsqueda por empresa y nombre y ajustar el documento de producto.

**Listo cuando:** la decisión queda anotada con la tasa de aciertos observada.

### Paso 4.3. Asignación automática (Round Robin)
**Qué se hace**
- Reglas de asignación guardadas como configuración (activa o no, usuarios participantes, orden).
- Al crear o calificar un lead se asigna al siguiente usuario de Ventas, guardando el último asignado de forma transaccional para evitar duplicados.
- Variante por carga de trabajo (el que tenga menos leads abiertos) como segunda opción.

**Listo cuando:** crear 10 leads reparte equitativamente entre los usuarios de Ventas de la semilla, incluso al crearlos desde dos pestañas a la vez.

### Paso 4.4. Alertas de atención
**Qué se hace**
- En local, un script o proceso (`npm run alerts`) que revise los leads sin atención pasadas N horas y escriba notificaciones para el supervisor. Se documenta que en producción se sustituirá por una tarea programada del servidor.
- La campana y `NotificationsView` muestran esas notificaciones junto con las alertas actuales.

**Listo cuando:** un lead sin atención por más del umbral genera una notificación al supervisor, y deja de generarla al atenderse.

### Paso 4.5. Reportes por rol y filtros guardados
**Qué se hace**
- Ingresos proyectados = `estimatedValue` × probabilidad de la etapa, visibles solo para Administrador.
- Ventas ve solo sus métricas; Marketing ve las de captación (origen de los leads); Capturador no ve métricas financieras.
- Filtros guardados por usuario en Firestore (`users/{uid}/savedFilters`), aplicables desde `FiltersModal`.

**Listo cuando:** cada rol ve únicamente su panel, y un filtro guardado se recupera al volver a entrar.

**Fin de la fase C.** Hito: el MVP completo para un piloto.

---

## BLOQUE 5. Cierre

### Paso 5.1. Recorrido de aceptación local
Con el emulador vacío y sin intervención manual en la base de datos, repetir para **dos verticales distintas**:
1. Aplicar la plantilla, ajustar un campo y una etapa.
2. Entrar con cada rol y comprobar lo que ve y lo que no.
3. Capturar leads (formulario, tarjeta, importación), asignarlos y moverlos por el embudo hasta un cierre con motivo.
4. Consumir créditos de IA hasta agotarlos.
5. Revisar la bitácora de auditoría completa.
6. Probar el modo soporte (conceder, usar, revocar).

**Listo cuando:** los 6 puntos pasan en ambas verticales y `npm test` y `npm run lint` están en verde.

### Paso 5.2. Revisión de seguridad
- Revisar que ninguna regla deje escritura abierta y que no queden claves ni contraseñas en el repositorio.
- Lista de lo pendiente para el despliegue: publicar las reglas, pasar los roles a `custom claims`, mover el conteo de créditos al servidor, revisar el CORS del Worker, sustituir `npm run alerts` por una tarea programada, y migrar los datos reales.

---

## Lo que queda fuera de este plan
- Despliegue (Hosting, reglas e índices en el proyecto real) y cualquier cambio en el Worker de IA.
- Bot de WhatsApp y base de conocimiento (fase D).
- Multi-tenant en un solo despliegue.
- Marca blanca con dominio propio.
- Facturación y planes.

## Resumen del orden

| Bloque | Pasos | Resultado |
|---|---|---|
| 0. Base | 0.1 a 0.4 | Entorno local, datos de prueba y pruebas automáticas |
| 1. Fase A | 1.1 a 1.8 | Identidad real, roles, asignación, auditoría y soporte |
| 2. Preparación | 2.1 a 2.2 | `App.tsx` ordenado y `strict` activo |
| 3. Fase B | 3.1 a 3.7 | Embudos, campos y marca configurables, con plantillas |
| 4. Fase C | 4.1 a 4.5 | Créditos, Round Robin, alertas y reportes por rol |
| 5. Cierre | 5.1 a 5.2 | Aceptación en dos verticales y revisión de seguridad |
