-- ============================================================================
-- Mind CRM MercadoCorp — Migración 002: objetivo de campanas_publicidad
-- ============================================================================
-- El campo `objetivo` pasa de texto libre a una de 3 categorías fijas, que la
-- UI usa para decidir qué KPI destacar en el detalle de cada campaña:
--   reconocimiento → CTR
--   trafico        → CPC
--   conversion     → costo por conversión + ROI estimado
--
-- Ejecutar una sola vez:
--   psql -h 72.62.86.135 -U <usuario> -d mind_crm_mercadocorp -f scripts/002_objetivo_campanas_publicidad.sql
-- ============================================================================

BEGIN;

ALTER TABLE public.campanas_publicidad
  ALTER COLUMN objetivo TYPE VARCHAR(20),
  ADD CONSTRAINT campanas_publicidad_objetivo_check
    CHECK (objetivo IS NULL OR objetivo IN ('reconocimiento', 'trafico', 'conversion'));

COMMENT ON COLUMN public.campanas_publicidad.objetivo IS
  'Objetivo de la campaña. Determina qué KPI se destaca en la UI: reconocimiento→CTR, trafico→CPC, conversion→costo por conversión y ROI estimado.';

COMMIT;
