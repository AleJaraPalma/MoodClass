-- v4: Sistema de Eventos en MoodClass
-- Aplicado directamente via MCP el 2026-06-15

ALTER TABLE secciones ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'regular';
ALTER TABLE secciones ADD COLUMN IF NOT EXISTS nombre_evento TEXT;
ALTER TABLE secciones ADD COLUMN IF NOT EXISTS tipo_evento VARCHAR(30);
ALTER TABLE secciones ADD COLUMN IF NOT EXISTS descripcion_evento TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'secciones_check_tipo' AND conrelid = 'secciones'::regclass
  ) THEN
    ALTER TABLE secciones ADD CONSTRAINT secciones_check_tipo CHECK (tipo IN ('regular', 'evento'));
  END IF;
END $$;

-- Allow NULL estudiante_id for anonymous event participants
ALTER TABLE mood_checkins ALTER COLUMN estudiante_id DROP NOT NULL;

-- RPC for anonymous event check-ins (SECURITY DEFINER bypasses RLS safely)
CREATE OR REPLACE FUNCTION insertar_checkin_evento(
  p_mood_id       UUID,
  p_nombre        TEXT,
  p_energia       INT,
  p_foco          INT,
  p_animo         INT,
  p_claridad      INT,
  p_confianza     INT,
  p_motivacion    INT,
  p_memoria       INT,
  p_comentario    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seccion_tipo  VARCHAR;
  v_checkin_id    UUID;
  v_campo         TEXT;
BEGIN
  SELECT sec.tipo INTO v_seccion_tipo
  FROM moods m
  JOIN sesiones ses ON ses.id = m.sesion_id
  JOIN secciones sec ON sec.id = ses.seccion_id
  WHERE m.id = p_mood_id;

  IF v_seccion_tipo IS DISTINCT FROM 'evento' THEN
    RAISE EXCEPTION 'Esta función solo está disponible para secciones de tipo evento';
  END IF;

  v_campo := '[EVENTO] ' || p_nombre;
  IF p_comentario IS NOT NULL AND trim(p_comentario) != '' THEN
    v_campo := v_campo || ': ' || trim(p_comentario);
  END IF;

  INSERT INTO mood_checkins (
    mood_id, estudiante_id,
    energia, foco, animo, claridad, confianza, motivacion, memoria,
    campo_abierto
  ) VALUES (
    p_mood_id, NULL,
    p_energia, p_foco, p_animo, p_claridad, p_confianza, p_motivacion, p_memoria,
    v_campo
  )
  RETURNING id INTO v_checkin_id;

  RETURN v_checkin_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insertar_checkin_evento TO anon;
GRANT EXECUTE ON FUNCTION insertar_checkin_evento TO authenticated;

CREATE POLICY "anon_read_moods_eventos" ON moods FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM sesiones ses
    JOIN secciones sec ON sec.id = ses.seccion_id
    WHERE ses.id = moods.sesion_id AND sec.tipo = 'evento'
  )
);

CREATE POLICY "anon_read_sesiones_eventos" ON sesiones FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM secciones sec
    WHERE sec.id = sesiones.seccion_id AND sec.tipo = 'evento'
  )
);

CREATE POLICY "anon_read_secciones_eventos" ON secciones FOR SELECT TO anon
USING (tipo = 'evento');
