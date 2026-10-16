# Divergency CRM: la idea grande (versión realista)

## 1. Resumen del producto

Divergency CRM arranca como un CRM de un solo cliente configurable, operado por una empresa a la vez. La primera versión no es multi-tenant. Antes de construir la arquitectura completa para muchos clientes, se valida el producto con dos o tres empresas reales. El objetivo es comprobar que la configuración resuelve un problema de ventas y que el bot de IA aporta valor medible.

## 2. Problema que resuelve

Los CRM genéricos obligan a cada empresa a adaptar su proceso al software. Una inmobiliaria necesita el "Tipo de propiedad", un centro médico necesita la "Especialidad" y una empresa B2B necesita embudos distintos para ventas, postventa y renovaciones. Cuando el sistema no coincide con el proceso real, el equipo deja de registrar información, pierde prospectos y no puede medir su rendimiento.

## 3. Propuesta de valor

- **Configuración del CRM sin programadores:** embudos, etapas, campos, etiquetas y motivos de cierre se definen desde el panel de la empresa.
- **Plantillas por vertical** (inmobiliaria, clínica, B2B), con campos, etapas y motivos de cierre ya cargados, para que el cliente no empiece con una pantalla en blanco.
- **Asistente de IA por WhatsApp** con la base de conocimiento de la empresa (manuales, catálogos y preguntas frecuentes), con tono configurable.
- **Lectura de tarjetas de presentación y enriquecimiento de contactos** con créditos incluidos en el plan.
- **Control de acceso por rol**, definido desde el inicio.

## 4. Modelo de permisos (primera prioridad de diseño)

El modelo de permisos se define antes que las funciones, porque cambiarlo después es lo más costoso. Roles de la primera versión:

- **Administrador:** configura el CRM, gestiona usuarios y roles, conecta canales, exporta datos y consulta la bitácora de auditoría.
- **Marketing:** gestiona campañas, plantillas y flujos de nutrición. Ve la fase de captación y las analíticas de adquisición, sin acceso a cierres ni facturación.
- **Capturador:** registra, valida y etiqueta contactos, e importa bases de datos. Sin acceso a métricas financieras ni a etapas de cierre.
- **Ventas:** trabaja solo sobre sus contactos y oportunidades asignados. Sin acceso a la configuración ni a prospectos no asignados.
- **Soporte de Divergency AI:** solo entra en modo soporte, con consentimiento explícito del cliente (ver punto 6).

## 5. Módulos de la primera versión

### 5.1. Estructura de datos y procesos

- Campos personalizados en contactos, empresas y oportunidades: texto, número, selección única o múltiple, fechas, archivos y casillas de verificación.
- Campos obligatorios por etapa, por ejemplo datos de facturación antes de "Cotizado".
- Múltiples embudos independientes, con etapas configurables y probabilidad de cierre por etapa.
- Catálogo de motivos de cierre y pérdida.
- Etiquetas de color.

### 5.2. Asistente de IA por WhatsApp

- Respuestas basadas en la base de conocimiento propia de la empresa.
- Tono configurable (formal, amigable o comercial).
- Reglas de asignación de leads: rotación (Round Robin), carga de trabajo o especialidad.
- Alertas: por ejemplo, notificar al supervisor si un lead supera dos horas sin atención.

### 5.3. Enriquecimiento y lectura de tarjetas

- Lectura de tarjetas de presentación con foto para crear el contacto.
- Enriquecimiento de contactos (empresa, cargo y datos públicos disponibles) a partir de correo o teléfono.
- Cada consulta consume créditos del plan.

### 5.4. Vistas y reportes

- Panel con métricas por rol: los vendedores ven sus números y el administrador ve ingresos proyectados.
- Filtros guardados por usuario.

## 6. Auditoría y soporte con consentimiento

Desde el primer día, cada acción relevante queda registrada en una bitácora de auditoría: quién cambió una etapa, quién exportó datos, quién editó un campo o un flujo de IA. Esta bitácora es parte del producto, no un extra, porque el cliente la necesitará para confiar en el sistema.

Para dar soporte, Divergency AI puede entrar en un modo de soporte, pero solo cuando el administrador del cliente lo autoriza. La autorización tiene vigencia limitada, queda registrada en la bitácora y el cliente puede revocarla en cualquier momento.

## 7. Modelo de negocio

Suscripción mensual con tres elementos:

- **Plan Básico:** un usuario administrador, hasta cinco usuarios operativos, embudos y campos personalizados, asistente de IA con una cantidad acotada de conversaciones, y créditos mensuales de enriquecimiento y lectura de tarjetas. La dosis de IA hace el plan atractivo desde el inicio.
- **Consumo por uso:** las conversaciones de WhatsApp y los tokens de IA se cobran según lo que cuestan. Cada plan incluye un volumen base y un límite. Al superarlo, se cobra el excedente o se pide una recarga.
- **Plan Profesional:** más usuarios, más conversaciones incluidas, reglas de asignación avanzadas y alertas.

Los límites exactos (usuarios, conversaciones, créditos, tokens) se definen con los datos de las primeras empresas piloto, no antes.

## 8. Medición del bot

El cliente debe poder ver qué respondió el asistente, con qué documento de su base de conocimiento lo hizo y qué porcentaje de aciertos tiene cada respuesta, según las correcciones y valoraciones que recibe. Además, puede corregir una respuesta y convertirla en una regla o en un nuevo fragmento de conocimiento. Esto convierte al bot en algo que el cliente controla, no en una caja negra.

## 9. Posventa como segundo embudo

La posventa y el soporte se modelan como un segundo embudo dentro del mismo CRM, con sus propias etapas, por ejemplo "Solicitud recibida", "En atención" y "Resuelto". No se construye un módulo de tickets independiente en esta versión. Esto mantiene el alcance acotado y reutiliza los mismos permisos, campos y reportes.

## 10. Plan de validación

1. Seleccionar dos o tres empresas piloto de verticales distintas.
2. Configurar el CRM para cada una con una plantilla por vertical y ajustes mínimos.
3. Medir durante al menos un mes: leads atendidos, tiempo de primera respuesta, prospectos que avanzan de etapa y conversaciones que resuelve el bot sin intervención.
4. Recoger las correcciones de los clientes sobre el bot y sobre el modelo de permisos.
5. Decidir, con esos datos, qué del multi-tenant conviene construir primero.

## 11. Propuesta de valor en una frase

> Divergency CRM es un CRM que tu equipo configura en un día, con un asistente de IA que puedes auditar y corregir.
