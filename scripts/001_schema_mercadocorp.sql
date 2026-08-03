-- ============================================================================
-- Mind CRM MercadoCorp — Migración 001: esquema inicial completo
-- ============================================================================
-- Base de datos objetivo: mind_crm_mercadocorp (vacía, aislada del CRM de
-- Bullpadel aunque viva en el mismo VPS).
--
-- Contenido:
--   1. Tablas core del CRM (reutilizadas tal cual del esquema de Bullpadel:
--      son genéricas, sin nada específico de pádel/e-commerce)
--   2. Módulo de email marketing (reutilizado)
--   3. Pipeline de Negocios (nuevo — sección 1 y 2 del brief MercadoCorp)
--   4. Campañas de publicidad (nuevo — sección 5)
--   5. Proyectos y tareas (nuevo — sección 6)
--
-- Explícitamente NO incluidas (específicas de e-commerce/lealtad de pádel,
-- no aplican a un negocio B2B de servicios): compras_crm, programa_clientes.
--
-- Tampoco se incluye la tabla `notification` presente en el dump de
-- Bullpadel: sus IDs varchar(20) y su columna fk_user_id (también varchar)
-- no coinciden con el patrón id SERIAL del resto del CRM — es una tabla
-- interna del contenedor NocoDB que comparte esa base de datos física, no
-- del CRM. Ninguna ruta de la app la consulta (las notificaciones en
-- /api/notificaciones se calculan al vuelo desde contactos + activity_log).
--
-- Ejecutar una sola vez contra una base de datos vacía:
--   psql -h 72.62.86.135 -U <usuario> -d mind_crm_mercadocorp -f scripts/001_schema_mercadocorp.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLAS CORE (reutilizadas — genéricas para cualquier cliente de servicios)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usuarios_crm (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('ventas', 'comercial', 'admin')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_acceso TIMESTAMPTZ,
  puede_eliminar BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.contactos (
  id SERIAL PRIMARY KEY,
  canal_user_id VARCHAR(255) NOT NULL,
  canal VARCHAR(50) NOT NULL,
  nombre VARCHAR(255),
  telefono VARCHAR(30),
  email VARCHAR(255),
  estado_lead VARCHAR(50) NOT NULL DEFAULT 'inicial',
  fecha_primer_contacto TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_ultima_interaccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_cambio_estado TIMESTAMPTZ,
  notas_internas TEXT,
  vendedor_asignado_id INTEGER REFERENCES public.usuarios_crm(id),
  lead_score VARCHAR(20) DEFAULT 'frio',
  agente_pausado BOOLEAN DEFAULT FALSE,
  pausa_hasta TIMESTAMPTZ,
  whatsapp_number VARCHAR(50),
  instagram_id VARCHAR(100),
  facebook_id VARCHAR(100),
  lead_score_manual BOOLEAN DEFAULT FALSE,
  lead_score_override BOOLEAN DEFAULT FALSE,
  telefono_solicitado BOOLEAN DEFAULT FALSE,
  origen VARCHAR(20) DEFAULT 'automatico',
  UNIQUE (canal_user_id, canal)
);
CREATE INDEX IF NOT EXISTS idx_contactos_estado ON public.contactos (estado_lead);
CREATE INDEX IF NOT EXISTS idx_contactos_vendedor ON public.contactos (vendedor_asignado_id);

CREATE TABLE IF NOT EXISTS public.etiquetas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#1B2B8C',
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contacto_etiquetas (
  contacto_id INTEGER NOT NULL REFERENCES public.contactos(id) ON DELETE CASCADE,
  etiqueta_id INTEGER NOT NULL REFERENCES public.etiquetas(id) ON DELETE CASCADE,
  PRIMARY KEY (contacto_id, etiqueta_id)
);

CREATE TABLE IF NOT EXISTS public.historial_conversaciones (
  id BIGSERIAL PRIMARY KEY,
  id_contacto INTEGER NOT NULL REFERENCES public.contactos(id) ON DELETE CASCADE,
  canal VARCHAR(50) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('user', 'assistant', 'system', 'vendedor')),
  contenido TEXT NOT NULL,
  tokens_usados INTEGER,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  imagen_url TEXT
);
CREATE INDEX IF NOT EXISTS idx_historial_contacto ON public.historial_conversaciones (id_contacto, "timestamp");

CREATE TABLE IF NOT EXISTS public.notas_crm (
  id SERIAL PRIMARY KEY,
  contacto_id INTEGER REFERENCES public.contactos(id),
  contenido TEXT NOT NULL,
  revisada BOOLEAN DEFAULT FALSE,
  usuario_id INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notas_crm_contacto_id ON public.notas_crm (contacto_id);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES public.usuarios_crm(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_sub_usuario_endpoint
  ON public.push_subscriptions (usuario_id, ((subscription ->> 'endpoint')));

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id SERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  intentos INTEGER DEFAULT 1,
  primer_intento TIMESTAMPTZ DEFAULT NOW(),
  bloqueado_hasta TIMESTAMPTZ,
  ultimo_intento TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts (ip);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES public.usuarios_crm(id),
  contacto_id INTEGER REFERENCES public.contactos(id),
  accion VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_contacto ON public.activity_log (contacto_id, "timestamp" DESC);

CREATE TABLE IF NOT EXISTS public.upload_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  usuario_id INTEGER REFERENCES public.usuarios_crm(id),
  usado BOOLEAN DEFAULT FALSE,
  expira_en TIMESTAMPTZ NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upload_tokens_token ON public.upload_tokens (token);

-- Identidad de un mismo lead a través de varios canales (ej. WhatsApp +
-- Instagram son la misma persona). Genérico, no específico de Bullpadel.
CREATE TABLE IF NOT EXISTS public.leads_vinculados (
  id SERIAL PRIMARY KEY,
  contacto_principal_id INTEGER REFERENCES public.contactos(id) ON DELETE CASCADE,
  contacto_vinculado_id INTEGER REFERENCES public.contactos(id) ON DELETE CASCADE,
  vinculado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_vinculacion TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contacto_principal_id, contacto_vinculado_id)
);

-- Almacén clave-valor genérico para credenciales de integraciones externas
-- (hoy: Brevo para email marketing). Reutilizado tal cual: cualquier cliente
-- de esta plantilla puede seguir guardando aquí sus propias claves.
CREATE TABLE IF NOT EXISTS public.configuracion_integraciones (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  actualizado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. EMAIL MARKETING (reutilizado — esquema sin cambios; la lógica de
--    segmentación de destinatarios se movió de `programa_clientes` a
--    `contactos`, ver lib/emailSegments.ts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plantillas_email (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  asunto VARCHAR(255),
  contenido_html TEXT NOT NULL,
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.segmentos_email (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  filtros JSONB NOT NULL,
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campanas_email (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  asunto VARCHAR(255) NOT NULL,
  contenido_html TEXT NOT NULL,
  segmento_id INTEGER REFERENCES public.segmentos_email(id),
  destinatarios_manual_ids INTEGER[],
  destinatarios_count INTEGER DEFAULT 0,
  enviados_count INTEGER DEFAULT 0,
  fallidos_count INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'borrador',
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_envio TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_campanas_email_segmento_id ON public.campanas_email (segmento_id);

-- ============================================================================
-- 3. PIPELINE DE NEGOCIOS (nuevo)
-- ============================================================================
--
-- IMPORTANTE — reusabilidad como plantilla: las etapas de pipeline_estados
-- son 100% de datos, no de código. La columna `orden` ya permite reordenar,
-- y `es_estado_ganado` / `es_estado_perdido` ya permiten identificar los
-- estados terminales sin depender del texto de `nombre`.
--
-- El seed de abajo (6 etapas) es el default de MercadoCorp, pensado como
-- ejemplo/punto de partida. Para reutilizar esta plantilla con otro cliente
-- de servicios basta con truncar/editar esta tabla — INSERT, UPDATE, DELETE
-- o reordenar filas — sin tocar una sola línea de código de la aplicación.
--
-- Regla para todo el código de este repo: nunca filtrar/comparar por
-- pipeline_estados.nombre (ej. `WHERE nombre = 'Cliente ganado'`). Siempre
-- usar los booleanos es_estado_ganado / es_estado_perdido.
CREATE TABLE IF NOT EXISTS public.pipeline_estados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  orden INTEGER NOT NULL,
  probabilidad_cierre INTEGER NOT NULL CHECK (probabilidad_cierre BETWEEN 0 AND 100),
  es_estado_ganado BOOLEAN DEFAULT FALSE,
  es_estado_perdido BOOLEAN DEFAULT FALSE,
  color VARCHAR(7) DEFAULT '#1B2B8C'
);
COMMENT ON TABLE public.pipeline_estados IS
  'Etapas del pipeline de ventas. Personalizable por cliente vía datos (INSERT/UPDATE/DELETE), no requiere cambios de código. El orden de las columnas en el Kanban usa `orden`; los estados terminales se identifican con es_estado_ganado/es_estado_perdido, nunca por nombre.';

-- Seed de ejemplo/default — específico de cómo opera MercadoCorp hoy.
INSERT INTO public.pipeline_estados (nombre, orden, probabilidad_cierre, es_estado_ganado, es_estado_perdido) VALUES
  ('Visita de Diagnóstico', 1, 20, FALSE, FALSE),
  ('Propuesta Comercial', 2, 30, FALSE, FALSE),
  ('Cierre de Contrato', 3, 50, FALSE, FALSE),
  ('Arranque del Servicio', 4, 90, FALSE, FALSE),
  ('Cliente ganado', 5, 100, TRUE, FALSE),
  ('Cliente perdido', 6, 0, FALSE, TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.negocios (
  id SERIAL PRIMARY KEY,
  contacto_id INTEGER REFERENCES public.contactos(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  monto DECIMAL(12,2) NOT NULL DEFAULT 0,
  pipeline_estado_id INTEGER NOT NULL REFERENCES public.pipeline_estados(id),
  descripcion_servicio TEXT,
  fecha_cierre_estimada DATE,
  vendedor_asignado_id INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_negocios_contacto ON public.negocios (contacto_id);
CREATE INDEX IF NOT EXISTS idx_negocios_pipeline_estado ON public.negocios (pipeline_estado_id);
CREATE INDEX IF NOT EXISTS idx_negocios_vendedor ON public.negocios (vendedor_asignado_id);

-- ============================================================================
-- 4. CAMPAÑAS DE PUBLICIDAD (nuevo — registro manual, sin integración OAuth
--    en vivo con Google/Meta Ads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campanas_publicidad (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  plataforma VARCHAR(20) NOT NULL CHECK (plataforma IN ('google', 'meta')),
  cliente_id INTEGER REFERENCES public.contactos(id),
  objetivo VARCHAR(100),
  presupuesto DECIMAL(12,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'finalizada')),
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campanas_publicidad_cliente ON public.campanas_publicidad (cliente_id);

CREATE TABLE IF NOT EXISTS public.campanas_metricas (
  id SERIAL PRIMARY KEY,
  campana_id INTEGER REFERENCES public.campanas_publicidad(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  impresiones INTEGER DEFAULT 0,
  clics INTEGER DEFAULT 0,
  conversiones INTEGER DEFAULT 0,
  gasto DECIMAL(12,2) DEFAULT 0,
  registrado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_registro TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campanas_metricas_campana ON public.campanas_metricas (campana_id, fecha);

-- ============================================================================
-- 5. PROYECTOS Y TAREAS (nuevo)
-- ============================================================================
--
-- Igual que pipeline_estados: tareas_estados es personalizable por cliente
-- vía datos, sin lógica de código acoplada al `nombre` de cada estado. El
-- orden de columnas del Kanban de tareas usa `orden`.
CREATE TABLE IF NOT EXISTS public.proyectos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  negocio_id INTEGER REFERENCES public.negocios(id),
  cliente_id INTEGER REFERENCES public.contactos(id),
  descripcion TEXT,
  fecha_inicio DATE,
  fecha_fin_estimada DATE,
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'completado', 'cancelado')),
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proyectos_cliente ON public.proyectos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_negocio ON public.proyectos (negocio_id);

CREATE TABLE IF NOT EXISTS public.tareas_estados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  orden INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#1B2B8C'
);
COMMENT ON TABLE public.tareas_estados IS
  'Estados del Kanban de tareas de un proyecto. Personalizable por cliente vía datos, igual que pipeline_estados.';

INSERT INTO public.tareas_estados (nombre, orden) VALUES
  ('Por hacer', 1), ('En progreso', 2), ('En revisión', 3), ('Completado', 4)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tareas (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER REFERENCES public.proyectos(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tarea_estado_id INTEGER NOT NULL REFERENCES public.tareas_estados(id),
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  asignado_a INTEGER REFERENCES public.usuarios_crm(id),
  fecha_limite DATE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tareas_proyecto ON public.tareas (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON public.tareas (tarea_estado_id);
CREATE INDEX IF NOT EXISTS idx_tareas_asignado ON public.tareas (asignado_a);

-- ============================================================================
-- 6. Trigger de auto-scoring de leads (reutilizado, CORREGIDO)
-- ============================================================================
--
-- El dump original de Bullpadel definía este trigger comparando estado_lead
-- contra valores ('cliente_activo', 'interesado_compra') que ya no existen
-- en el enum de EstadoLead usado por la app actual (lib/types.ts:
-- inicial/nuevo/contactado/interesado/en_atencion_humana/en_negociacion/
-- cliente/perdido) — quedó desactualizado en algún momento de la vida de
-- Bullpadel y el trigger nunca disparaba sus ramas "caliente"/"tibio". Se
-- corrige aquí para que el auto-scoring funcione de verdad sobre el enum
-- real. lead_score_manual=true (override manual desde el CRM) sigue
-- respetándose igual que antes.
CREATE FUNCTION public.calcular_lead_score() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.lead_score_manual IS TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.estado_lead = 'cliente' THEN
    NEW.lead_score := 'cliente';
  ELSIF NEW.estado_lead = 'en_negociacion' AND NEW.fecha_ultima_interaccion > NOW() - INTERVAL '2 hours' THEN
    NEW.lead_score := 'caliente';
  ELSIF NEW.estado_lead IN ('interesado', 'en_atencion_humana', 'en_negociacion') AND NEW.fecha_ultima_interaccion > NOW() - INTERVAL '24 hours' THEN
    NEW.lead_score := 'tibio';
  ELSE
    NEW.lead_score := 'frio';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_lead_score
  BEFORE INSERT OR UPDATE ON public.contactos
  FOR EACH ROW EXECUTE FUNCTION public.calcular_lead_score();

COMMIT;
