-- ============================================================
-- MoodClass – Supabase Schema
-- Orden: 1) Tablas, 2) RLS, 3) Políticas
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CREAR TODAS LAS TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL DEFAULT '',
  rol         TEXT NOT NULL CHECK (rol IN ('docente', 'estudiante')),
  carrera     TEXT,
  sede        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.asignaturas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,
  codigo      TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  docente_id  UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sesiones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asignatura_id   UUID NOT NULL REFERENCES public.asignaturas(id) ON DELETE CASCADE,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  qr_code         TEXT,
  estado          TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'entrada_cerrada', 'cerrada')),
  tipo_actividad  TEXT NOT NULL DEFAULT 'clase',
  dificultad      INTEGER NOT NULL DEFAULT 3 CHECK (dificultad BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inscripciones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  asignatura_id UUID NOT NULL REFERENCES public.asignaturas(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(estudiante_id, asignatura_id)
);

CREATE TABLE IF NOT EXISTS public.checkins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sesion_id     UUID NOT NULL REFERENCES public.sesiones(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  energia       INTEGER NOT NULL CHECK (energia BETWEEN 1 AND 5),
  foco          INTEGER NOT NULL CHECK (foco BETWEEN 1 AND 5),
  animo         INTEGER NOT NULL CHECK (animo BETWEEN 1 AND 5),
  claridad      INTEGER NOT NULL CHECK (claridad BETWEEN 1 AND 5),
  confianza     INTEGER NOT NULL CHECK (confianza BETWEEN 1 AND 5),
  motivacion    INTEGER NOT NULL CHECK (motivacion BETWEEN 1 AND 5),
  memoria       INTEGER NOT NULL CHECK (memoria BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sesion_id, estudiante_id, tipo)
);

-- ============================================================
-- 2. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE public.usuarios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaturas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. CREAR TODAS LAS POLÍTICAS RLS
-- ============================================================

-- USUARIOS
CREATE POLICY "usuarios_select_own"
  ON public.usuarios FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "usuarios_insert_own"
  ON public.usuarios FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_update_own"
  ON public.usuarios FOR UPDATE
  USING (auth.uid() = id);

-- ASIGNATURAS
CREATE POLICY "asignaturas_all_docente"
  ON public.asignaturas FOR ALL
  USING (auth.uid() = docente_id);

CREATE POLICY "asignaturas_select_public"
  ON public.asignaturas FOR SELECT
  USING (true);

-- SESIONES
CREATE POLICY "sesiones_all_docente"
  ON public.sesiones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaturas
      WHERE id = sesiones.asignatura_id
        AND docente_id = auth.uid()
    )
  );

CREATE POLICY "sesiones_select_authenticated"
  ON public.sesiones FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSCRIPCIONES
CREATE POLICY "inscripciones_all_estudiante"
  ON public.inscripciones FOR ALL
  USING (auth.uid() = estudiante_id);

CREATE POLICY "inscripciones_select_docente"
  ON public.inscripciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaturas
      WHERE id = inscripciones.asignatura_id
        AND docente_id = auth.uid()
    )
  );

-- CHECKINS
CREATE POLICY "checkins_insert_estudiante"
  ON public.checkins FOR INSERT
  WITH CHECK (auth.uid() = estudiante_id);

CREATE POLICY "checkins_select_estudiante"
  ON public.checkins FOR SELECT
  USING (auth.uid() = estudiante_id);

CREATE POLICY "checkins_select_docente"
  ON public.checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sesiones s
      JOIN public.asignaturas a ON s.asignatura_id = a.id
      WHERE s.id = checkins.sesion_id
        AND a.docente_id = auth.uid()
    )
  );

-- ============================================================
-- 4. FUNCIÓN Y TRIGGER: crear perfil automático al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'estudiante')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
