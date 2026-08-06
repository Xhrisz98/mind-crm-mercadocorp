-- ============================================================================
-- Mind CRM MercadoCorp — Migración 003: métricas extensibles de campañas
-- ============================================================================
-- Reemplaza el modelo de columnas fijas de campanas_metricas
-- (impresiones/clics/conversiones/gasto) por un catálogo abierto de métricas
-- (metricas_definiciones), valores EAV por campaña/fecha
-- (campanas_metricas_valores) y fórmulas configurables por el usuario
-- (formulas_personalizadas). Ver Bloque 5 extendido.
--
-- ROI estimado sigue siendo un caso especial calculado server-side (depende
-- de negocios ganados por rango de fechas + cliente vinculado, no de valores
-- del catálogo de métricas) — no se modela como fórmula aquí.
--
-- Solo había datos de prueba en campanas_metricas, no datos reales de
-- producción. Se migran de todas formas para no perder lo ya registrado
-- manualmente durante el desarrollo de Bloque 5.
--
-- Ejecutar una sola vez:
--   psql -h 72.62.86.135 -U <usuario> -d mind_crm_mercadocorp -f scripts/003_metricas_extensibles.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Catálogo de métricas
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.metricas_definiciones (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  unidad VARCHAR(20) NOT NULL DEFAULT 'numero' CHECK (unidad IN ('numero', 'usd', 'porcentaje')),
  categoria VARCHAR(30),
  es_default BOOLEAN NOT NULL DEFAULT FALSE,
  -- No hay borrado de métricas default ni de métricas con valores registrados
  -- (ver app/api/metricas-definiciones/[id]/route.ts) — activo permite
  -- ocultarlas del formulario de registro sin perder el histórico.
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.metricas_definiciones (clave, nombre, unidad, categoria, es_default) VALUES
  ('impresiones', 'Impresiones', 'numero', 'alcance', TRUE),
  ('clics', 'Clics', 'numero', 'engagement', TRUE),
  ('conversiones', 'Conversiones', 'numero', 'conversion', TRUE),
  ('gasto', 'Gasto', 'usd', 'gasto', TRUE),
  ('vistas', 'Vistas', 'numero', 'alcance', TRUE),
  ('alcance', 'Alcance', 'numero', 'alcance', TRUE),
  ('cuentas_alcanzadas', 'Cuentas alcanzadas', 'numero', 'alcance', TRUE),
  ('seguidores_nuevos', 'Seguidores nuevos', 'numero', 'engagement', TRUE),
  ('compras', 'Compras', 'numero', 'conversion', TRUE),
  ('cpr', 'CPR (costo por resultado)', 'usd', 'gasto', TRUE)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- 2. Valores por campaña y fecha (EAV — reemplaza campanas_metricas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campanas_metricas_valores (
  id SERIAL PRIMARY KEY,
  campana_id INTEGER REFERENCES public.campanas_publicidad(id) ON DELETE CASCADE,
  metrica_definicion_id INTEGER REFERENCES public.metricas_definiciones(id),
  fecha DATE NOT NULL,
  valor DECIMAL(14,2) NOT NULL DEFAULT 0,
  registrado_por INTEGER REFERENCES public.usuarios_crm(id),
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campana_id, metrica_definicion_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_campanas_metricas_valores_campana ON public.campanas_metricas_valores (campana_id, fecha);
CREATE INDEX IF NOT EXISTS idx_campanas_metricas_valores_metrica ON public.campanas_metricas_valores (metrica_definicion_id);

-- ============================================================================
-- 3. Fórmulas personalizadas ("conversiones especializadas")
-- ============================================================================
-- clave: solo la llevan las fórmulas default (para que el código pueda
-- referenciarlas de forma estable, ej. OBJETIVO_KPI_DESTACADO en lib/utils.ts)
-- — las fórmulas creadas por el usuario la dejan NULL (UNIQUE permite NULLs
-- repetidos en Postgres).
-- unidad: determina cómo la UI formatea el resultado (ratio 0-1 * 100 si es
-- 'porcentaje', formatCurrency si es 'usd') — ver lib/utils.ts formatValorFormula.
-- archivada: igual que activo en metricas_definiciones, para poder retirar una
-- fórmula personalizada del dashboard sin borrar su definición.
CREATE TABLE IF NOT EXISTS public.formulas_personalizadas (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  unidad VARCHAR(20) NOT NULL DEFAULT 'numero' CHECK (unidad IN ('numero', 'usd', 'porcentaje')),
  definicion JSONB NOT NULL,
  -- formato según operacion (catálogo extensible, ver lib/formulas.ts):
  --   ratio:          {"operacion":"ratio","numerador":[metrica_id,...],"denominador":[metrica_id,...]}
  --   suma:           {"operacion":"suma","metricas":[metrica_id,...]}
  --   resta:          {"operacion":"resta","metricas":[metrica_id,...]}  (metricas[0] - resto)
  --   multiplicacion: {"operacion":"multiplicacion","metricas":[metrica_id,...]}
  es_default BOOLEAN NOT NULL DEFAULT FALSE,
  archivada BOOLEAN NOT NULL DEFAULT FALSE,
  creado_por INTEGER REFERENCES public.usuarios_crm(id),
  es_compartida BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.formulas_personalizadas (clave, nombre, descripcion, unidad, definicion, es_default, es_compartida)
SELECT 'ctr', 'CTR (Click-Through Rate)', 'Porcentaje de impresiones que resultaron en un clic.', 'porcentaje',
  jsonb_build_object('operacion', 'ratio', 'numerador', jsonb_build_array(mc.id), 'denominador', jsonb_build_array(mi.id)),
  TRUE, TRUE
FROM (SELECT id FROM public.metricas_definiciones WHERE clave = 'clics') mc,
     (SELECT id FROM public.metricas_definiciones WHERE clave = 'impresiones') mi
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.formulas_personalizadas (clave, nombre, descripcion, unidad, definicion, es_default, es_compartida)
SELECT 'cpc', 'CPC (costo por clic)', 'Gasto dividido entre clics.', 'usd',
  jsonb_build_object('operacion', 'ratio', 'numerador', jsonb_build_array(mg.id), 'denominador', jsonb_build_array(mc.id)),
  TRUE, TRUE
FROM (SELECT id FROM public.metricas_definiciones WHERE clave = 'gasto') mg,
     (SELECT id FROM public.metricas_definiciones WHERE clave = 'clics') mc
ON CONFLICT (clave) DO NOTHING;

INSERT INTO public.formulas_personalizadas (clave, nombre, descripcion, unidad, definicion, es_default, es_compartida)
SELECT 'costo_por_conversion', 'Costo por conversión', 'Gasto dividido entre conversiones.', 'usd',
  jsonb_build_object('operacion', 'ratio', 'numerador', jsonb_build_array(mg.id), 'denominador', jsonb_build_array(mco.id)),
  TRUE, TRUE
FROM (SELECT id FROM public.metricas_definiciones WHERE clave = 'gasto') mg,
     (SELECT id FROM public.metricas_definiciones WHERE clave = 'conversiones') mco
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- 4. Migración de datos existentes de campanas_metricas
-- ============================================================================
-- campanas_metricas no tenía UNIQUE(campana_id, fecha): podían existir varias
-- filas para la misma campaña/fecha y se sumaban al agregar. Se preserva ese
-- comportamiento sumando en el ON CONFLICT en vez de sobrescribir.
DO $$
DECLARE
  v_impresiones_id INTEGER := (SELECT id FROM public.metricas_definiciones WHERE clave = 'impresiones');
  v_clics_id INTEGER := (SELECT id FROM public.metricas_definiciones WHERE clave = 'clics');
  v_conversiones_id INTEGER := (SELECT id FROM public.metricas_definiciones WHERE clave = 'conversiones');
  v_gasto_id INTEGER := (SELECT id FROM public.metricas_definiciones WHERE clave = 'gasto');
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campanas_metricas') THEN
    INSERT INTO public.campanas_metricas_valores (campana_id, metrica_definicion_id, fecha, valor, registrado_por, fecha_registro)
    SELECT campana_id, v_impresiones_id, fecha, impresiones, registrado_por, fecha_registro FROM public.campanas_metricas
    ON CONFLICT (campana_id, metrica_definicion_id, fecha)
    DO UPDATE SET valor = public.campanas_metricas_valores.valor + EXCLUDED.valor;

    INSERT INTO public.campanas_metricas_valores (campana_id, metrica_definicion_id, fecha, valor, registrado_por, fecha_registro)
    SELECT campana_id, v_clics_id, fecha, clics, registrado_por, fecha_registro FROM public.campanas_metricas
    ON CONFLICT (campana_id, metrica_definicion_id, fecha)
    DO UPDATE SET valor = public.campanas_metricas_valores.valor + EXCLUDED.valor;

    INSERT INTO public.campanas_metricas_valores (campana_id, metrica_definicion_id, fecha, valor, registrado_por, fecha_registro)
    SELECT campana_id, v_conversiones_id, fecha, conversiones, registrado_por, fecha_registro FROM public.campanas_metricas
    ON CONFLICT (campana_id, metrica_definicion_id, fecha)
    DO UPDATE SET valor = public.campanas_metricas_valores.valor + EXCLUDED.valor;

    INSERT INTO public.campanas_metricas_valores (campana_id, metrica_definicion_id, fecha, valor, registrado_por, fecha_registro)
    SELECT campana_id, v_gasto_id, fecha, gasto, registrado_por, fecha_registro FROM public.campanas_metricas
    ON CONFLICT (campana_id, metrica_definicion_id, fecha)
    DO UPDATE SET valor = public.campanas_metricas_valores.valor + EXCLUDED.valor;
  END IF;
END $$;

DROP TABLE IF EXISTS public.campanas_metricas CASCADE;

COMMIT;
