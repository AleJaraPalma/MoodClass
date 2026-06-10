# MoodClass — Contexto Técnico

## Stack
- **Frontend/Backend:** Next.js 14 App Router
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **Estilos:** Tailwind CSS + shadcn/ui
- **Lenguaje:** TypeScript
- **Gráficos:** Recharts
- **Deploy:** Vercel (auto-deploy desde GitHub)
- **Repo:** github.com/AleJaraPalma/MoodClass
- **Producción:** https://moodclass.incubalab.cl
- **IA:** Claude API — claude-sonnet-4-20250514

## Variables de Entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://vqumahlqouuafhoyuusu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SITE_URL=https://moodclass.incubalab.cl
```

## Estructura de Base de Datos

### Tablas principales
```sql
usuarios (id, email, nombre, rol: docente|estudiante, created_at)
secciones (id, codigo_asignatura, nombre_asignatura, subseccion, sala, dia_semana, hora_inicio, hora_fin, docente_id, fecha_inicio_semestre, fecha_fin_semestre)
sesiones (id, seccion_id, fecha, estado_clase: preparada|en_curso|cerrada, tipo_actividad, tema, objetivo, clase_numero, mood_activo_id, created_at)
moods (id, sesion_id, tipo: entrada|adicional|salida, estado: activo|cerrado, tipo_actividad, descripcion_actividad, orden, created_at, closed_at)
mood_checkins (id, mood_id, estudiante_id, energia, foco, animo, claridad, confianza, motivacion, memoria, campo_abierto, created_at)
mood_estados (id, mood_id, estudiante_id, estado: pendiente|activo|respondido, updated_at)
inscripciones (id, estudiante_id, seccion_id, created_at)
asistencia (id, sesion_id, estudiante_id, presente, atraso, created_at)
```

### Funciones PL/pgSQL
- `crear_mood()` — crea un mood y actualiza mood_activo_id en la sesión
- `cerrar_mood()` — cierra el mood activo
- Trigger: actualiza mood_estados → 'respondido' al insertar mood_checkin

## Estructura de Archivos Clave
```
app/
  page.tsx — Landing/home público
  login/page.tsx — Login con selector docente/estudiante
  dashboard/
    page.tsx — Redirección según rol
    docente/ — Dashboard docente
    estudiante/ — Dashboard estudiante
  checkin/[sesionId]/page.tsx — Check-in estudiante vía QR
  live/[sesionId]/page.tsx — Vista live docente
  reportes/ — Sección de reportes
  auth/callback/route.ts — Callback de auth Supabase
  api/
    generar-preguntas/ — Genera preguntas contextualizadas con Claude API
    generar-reporte/ — Genera resumen e hipótesis con Claude API
lib/
  supabase/
    client.ts — Cliente Supabase browser
    server.ts — Cliente Supabase servidor
    middleware.ts — Middleware auth
  types.ts — Tipos TypeScript
middleware.ts — Protección de rutas
docs/
  concepto.md — Concepto completo del proyecto
  contexto-tecnico.md — Este archivo
```

## Estado Actual del MVP

### ✅ Funcionando en producción
- Autenticación docente/estudiante (login con selector de rol)
- Dashboard docente con calendario semanal (parrilla de horas con franjas de 15 min)
- Sistema de sesiones — clases precargadas por semestre, docente las inicia
- Moods múltiples por clase (entrada, adicionales, salida)
- Check-in con 7 gemas por dimensión (escalas visuales)
- Dashboard live con lista de alumnos y estados en tiempo real
- Reportes con radar chart de 7 dimensiones (Recharts)
- Recuperación de contraseña
- Generación de QR por sesión
- 4 secciones de Michelle Villarroel cargadas (~100 estudiantes)
- Carga de cursos y estudiantes vía script seed con service_role_key

### 🔄 Pendiente
- QR da 404 en celular (funciona en desktop) — bug sin resolver
- Nombres alumnos aparecen "Desconocido" en dashboard live — falta JOIN con tabla usuarios
- LUMI visual (personaje SVG por dimensiones)
- Hábitats SVG animados por asignatura
- Bot WhatsApp
- Sistema de alertas completo (hay estructura pero falta lógica)
- Integración datos académicos (notas, entregas)
- Panel institucional agregado

## Docente de Prueba
- Email: michelle.villarroel02@inacapmail.cl
- Password: (cambiado desde MoodClass2026)
- 4 secciones: Formación Ciudadana (Mar 18:30, Mar 20:30, Mié 18:30) + Innovación y Emprendimiento II (Mié 20:30)

## Estudiante de Prueba
- Email: constanza.alvarez37@inacapmail.cl
- Password: MoodClass2026

## Flujo de Deploy
1. Cambios en VS Code con Claude Code
2. `git add . && git commit -m "mensaje" && git push`
3. Vercel despliega automáticamente en ~2 minutos
4. Verificar en https://moodclass.incubalab.cl

## Convenciones de Trabajo
- Prompts a Claude Code: directos, solo el cambio pedido, sin screenshots
- Colores del sistema: fondo #F8F9FF, gradiente #4F46E5 → #06B6D4, acento #6366F1
- Paleta de gemas: Energía #F59E0B, Foco #3B82F6, Ánimo #EC4899, Claridad #10B981, Confianza #8B5CF6, Motivación #84CC16, Memoria #6366F1
- Iconos: Lucide React (no emojis)
- Textos en español, locale es-CL
