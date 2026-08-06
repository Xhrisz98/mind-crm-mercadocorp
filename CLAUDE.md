# Mind CRM — Contexto del proyecto

## Stack
- Next.js 14 + TypeScript + Tailwind CSS
- PostgreSQL (driver pg, sin ORM)
- JWT + bcryptjs para autenticación
- SWR para polling en tiempo real
- Framer Motion para animaciones

## Base de datos
- Host: 72.62.86.135:5432
- DB: bullpadel_crm
- Tablas principales: contactos, historial_conversaciones, usuarios_crm, activity_log

## Tabla contactos campos clave
id, canal_user_id, canal, nombre, telefono, email, estado_lead,
agente_pausado, pausa_hasta, vendedor_asignado_id, lead_score,
notas_internas, whatsapp_number, instagram_id, facebook_id

## Roles
- ventas: solo sus leads
- comercial: todos los leads  
- admin: acceso total

## Canales
whatsapp, telegram, messenger, instagram, web

## Subida de imágenes (chat de leads)
El navegador sube el archivo DIRECTO al webhook público de n8n
(`NEXT_PUBLIC_N8N_UPLOAD_URL`, ver `.env.example`), sin pasar por una función
serverless de Vercel — esto evita el límite fijo de 4.5MB del body en Vercel.

Como el webhook queda expuesto públicamente, la autenticación se resuelve con
un **token de un solo uso**: el frontend primero llama a `POST /api/upload/token`
(requiere sesión JWT, rol admin/comercial) para obtener un token de la tabla
`public.upload_tokens`, válido 5 minutos, y lo manda junto al archivo
(`upload_token` en el FormData). El workflow de n8n (`MIND WF-3 Upload Imagen
CRM`) valida el token contra esa tabla (existe, `usado = FALSE`, no expirado) y
lo marca `usado = TRUE` antes de guardar el archivo. Sin token válido, n8n debe
rechazar la subida con 401/403.

`POST /api/upload` (el flujo antiguo, servidor a servidor con JWT) se mantiene
como fallback/deprecado pero ya no lo usa el frontend principal.

## Proyectos (Bloque 6) — Gestor de tareas + Portal de cliente

Extiende el sistema de roles existente, no es un sistema paralelo. `contacto_id`
representa directamente "el cliente" para efectos de portal — no hay tabla
`empresas`; si un cliente necesita varios logins, se crean varios
`usuarios_crm` con `rol='cliente'` apuntando al mismo `contacto_id`.

**Decisión de producto: rol='ventas' ve/edita TODOS los proyectos, sin filtro
por vendedor_asignado_id** (a diferencia de Negocios/Leads, donde ventas solo
ve lo suyo). La autorización fina vive a nivel de tarea individual vía
`tareas.asignado_a`, no a nivel de portafolio de proyectos.

Motivo: un proyecto es trabajo de entrega ejecutado por varias personas, no
solo por quien cerró el negocio original — filtrar por vendedor le ocultaría
el tablero a un compañero asignado a ejecutar tareas de un proyecto que otro
cerró. Además, `proyectos`/`tareas` no exponen montos (lo sensible sigue
protegido en `negocios`).

**Si un futuro comprador de esta plantilla necesita aislamiento estricto por
vendedor en Proyectos** (equipo de ventas grande, política distinta), la
migración conocida es: unir `proyectos.cliente_id -> contactos.vendedor_asignado_id`
(con fallback a `proyectos.negocio_id -> negocios.vendedor_asignado_id`) y
replicar el filtro `WHERE vendedor_asignado_id = $user` que ya usa
`app/api/negocios/route.ts` para `rol='ventas'`, aplicándolo a
`app/api/proyectos/route.ts` y `app/api/proyectos/[id]/route.ts`. Este es un
ajuste esperado, no una limitación descubierta tarde — ver también el
comentario en `scripts/004_proyectos_portal_cliente.sql`.

Adjuntos de tarea reutilizan el mismo flujo de subida a n8n del chat de leads
(`/api/upload/token` + subida directa al webhook) sin tocar ese endpoint. El
permiso para adjuntar imágenes a una tarea se valida en
`POST /api/tareas/[id]/adjuntos` (admin/comercial siempre, ventas solo si es
el `asignado_a` de esa tarea) — no en `/api/upload/token`, cuyo bloqueo a
`rol='ventas'` no tiene una razón documentada (sin commit ni comentario que
lo explique, y la UI de adjuntar en el chat de leads no lo refleja), así que
no se tocó ese endpoint compartido para evitar romper una regla que podría
ser intencional en otro contexto.

Endpoints de portal (`/api/portal/proyectos`, `/api/portal/proyectos/[id]`)
están separados de los endpoints internos (no el mismo con un `if`), validan
`contacto_id` server-side siempre, y devuelven 404 (no 403 ni array vacío) al
acceder a un proyecto de otro cliente — para no distinguir "no existe" de "no
es tuyo" ante un ID adivinado.

## Deployment
- Frontend: Vercel (mind-crm-msyu.vercel.app)
- Backend n8n: n8n.mercadocorp.ec
- VPS: 72.62.86.135 (Hostinger)


