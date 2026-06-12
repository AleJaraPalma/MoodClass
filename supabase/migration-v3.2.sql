-- ============================================================
-- Migration v3.2 — Reporte IA inmutable por mood
-- ============================================================

ALTER TABLE public.moods
  ADD COLUMN IF NOT EXISTS reporte_ia TEXT,
  ADD COLUMN IF NOT EXISTS reporte_ia_generado_at TIMESTAMPTZ;
