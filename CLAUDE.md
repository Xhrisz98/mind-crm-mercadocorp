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

## Deployment
- Frontend: Vercel (mind-crm-msyu.vercel.app)
- Backend n8n: n8n.mercadocorp.ec
- VPS: 72.62.86.135 (Hostinger)


