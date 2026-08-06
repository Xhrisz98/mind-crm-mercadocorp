-- ============================================================================
-- Mind CRM MercadoCorp — Migración 004: Proyectos (Gestor tipo Jira) + Portal
-- de Cliente
-- ============================================================================
-- proyectos, tareas_estados y tareas ya existían en 001_schema_mercadocorp.sql
-- (vacías, 0 filas al momento de esta migración) como scaffolding sin usar —
-- por eso esto es ALTER, no CREATE, para esas tres tablas.
--
-- DECISIÓN DE PRODUCTO (no solo técnica, ver CLAUDE.md): el rol 'ventas' NO
-- tiene filtro de portafolio en /api/proyectos — ve y edita todos los
-- proyectos del equipo, igual que comercial/admin. La autorización fina vive
-- a nivel de tarea individual vía tareas.asignado_a, no a nivel de portafolio
-- de proyectos. Motivo: un proyecto es trabajo de entrega ejecutado por varias
-- personas, no solo por quien cerró el negocio original, y proyectos/tareas no
-- exponen montos (lo sensible sigue protegido en negocios). Si un futuro
-- comprador de esta plantilla necesita aislamiento estricto por vendedor en
-- Proyectos, la migración natural es unir proyectos.cliente_id ->
-- contactos.vendedor_asignado_id (con fallback a proyectos.negocio_id ->
-- negocios.vendedor_asignado_id) y replicar el filtro que ya usa
-- app/api/negocios/route.ts para rol='ventas'. Este es un ajuste conocido y
-- esperado, no una limitación descubierta tarde.
--
-- Ejecutar una sola vez:
--   psql -h 72.62.86.135 -U <usuario> -d mind_crm_mercadocorp -f scripts/004_proyectos_portal_cliente.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Acceso de cliente: extender usuarios_crm
-- ============================================================================
ALTER TABLE public.usuarios_crm DROP CONSTRAINT usuarios_crm_rol_check;
ALTER TABLE public.usuarios_crm ADD CONSTRAINT usuarios_crm_rol_check
  CHECK (rol IN ('ventas', 'comercial', 'admin', 'cliente'));

-- Solo tiene valor para rol='cliente' (qué contacto/cliente representa ese
-- login); para roles internos permanece NULL. No hay tabla `empresas`: un
-- contacto_id representa directamente "el cliente" para efectos de portal.
-- Si un cliente necesita varios logins, se crean varios usuarios_crm con
-- rol='cliente' apuntando al mismo contacto_id.
ALTER TABLE public.usuarios_crm ADD COLUMN IF NOT EXISTS contacto_id INTEGER REFERENCES public.contactos(id);
CREATE INDEX IF NOT EXISTS idx_usuarios_crm_contacto ON public.usuarios_crm (contacto_id);

-- ============================================================================
-- 2. Proyectos: agregar control de visibilidad de portal
-- ============================================================================
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS visibilidad_cliente VARCHAR(20)
  NOT NULL DEFAULT 'ninguna' CHECK (visibilidad_cliente IN ('ninguna', 'resumen', 'completo'));

-- ============================================================================
-- 3. Estados de tarea: estado terminal explícito (nunca comparar por nombre)
-- ============================================================================
-- Mismo patrón que pipeline_estados.es_estado_ganado/es_estado_perdido: el
-- % de avance y "próxima fecha límite" de un proyecto necesitan saber qué
-- estado es terminal sin depender de que el usuario no renombre 'Completado'
-- (tareas_estados es personalizable vía datos, igual que pipeline_estados).
ALTER TABLE public.tareas_estados ADD COLUMN IF NOT EXISTS es_estado_final BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.tareas_estados SET es_estado_final = TRUE WHERE nombre = 'Completado' AND orden = 4;

-- ============================================================================
-- 4. Tareas: visibilidad individual en el portal de cliente
-- ============================================================================
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS visible_cliente BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================================
-- 5. Adjuntos de tarea (imágenes subidas vía el mismo flujo n8n del chat)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tareas_adjuntos (
  id SERIAL PRIMARY KEY,
  tarea_id INTEGER REFERENCES public.tareas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  nombre_archivo VARCHAR(255),
  tipo_mime VARCHAR(100),
  subido_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tareas_adjuntos_tarea ON public.tareas_adjuntos (tarea_id);

COMMIT;
