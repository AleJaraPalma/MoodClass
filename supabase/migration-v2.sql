-- ============================================================
-- MoodClass – Migration v2
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. NUEVA TABLA: secciones
-- Una sección es la instancia concreta de una asignatura:
-- código, sala, día, horario, docente, fechas de semestre.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.secciones (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_asignatura     TEXT NOT NULL,
  nombre_asignatura     TEXT NOT NULL,
  subseccion            TEXT,                          -- ej: "A", "B", "01"
  sala                  TEXT,
  dia_semana            TEXT NOT NULL CHECK (dia_semana IN ('lunes','martes','miercoles','jueves','viernes','sabado')),
  hora_inicio           TIME NOT NULL,
  hora_fin              TIME NOT NULL,
  docente_id            UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fecha_inicio_semestre DATE NOT NULL,
  fecha_fin_semestre    DATE NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. MODIFICAR TABLA: sesiones
-- - Eliminar campo dificultad
-- - Agregar: tema, objetivo, clase_numero
-- - Ampliar CHECK de estado para incluir 'programada'
-- ============================================================

-- Eliminar la columna dificultad (si existe)
ALTER TABLE public.sesiones DROP COLUMN IF EXISTS dificultad;

-- Agregar columna seccion_id (FK a secciones — opcional, NULL si se creó manualmente)
ALTER TABLE public.sesiones ADD COLUMN IF NOT EXISTS seccion_id UUID REFERENCES public.secciones(id) ON DELETE SET NULL;

-- Agregar columna tema
ALTER TABLE public.sesiones ADD COLUMN IF NOT EXISTS tema TEXT;

-- Agregar columna objetivo
ALTER TABLE public.sesiones ADD COLUMN IF NOT EXISTS objetivo TEXT;

-- Agregar columna clase_numero
ALTER TABLE public.sesiones ADD COLUMN IF NOT EXISTS clase_numero INTEGER;

-- Actualizar el CHECK de estado para incluir 'programada'
-- (Primero eliminamos la constraint existente, luego la recreamos)
ALTER TABLE public.sesiones DROP CONSTRAINT IF EXISTS sesiones_estado_check;
ALTER TABLE public.sesiones ADD CONSTRAINT sesiones_estado_check
  CHECK (estado IN ('programada', 'activa', 'entrada_cerrada', 'cerrada'));

-- Ajustar el DEFAULT de estado a 'programada'
ALTER TABLE public.sesiones ALTER COLUMN estado SET DEFAULT 'programada';

-- ============================================================
-- 3. MODIFICAR TABLA: checkins
-- - Agregar campo_abierto (texto libre opcional)
-- ============================================================

ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS campo_abierto TEXT;

-- ============================================================
-- 4. HABILITAR RLS EN secciones
-- ============================================================

ALTER TABLE public.secciones ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. POLÍTICAS RLS para secciones
-- ============================================================

-- El docente puede hacer todo sobre sus propias secciones
CREATE POLICY "secciones_all_docente"
  ON public.secciones FOR ALL
  USING (auth.uid() = docente_id);

-- Todos los autenticados pueden leer secciones (para que estudiantes encuentren sus secciones)
CREATE POLICY "secciones_select_authenticated"
  ON public.secciones FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================
-- 6. POLÍTICA ADICIONAL: checkins — el docente puede actualizar
--    (para moderar o borrar respuestas si es necesario)
-- ============================================================

CREATE POLICY "checkins_update_docente"
  ON public.checkins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sesiones s
      JOIN public.asignaturas a ON s.asignatura_id = a.id
      WHERE s.id = checkins.sesion_id
        AND a.docente_id = auth.uid()
    )
  );

-- ============================================================
-- 7. FUNCIÓN: generar sesiones programadas para una sección
-- Llama: SELECT generate_sesiones_semestre('<seccion_id>', '<asignatura_id>');
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_sesiones_semestre(
  p_seccion_id   UUID,
  p_asignatura_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_seccion        public.secciones%ROWTYPE;
  v_fecha          DATE;
  v_target_dow     INTEGER; -- 1=Mon, 2=Tue, ... 7=Sun (ISO)
  v_clase_num      INTEGER := 1;
  v_count          INTEGER := 0;
BEGIN
  -- Obtener la sección
  SELECT * INTO v_seccion FROM public.secciones WHERE id = p_seccion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sección no encontrada: %', p_seccion_id;
  END IF;

  -- Mapear dia_semana a DOW ISO (1=lunes ... 7=domingo)
  v_target_dow := CASE v_seccion.dia_semana
    WHEN 'lunes'     THEN 1
    WHEN 'martes'    THEN 2
    WHEN 'miercoles' THEN 3
    WHEN 'jueves'    THEN 4
    WHEN 'viernes'   THEN 5
    WHEN 'sabado'    THEN 6
    ELSE 1
  END;

  -- Encontrar el primer día del semestre que coincida con el día de la semana
  v_fecha := v_seccion.fecha_inicio_semestre;
  WHILE EXTRACT(ISODOW FROM v_fecha)::INTEGER != v_target_dow LOOP
    v_fecha := v_fecha + INTERVAL '1 day';
  END LOOP;

  -- Generar una sesión por cada semana hasta el fin del semestre
  WHILE v_fecha <= v_seccion.fecha_fin_semestre LOOP
    INSERT INTO public.sesiones (
      asignatura_id,
      seccion_id,
      fecha,
      estado,
      tipo_actividad,
      clase_numero,
      created_at
    ) VALUES (
      p_asignatura_id,
      p_seccion_id,
      v_fecha,
      'programada',
      'Clase',
      v_clase_num,
      NOW()
    );

    v_fecha := v_fecha + INTERVAL '7 days';
    v_clase_num := v_clase_num + 1;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIN DE MIGRACIÓN v2
-- ============================================================
