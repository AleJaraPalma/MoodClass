export type UserRole = 'docente' | 'estudiante'

export interface Usuario {
  id: string
  email: string
  nombre: string
  rol: UserRole
  carrera?: string
  sede?: string
  created_at: string
}

export interface Asignatura {
  id: string
  nombre: string
  codigo: string
  descripcion?: string
  docente_id: string
  created_at: string
  docente?: Usuario
}

/** Una sección es la instancia concreta de una asignatura: sala, día, horario, semestre */
export interface Seccion {
  id: string
  codigo_asignatura: string
  nombre_asignatura: string
  subseccion?: string
  sala?: string
  dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado'
  hora_inicio: string  // "HH:MM:SS"
  hora_fin: string     // "HH:MM:SS"
  docente_id: string
  fecha_inicio_semestre: string
  fecha_fin_semestre: string
  created_at: string
  // Joined
  asignatura?: Asignatura
}

export interface Sesion {
  id: string
  asignatura_id: string
  seccion_id?: string
  fecha: string
  qr_code?: string
  estado: 'programada' | 'activa' | 'entrada_cerrada' | 'cerrada'
  estado_clase?: 'preparada' | 'en_curso' | 'cerrada'
  mood_activo_id?: string
  tipo_actividad: string
  tema?: string
  objetivo?: string
  clase_numero?: number
  created_at: string
  // Joined
  asignatura?: Asignatura
  seccion?: Seccion
}

// ── PreguntasMood (preguntas generadas por Claude para cada dimensión) ────────

export interface PreguntasMood {
  energia: string
  foco: string
  animo: string
  claridad: string
  confianza: string
  motivacion: string
  memoria: string
}

// ── Mood (check-in emocional dentro de una sesión) ──────────────────────────

export interface Mood {
  id: string
  sesion_id: string
  tipo: 'entrada' | 'adicional' | 'salida'
  estado: 'activo' | 'cerrado'
  tipo_actividad?: string
  descripcion_actividad?: string
  modalidad?: string
  duracion?: string
  complejidad?: string
  preguntas?: PreguntasMood   // null = usa las preguntas genéricas del sistema
  orden: number
  created_at: string
  closed_at?: string
}


// ── MoodCheckin (respuesta de un estudiante a un mood) ──────────────────────

export interface MoodCheckin {
  id: string
  mood_id: string
  estudiante_id: string
  energia: number
  foco: number
  animo: number
  claridad: number
  confianza: number
  motivacion: number
  memoria: number
  campo_abierto?: string
  created_at: string
  // Joined
  estudiante?: Usuario
  mood?: Mood
}

// ── Asistencia ──────────────────────────────────────────────────────────────

export interface Asistencia {
  id: string
  sesion_id: string
  estudiante_id: string
  presente: boolean
  atraso: boolean
  created_at: string
  // Joined
  estudiante?: Usuario
}

// ── MoodEstado (estado de participación en tiempo real) ─────────────────────

export interface MoodEstado {
  id: string
  mood_id: string
  estudiante_id: string
  estado: 'pendiente' | 'activo' | 'respondido'
  updated_at: string
  // Joined
  estudiante?: Usuario
}


export interface Checkin {
  id: string
  sesion_id: string
  estudiante_id: string
  tipo: 'entrada' | 'salida'
  energia: number
  foco: number
  animo: number
  claridad: number
  confianza: number
  motivacion: number
  memoria: number
  campo_abierto?: string
  created_at: string
  // Joined
  estudiante?: Usuario
}

export interface Inscripcion {
  id: string
  estudiante_id: string
  asignatura_id: string
  created_at: string
}

export interface DimensionConfig {
  key: keyof Pick<Checkin, 'energia' | 'foco' | 'animo' | 'claridad' | 'confianza' | 'motivacion' | 'memoria'>
  label: string
  description: string   // bajada fija en minúscula
  icon: string
  color: string
  glowColor: string
  questionEntrada: string
  questionSalida: string
  min: string
  mid: string
  max: string
}

export const DIMENSIONES: DimensionConfig[] = [
  {
    key: 'energia',
    label: 'Energía',
    description: 'vitalidad física',
    icon: '⚡',
    color: '#F59E0B',
    glowColor: 'rgba(245,158,11,0.7)',
    questionEntrada: '¿Cómo sientes tu energía en este momento?',
    questionSalida: '¿Cómo sientes tu energía al terminar esta clase?',
    min: 'Agotado/a',
    mid: 'Regular',
    max: 'Con toda la energía',
  },
  {
    key: 'foco',
    label: 'Foco',
    description: 'atención disponible',
    icon: '🎯',
    color: '#3B82F6',
    glowColor: 'rgba(59,130,246,0.7)',
    questionEntrada: '¿Qué tan presente y concentrado/a te sientes ahora mismo?',
    questionSalida: '¿Qué tan presente lograste estar durante la clase?',
    min: 'Mi mente está en otro lado',
    mid: 'Más o menos aquí',
    max: 'Completamente presente',
  },
  {
    key: 'animo',
    label: 'Ánimo',
    description: 'estado emocional',
    icon: '💙',
    color: '#EC4899',
    glowColor: 'rgba(236,72,153,0.7)',
    questionEntrada: '¿Cómo describirías tu estado emocional en este momento?',
    questionSalida: '¿Cómo te vas emocionalmente al salir de esta clase?',
    min: 'Me siento mal',
    mid: 'Ni bien ni mal',
    max: 'Me siento muy bien',
  },
  {
    key: 'claridad',
    label: 'Claridad',
    description: 'lucidez mental',
    icon: '🧠',
    color: '#10B981',
    glowColor: 'rgba(16,185,129,0.7)',
    questionEntrada: '¿Qué tan claro/a y despejado/a sientes tu mente hoy?',
    questionSalida: '¿Qué tan claro/a quedaste con los contenidos de hoy?',
    min: 'Muy nublado/a',
    mid: 'Algo nublado/a',
    max: 'Muy claro/a',
  },
  {
    key: 'confianza',
    label: 'Confianza',
    description: 'seguridad académica',
    icon: '🛡️',
    color: '#8B5CF6',
    glowColor: 'rgba(139,92,246,0.7)',
    questionEntrada: '¿Qué tan seguro/a te sientes con los contenidos de esta asignatura?',
    questionSalida: '¿Cómo te sientes con la asignatura después de esta clase?',
    min: 'Me siento perdido/a',
    mid: 'Más o menos',
    max: 'Me siento seguro/a',
  },
  {
    key: 'motivacion',
    label: 'Motivación',
    description: 'ganas de estar aquí',
    icon: '🌱',
    color: '#84CC16',
    glowColor: 'rgba(132,204,22,0.7)',
    questionEntrada: '¿Qué tan motivado/a llegas a esta clase hoy?',
    questionSalida: '¿Cómo te vas de motivado/a después de hoy?',
    min: 'Sin ganas',
    mid: 'Más o menos',
    max: 'Con muchas ganas',
  },
  {
    key: 'memoria',
    label: 'Memoria',
    description: 'conexión con lo aprendido',
    icon: '🔮',
    color: '#6366F1',
    glowColor: 'rgba(99,102,241,0.7)',
    questionEntrada: '¿Qué tan disponible sientes tu capacidad de recordar y conectar ideas?',
    questionSalida: '¿Qué tan bien crees que vas a retener lo que vimos hoy?',
    min: 'No recuerdo nada',
    mid: 'Recuerdo algo',
    max: 'Me siento muy conectado/a',
  },
]
