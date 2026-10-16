# MVP: de esta app a un producto mínimo vendible a un piloto

Este documento baja la idea grande ([01-idea-grande.md](01-idea-grande.md)) a lo que hay que construir primero partiendo del código actual. Es una evaluación de trabajo, no un compromiso de fechas.

## Punto de partida

La app actual es una herramienta de captura y seguimiento de leads para eventos, de un solo cliente. Ya resuelve:

- Captura por voz, foto de tarjeta (`scan-card`) e importación Excel/CSV con deduplicación.
- Enriquecimiento con fuentes citadas (`enrich-lead`, `research-company`), con caché y rechazo de datos simulados.
- Kanban, historial de interacciones, alertas de seguimiento, reportes con exportación y modo offline.
- Worker de IA que valida el token de Firebase y no expone la clave de Gemini.

## Qué falta (los bloques del MVP)

| Bloque | Estado hoy | Qué hay que hacer |
|---|---|---|
| Permisos y seguridad | Las reglas de Firestore solo exigen un correo `gmail.com` o `cun.edu.co`; cualquier usuario autenticado lo lee todo. Solo existen los roles `admin` y `executive`, y solo cambian la interfaz. Los usuarios guardan `password` y `pin` en Firestore. | Roles reales (Administrador, Marketing, Capturador, Ventas), reglas de Firestore por rol, `assignedTo` en el lead ("Ventas solo ve lo suyo"), retirar `password` y `pin`. |
| Auditoría | No existe. | Bitácora de acciones relevantes; modo soporte con consentimiento y vigencia limitada. |
| Configuración sin código | Las etapas son el tipo fijo `LeadStatus` (6 valores) y los campos son columnas de `Lead`. | `pipelines`, `stages`, motivos de cierre y `customFields` como datos; campos obligatorios por etapa; 2 plantillas por vertical. |
| Créditos de IA | No hay conteo de uso. | Contar consultas por empresa y descontar créditos de enriquecimiento y lectura de tarjetas. |
| Asignación de leads | `capturedBy` es solo quién lo registró. | Reglas de asignación (Round Robin primero). |
| Bot de WhatsApp | No existe. | Base de conocimiento, respuestas citadas, traspaso a humano, medición. |

## Orden de construcción

| Fase | Contenido | Por qué en este orden |
|---|---|---|
| A | Permisos, asignación y auditoría | Sin esto no se puede dar acceso a una empresa real, y es lo más caro de cambiar después. |
| B | Embudos, etapas y campos configurables, con 2 plantillas | Es la promesa central: "se configura en un día". |
| C | Créditos de enriquecimiento y lectura de tarjetas, más asignación Round Robin | Reutiliza lo que ya funciona. |
| D | Bot de WhatsApp | Es lo más caro y depende de la aprobación de Meta; se prueba solo después de validar A, B y C, con un solo cliente. |

A + B + C ya es un producto vendible a un piloto.

## Decisiones tomadas para el MVP

- **No multi-tenant todavía.** Para 2 o 3 pilotos, un proyecto de Firebase por empresa aísla los datos sin construir el multi-tenant. Se revisa con los datos de los pilotos.
- **Se mantiene Firebase** (Firestore + Auth, con `custom claims` para los roles).
- **El bot no es lo primero.** Es la parte más arriesgada y la más difícil de medir.

## Riesgos técnicos de partir de esta base

1. El proyecto no compila con `strict` y gran parte del estado está en `App.tsx`; conviene extraerlo antes de la fase B.
2. No hay pruebas automáticas; con permisos y configuración dinámica un error silencioso es más grave. Mínimo: pruebas de las reglas de Firestore y de las utilidades de dominio.
3. Textos, marca y tema están atados a Divergency; la marca por cliente (logo y colores) requiere sacar esos valores a configuración.

## Pendiente de definir antes de los pilotos

- Criterios numéricos de éxito y de abandono (por ejemplo, un mínimo de conversaciones que el bot resuelve sin humano).
- Estimación del costo por cliente (WhatsApp, tokens, enriquecimiento) para saber si el precio deja margen.
- Protección de datos personales (Ley 1581 de 2012 si se vende en Colombia), exportación y portabilidad, migración inicial de contactos y respaldo.
- Qué significa medible "configurar en un día".
