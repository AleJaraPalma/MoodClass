-- ============================================================
-- MoodClass – Migration v3
-- Sistema de moods múltiples por clase
-- 
-- CÓMO EJECUTAR:
-- 1. Ve a: https://supabase.com/dashboard/project/vqumahlqouuafhoyuusu/sql/new
-- 2. Copia TODO el contenido de este archivo (Cmd+A, Cmd+C)
-- 3. Pégalo en el editor SQL de Supabase y presiona "Run"
-- ============================================================

-- ============================================================
-- 1. NUEVA TABLA: moods
-- Un "mood" es un momento de check-in emocional dentro de
-- una sesión. Una sesión puede tener múltiples moods:
-- entrada, adicionales durante la clase, y salida.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.moods (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sesion_id             UUID NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('entrada', 'adicional', 'salida')),
  estado                TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  tipo_actividad        TEXT,
  descripcion_actividad TEXT,
  orden                 INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_moods_sesion_id ON public.moods(sesion_id);
CREATE INDEX IF NOT EXISTS idx_moods_estado    ON public.moods(estado);

-- ============================================================
-- 2. NUEVA TABLA: mood_checkins
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mood_id       UUID NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  energia       INTEGER NOT NULL CHECK (energia BETWEEN 1 AND 5),
  foco          INTEGER NOT NULL CHECK (foco BETWEEN 1 AND 5),
  animo         INTEGER NOT NULL CHECK (animo BETWEEN 1 AND 5),
  claridad      INTEGER NOT NULL CHECK (claridad BETWEEN 1 AND 5),
  confianza     INTEGER NOT NULL CHECK (confianza BETWEEN 1 AND 5),
  motivacion    INTEGER NOT NULL CHECK (motivacion BETWEEN 1 AND 5),
  memoria       INTEGER NOT NULL CHECK (memoria BETWEEN 1 AND 5),
  campo_abierto TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mood_id, estudiante_id)
);

CREATE INDEX IF NOT EXISTS idx_mood_checkins_mood_id       ON public.mood_checkins(mood_id);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_estudiante_id ON public.mood_checkins(estudiante_id);

-- ============================================================
-- 3. NUEVA TABLA: asistencia
-- ============================================================

CREATE TABLE IF NOT EXISTS public.asistencia (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sesion_id     UUID NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  presente      BOOLEAN NOT NULL DEFAULT false,
  atraso        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sesion_id, estudiante_id)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_sesion_id     ON public.asistencia(sesion_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_estudiante_id ON public.asistencia(estudiante_id);

-- ============================================================
-- 4. NUEVA TABLA: mood_estados
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mood_estados (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mood_id       UUID NOT NULL REFERENCES public.moods(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'respondido')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mood_id, estudiante_id)
);

CREATE INDEX IF NOT EXISTS idx_mood_estados_mood_id ON public.mood_estados(mood_id);

-- ============================================================
-- 5. MODIFICAR TABLA: sesiones
-- ============================================================

ALTER TABLE public.sesiones
  ADD COLUMN IF NOT EXISTS estado_clase TEXT DEFAULT 'preparada'
    CHECK (estado_clase IN ('preparada', 'en_curso', 'cerrada'));

ALTER TABLE public.sesiones
  ADD COLUMN IF NOT EXISTS mood_activo_id UUID REFERENCES public.moods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sesiones_mood_activo_id ON public.sesiones(mood_activo_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.moods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencia    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_estados  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. POLÍTICAS RLS — moods
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'moods' AND policyname = 'moods_all_docente'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "moods_all_docente"
        ON public.moods FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.sesiones s
            JOIN public.asignaturas a ON s.asignatura_id = a.id
            WHERE s.id = moods.sesion_id AND a.docente_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'moods' AND policyname = 'moods_select_authenticated'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "moods_select_authenticated"
        ON public.moods FOR SELECT
        USING (auth.uid() IS NOT NULL)
    $policy$;
  END IF;
END $$;

-- ============================================================
-- 8. POLÍTICAS RLS — mood_checkins
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_checkins' AND policyname = 'mood_checkins_insert_estudiante') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_checkins_insert_estudiante"
        ON public.mood_checkins FOR INSERT
        WITH CHECK (auth.uid() = estudiante_id)
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_checkins' AND policyname = 'mood_checkins_select_estudiante') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_checkins_select_estudiante"
        ON public.mood_checkins FOR SELECT
        USING (auth.uid() = estudiante_id)
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_checkins' AND policyname = 'mood_checkins_select_docente') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_checkins_select_docente"
        ON public.mood_checkins FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.moods m
            JOIN public.sesiones s ON m.sesion_id = s.id
            JOIN public.asignaturas a ON s.asignatura_id = a.id
            WHERE m.id = mood_checkins.mood_id AND a.docente_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_checkins' AND policyname = 'mood_checkins_update_docente') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_checkins_update_docente"
        ON public.mood_checkins FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.moods m
            JOIN public.sesiones s ON m.sesion_id = s.id
            JOIN public.asignaturas a ON s.asignatura_id = a.id
            WHERE m.id = mood_checkins.mood_id AND a.docente_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================================
-- 9. POLÍTICAS RLS — asistencia
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asistencia' AND policyname = 'asistencia_all_docente') THEN
    EXECUTE $policy$
      CREATE POLICY "asistencia_all_docente"
        ON public.asistencia FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.sesiones s
            JOIN public.asignaturas a ON s.asignatura_id = a.id
            WHERE s.id = asistencia.sesion_id AND a.docente_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'asistencia' AND policyname = 'asistencia_select_estudiante') THEN
    EXECUTE $policy$
      CREATE POLICY "asistencia_select_estudiante"
        ON public.asistencia FOR SELECT
        USING (auth.uid() = estudiante_id)
    $policy$;
  END IF;
END $$;

-- ============================================================
-- 10. POLÍTICAS RLS — mood_estados
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_estados' AND policyname = 'mood_estados_select_docente') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_estados_select_docente"
        ON public.mood_estados FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.moods m
            JOIN public.sesiones s ON m.sesion_id = s.id
            JOIN public.asignaturas a ON s.asignatura_id = a.id
            WHERE m.id = mood_estados.mood_id AND a.docente_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_estados' AND policyname = 'mood_estados_select_estudiante') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_estados_select_estudiante"
        ON public.mood_estados FOR SELECT
        USING (auth.uid() = estudiante_id)
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_estados' AND policyname = 'mood_estados_upsert_estudiante') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_estados_upsert_estudiante"
        ON public.mood_estados FOR INSERT
        WITH CHECK (auth.uid() = estudiante_id)
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_estados' AND policyname = 'mood_estados_update_estudiante') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_estados_update_estudiante"
        ON public.mood_estados FOR UPDATE
        USING (auth.uid() = estudiante_id)
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mood_estados' AND policyname = 'mood_estados_insert_docente') THEN
    EXECUTE $policy$
      CREATE POLICY "mood_estados_insert_docente"
        ON public.mood_estados FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.moods m
            JOIN public.sesiones s ON m.sesion_id = s.id
            JOIN public.asignaturas a ON s.asignatura_id = a.id
            WHERE m.id = mood_estados.mood_id AND a.docente_id = auth.uid()
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================================
-- 11. FUNCIÓN: crear_mood
-- ============================================================

CREATE OR REPLACE FUNCTION public.crear_mood(
  p_sesion_id             UUID,
  p_tipo                  TEXT,
  p_orden                 INTEGER,
  p_tipo_actividad        TEXT DEFAULT NULL,
  p_descripcion_actividad TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_mood_id       UUID;
  v_asignatura_id UUID;
BEGIN
  SELECT asignatura_id INTO v_asignatura_id
  FROM public.sesiones WHERE id = p_sesion_id;

  INSERT INTO public.moods (
    sesion_id, tipo, estado, tipo_actividad, descripcion_actividad, orden
  ) VALUES (
    p_sesion_id, p_tipo, 'activo', p_tipo_actividad, p_descripcion_actividad, p_orden
  )
  RETURNING id INTO v_mood_id;

  INSERT INTO public.mood_estados (mood_id, estudiante_id, estado)
  SELECT v_mood_id, i.estudiante_id, 'pendiente'
  FROM public.inscripciones i
  WHERE i.asignatura_id = v_asignatura_id
  ON CONFLICT (mood_id, estudiante_id) DO NOTHING;

  RETURN v_mood_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. FUNCIÓN: cerrar_mood
-- ============================================================

CREATE OR REPLACE FUNCTION public.cerrar_mood(p_mood_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.moods
  SET estado = 'cerrado', closed_at = NOW()
  WHERE id = p_mood_id;

  UPDATE public.sesiones
  SET mood_activo_id = NULL
  WHERE mood_activo_id = p_mood_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 13. FUNCIÓN Y TRIGGER: actualizar mood_estados tras checkin
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_mood_checkin_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.mood_estados
  SET estado = 'respondido', updated_at = NOW()
  WHERE mood_id = NEW.mood_id
    AND estudiante_id = NEW.estudiante_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_mood_checkin_created ON public.mood_checkins;
CREATE TRIGGER on_mood_checkin_created
  AFTER INSERT ON public.mood_checkins
  FOR EACH ROW EXECUTE FUNCTION public.handle_mood_checkin_insert();

-- ============================================================
-- FIN DE MIGRACIÓN v3
-- ============================================================
SELECT 'Migration v3 ejecutada exitosamente' AS resultado;
