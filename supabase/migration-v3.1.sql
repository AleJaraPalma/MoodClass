-- ============================================================
-- MoodClass – Migration v3.1
-- Agrega columna preguntas (JSONB) a tabla moods
-- para almacenar preguntas generadas por Claude
-- ============================================================

ALTER TABLE public.moods
  ADD COLUMN IF NOT EXISTS preguntas JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS modalidad   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracion    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS complejidad TEXT DEFAULT NULL;

-- Comentario explicativo
COMMENT ON COLUMN public.moods.preguntas IS
  'JSONB con las 7 preguntas generadas por Claude para este mood. NULL = usa preguntas genéricas del sistema. Estructura: {energia, foco, animo, claridad, confianza, motivacion, memoria}';

SELECT 'Migration v3.1 ejecutada exitosamente' AS resultado;
